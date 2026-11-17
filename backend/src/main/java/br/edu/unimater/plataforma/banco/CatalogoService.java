package br.edu.unimater.plataforma.banco;

import br.edu.unimater.plataforma.api.ErroApi;
import br.edu.unimater.plataforma.banco.ConsultaBancoGateway.*;
import java.text.Normalizer;
import java.util.*;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

@Service
@EnableConfigurationProperties(CatalogoProperties.class)
public class CatalogoService {
    public record Coluna(String nome, String tipo, boolean anulavel) {}
    public record Tabela(String schema, String nome, List<Coluna> colunas) {
        public String chave() { return schema + "." + nome; }
    }
    // Cada par conserva sua posição em uma chave estrangeira composta.
    public record Relacao(String origem, String colunaOrigem, String destino, String colunaDestino) {}
    public record Catalogo(List<Tabela> tabelas, List<Relacao> relacionamentos) {}
    private final ConsultaBancoGateway banco;
    private final CatalogoProperties config;
    private final long ttlMs;
    private record CacheCatalogo(Catalogo valor,long expira) {}
    private record CacheAmostra(Resultado valor,long expira) {}
    private CacheCatalogo cache;
    private final Map<String,CacheAmostra> amostras=new HashMap<>();

    public CatalogoService(ConsultaBancoGateway banco, CatalogoProperties config) {
        this(banco,config,0);
    }
    @Autowired
    public CatalogoService(ConsultaBancoGateway banco,CatalogoProperties config,@Value("${plataforma.catalogo.cache-segundos:60}") int ttl) {
        if(ttl<0||ttl>3600)throw new IllegalArgumentException("Cache do catálogo deve estar entre 0 e 3600 segundos.");
        this.banco=banco;this.config=config;this.ttlMs=ttl*1000L;
    }

    public synchronized void invalidar() { cache=null;amostras.clear(); }
    public synchronized Catalogo obter() {
        if(cache!=null&&cache.expira()>System.currentTimeMillis())return cache.valor();
        var valor=coletar();
        cache=new CacheCatalogo(valor,System.currentTimeMillis()+ttlMs);
        return valor;
    }
    private Catalogo coletar() {
        String schemas = config.schemas().stream().map(CatalogoService::literal).reduce((a,b) -> a + "," + b).orElseThrow();
        var linhas = ler("""
                SELECT table_schema, table_name, column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema IN (%s)
                  AND has_column_privilege(quote_ident(table_schema) || '.' || quote_ident(table_name), column_name, 'SELECT')
                ORDER BY table_schema, table_name, ordinal_position
                """.formatted(schemas));
        var tabelas = new LinkedHashMap<String, Tabela>();
        for (var linha : linhas) {
            String schema = texto(linha, 0), nome = texto(linha, 1);
            var tabela = tabelas.computeIfAbsent(schema + "." + nome, k -> new Tabela(schema, nome, new ArrayList<>()));
            tabela.colunas().add(new Coluna(texto(linha, 2), texto(linha, 3), "YES".equals(texto(linha, 4))));
        }
        // pg_constraint permite ler FKs com a conta SELECT (information_schema.table_constraints
        // omite constraints de tabelas nas quais o usuário só possui SELECT).
        var fks = ler("""
                SELECT ns.nspname, src.relname, a.attname, nt.nspname, dst.relname, b.attname
                FROM pg_catalog.pg_constraint c
                JOIN pg_catalog.pg_class src ON src.oid = c.conrelid
                JOIN pg_catalog.pg_namespace ns ON ns.oid = src.relnamespace
                JOIN pg_catalog.pg_class dst ON dst.oid = c.confrelid
                JOIN pg_catalog.pg_namespace nt ON nt.oid = dst.relnamespace
                JOIN pg_catalog.pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
                JOIN pg_catalog.pg_attribute b ON b.attrelid = c.confrelid
                  AND b.attnum = c.confkey[array_position(c.conkey, a.attnum)]
                WHERE c.contype = 'f' AND ns.nspname IN (%s) AND nt.nspname IN (%s)
                ORDER BY ns.nspname, src.relname, c.conname, a.attnum
                """.formatted(schemas, schemas));
        var relacoes = new ArrayList<Relacao>();
        for (var linha : fks) {
            String origem = texto(linha, 0) + "." + texto(linha, 1), destino = texto(linha, 3) + "." + texto(linha, 4);
            if (temColuna(tabelas.get(origem), texto(linha, 2)) && temColuna(tabelas.get(destino), texto(linha, 5)))
                relacoes.add(new Relacao(origem, texto(linha, 2), destino, texto(linha, 5)));
        }
        return new Catalogo(tabelas.values().stream().map(t -> new Tabela(t.schema(), t.nome(), List.copyOf(t.colunas()))).toList(), List.copyOf(relacoes));
    }

    public Catalogo selecionar(String requisito) { return selecionar(obter(), requisito); }

