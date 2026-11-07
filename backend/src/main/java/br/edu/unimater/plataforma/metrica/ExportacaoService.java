package br.edu.unimater.plataforma.metrica;

import br.edu.unimater.plataforma.execucao.RegistroExecucoes;
import java.util.*;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class ExportacaoService {
    private final RegistroExecucoes registro;
    private final MetricasService metricas;
    public ExportacaoService(RegistroExecucoes registro, MetricasService metricas) { this.registro=registro; this.metricas=metricas; }
    public String metricas() {
        return metricas("TODAS");
    }
    public String metricas(String origem) {
        var m=metricas.obter(origem);
        var linhas=new ArrayList<List<?>>();
        linhas.add(List.of("indicador","valor"));
        linhas.add(List.of("origem",origem));
        linhas.add(List.of("referencias_revisadas",m.referenciasRevisadas()));
        linhas.add(List.of("apuracoes_manuais",m.apuracoesManuais()));
        linhas.add(List.of("apuracoes_modelos",m.apuracoesModelos()));
        linhas.add(List.of("total_execucoes",m.totalExecucoes())); linhas.add(List.of("total_apuracoes",m.totalApuracoes()));
        linhas.add(List.of("valores_alterados_fracao",m.valoresAlteradosPct()));
        linhas.add(List.of("custo_medio_apuracao_usd",m.custoMedioApuracaoUsd()));
        linhas.add(List.of("tempo_medio_apuracao_s",m.tempoMedioApuracaoS()));
        m.desfechos().forEach((k,v)->linhas.add(List.of("desfecho_"+k,v)));
        m.decisoes().forEach((k,v)->linhas.add(List.of("decisao_"+k,v)));
        for(var p:m.porProvedor()) {
            linhas.add(List.of(p.provedor()+"_candidatos",p.candidatos())); linhas.add(List.of(p.provedor()+"_validos",p.validos()));
            linhas.add(List.of(p.provedor()+"_custo_usd",p.custoUsd())); linhas.add(List.of(p.provedor()+"_latencia_media_ms",p.latenciaMediaMs()));
        }
        return csv(linhas);
    }
    public String execucoes() {
        var linhas=new ArrayList<List<?>>();
        linhas.add(List.of("execucao_id","chave_jira","titulo","origem","status","inicio","cenarios","apuracoes","custo_usd","tempo_ms","decisao","valores_corrigidos"));
        for(var e:registro.listar()) linhas.add(Arrays.asList(e.id(),e.tarefa().chaveJira(),e.tarefa().titulo(),e.tarefa().origem(),e.status(),e.iniciadaEm(),
                e.cenarios().size(),e.apuracoes().size(),e.custoTotalUsd(),e.tempoTotalMs(), e.revisao()==null?"":e.revisao().decisao(),
                e.revisao()==null?0:e.revisao().valoresAlterados()));
        return csv(linhas);
    }
    public String apuracoes(long id) {
        var linhas=new ArrayList<List<?>>();
        linhas.add(List.of("apuracao_id","pergunta","origem","desfecho","valor_corrigido","provedor","modelo","tentativa","consulta","verificacao","hash","tokens_entrada","tokens_saida","custo_usd","latencia_ms"));
        for(var a:registro.obter(id).apuracoes()) for(var c:a.path("candidatos")) linhas.add(Arrays.asList(a.path("id").asLong(),a.path("pergunta").asText(),
                a.path("origem").asText(),a.path("desfecho").asText(),a.path("valorCorrigido").asText(""),c.path("provedor").asText(),c.path("modelo").asText(),
                c.path("tentativa").asInt(),c.path("consulta").asText(),c.path("verificacao").asText(),c.path("hashResultado").asText(""),
                c.path("tokensEntrada").asInt(),c.path("tokensSaida").asInt(),c.path("custoUsd").decimalValue(),c.path("latenciaMs").asLong()));
        return csv(linhas);
    }
    public static String csv(List<? extends List<?>> linhas) {
        return "\uFEFF"+linhas.stream().map(l->l.stream().map(ExportacaoService::campo).reduce((a,b)->a+";"+b).orElse("")).reduce((a,b)->a+"\r\n"+b).orElse("")+"\r\n";
    }
    private static String campo(Object valor) {
        if(valor==null) return "\"\"";
        if(valor instanceof Number) return valor.toString().replace('.',',');
        String texto=valor.toString();
        if(Pattern.compile("^[\\s\\p{Cntrl}]*[=+@-]").matcher(texto).find()) texto="'"+texto;
        return "\""+texto.replace("\"","\"\"")+"\"";
    }
}