    public Catalogo selecionar(Catalogo catalogo, String requisito) {
        var termos = termos(requisito);
        var pontuacoes = new HashMap<String, Integer>();
        for (var t : catalogo.tabelas()) {
            var nomes = termos(t.nome() + " " + t.colunas().stream().map(Coluna::nome).reduce("", (a,b) -> a + " " + b));
            nomes.retainAll(termos);
            pontuacoes.put(t.chave(), nomes.size());
        }
        var selecionadas = new LinkedHashSet<String>();
        catalogo.tabelas().stream().filter(t -> pontuacoes.get(t.chave()) > 0)
                .sorted(Comparator.<Tabela>comparingInt(t -> -pontuacoes.get(t.chave())).thenComparing(Tabela::chave))
                .limit(config.maxTabelas()).forEach(t -> selecionadas.add(t.chave()));
        for (int nivel = 0; nivel < config.profundidade(); nivel++) {
            var anteriores = Set.copyOf(selecionadas);
            var vizinhas = new TreeSet<String>();
            for (var r : catalogo.relacionamentos()) {
                if (anteriores.contains(r.origem())) vizinhas.add(r.destino());
                if (anteriores.contains(r.destino())) vizinhas.add(r.origem());
            }
            for (String vizinha : vizinhas) if (selecionadas.size() < config.maxTabelas()) selecionadas.add(vizinha);
        }
        return new Catalogo(catalogo.tabelas().stream().filter(t -> selecionadas.contains(t.chave())).toList(),
                catalogo.relacionamentos().stream().filter(r -> selecionadas.contains(r.origem()) && selecionadas.contains(r.destino())).toList());
    }

    public synchronized Resultado amostrar(String schema, String tabela, String coluna) {
        // O nome só chega ao SQL depois de conferido na configuração e no catálogo visível.
        if (!config.colunasPermitidas().contains(schema + "." + tabela + "." + coluna))
            throw ErroApi.entrada("A coluna não está autorizada para amostragem.");
        var t = obter().tabelas().stream().filter(x -> x.schema().equals(schema) && x.nome().equals(tabela)).findFirst();
        if (t.isEmpty() || !temColuna(t.get(), coluna)) throw ErroApi.entrada("Coluna indisponível no catálogo permitido.");
        String chave=schema+"."+tabela+"."+coluna;
        var anterior=amostras.get(chave);
        if(anterior!=null&&anterior.expira()>System.currentTimeMillis())return anterior.valor();
        var resultado=banco.consultar("SELECT DISTINCT " + identificador(coluna) + " FROM " + identificador(schema) + "." + identificador(tabela)
                + " WHERE " + identificador(coluna) + " IS NOT NULL LIMIT " + config.maxAmostras());
        amostras.entrySet().removeIf(e->e.getValue().expira()<=System.currentTimeMillis());
        if(amostras.size()<128&&(resultado.verificacao()==Verificacao.VALIDO||resultado.verificacao()==Verificacao.VAZIO))
            amostras.put(chave,new CacheAmostra(resultado,System.currentTimeMillis()+ttlMs));
        return resultado;
    }
    public Map<String,List<Object>> amostrasPermitidas(Catalogo selecionado) {
        var resultado=new LinkedHashMap<String,List<Object>>();
        for(var tabela:selecionado.tabelas())for(var coluna:tabela.colunas()) {
            String chave=tabela.chave()+"."+coluna.nome();
            if(!config.colunasPermitidas().contains(chave))continue;
            var amostra=amostrar(tabela.schema(),tabela.nome(),coluna.nome());
            if(amostra.verificacao()==Verificacao.VALIDO)resultado.put(chave,amostra.linhas().stream().map(l->l.getFirst()).toList());
        }
        return Map.copyOf(resultado);
    }

    private List<List<Object>> ler(String sql) {
        var resultado = banco.consultar(sql);
        if (resultado.verificacao() == Verificacao.VAZIO) return List.of();
        if (resultado.verificacao() != Verificacao.VALIDO)
            throw ErroApi.configuracao("Não foi possível ler o catálogo completo. Confira permissões e limites do PostgreSQL.");
        return resultado.linhas();
    }
    private static boolean temColuna(Tabela t, String coluna) { return t != null && t.colunas().stream().anyMatch(c -> c.nome().equals(coluna)); }
    private static String texto(List<Object> linha, int indice) { return Objects.toString(linha.get(indice)); }
    private static String literal(String s) { return "'" + s.replace("'", "''") + "'"; }
    private static String identificador(String s) { return "\"" + s.replace("\"", "\"\"") + "\""; }
    private static Set<String> termos(String texto) {
        var resultado = new HashSet<String>();
        for (String termo : Normalizer.normalize(texto.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").split("[^a-z0-9]+")) if (termo.length() > 2) resultado.add(termo);
        return resultado;
    }
}
