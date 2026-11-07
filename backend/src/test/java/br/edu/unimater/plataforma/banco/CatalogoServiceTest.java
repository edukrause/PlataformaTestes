package br.edu.unimater.plataforma.banco;

import br.edu.unimater.plataforma.api.ErroApi;
import br.edu.unimater.plataforma.banco.ConsultaBancoGateway.*;
import br.edu.unimater.plataforma.banco.CatalogoService.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class CatalogoServiceTest {
    private final ConsultaBancoGateway banco = mock(ConsultaBancoGateway.class);
    private CatalogoService service(int max, int profundidade, List<String> permitidas) {
        return new CatalogoService(banco, new CatalogoProperties(List.of("public"), permitidas, 3, max, profundidade));
    }
    private Tabela tabela(String nome, String coluna) {
        return new Tabela("public", nome, List.of(new CatalogoService.Coluna(coluna, "integer", false)));
    }
    @Test void selecionaTermosSemAcentosEExpandeSomenteAProfundidadePermitida() {
        var catalogo = new Catalogo(List.of(tabela("estoque", "produto_id"), tabela("produto", "id"), tabela("categoria", "id"), tabela("cliente", "cpf")),
                List.of(new Relacao("public.estoque", "produto_id", "public.produto", "id"), new Relacao("public.produto", "categoria_id", "public.categoria", "id")));
        assertThat(service(10, 1, List.of()).selecionar(catalogo, "Consultar ESTÓQUE").tabelas()).extracting(Tabela::nome).containsExactly("estoque", "produto");
        assertThat(service(10, 2, List.of()).selecionar(catalogo, "estoque").tabelas()).extracting(Tabela::nome).containsExactly("estoque", "produto", "categoria");
        assertThat(service(1, 2, List.of()).selecionar(catalogo, "estoque").tabelas()).hasSize(1);
        assertThat(service(10, 2, List.of()).selecionar(catalogo, "termo inexistente").tabelas()).isEmpty();
    }
    @Test void bloqueiaAmostraNaoAutorizadaAntesDeConsultarBanco() {
        assertThatThrownBy(() -> service(10, 1, List.of()).amostrar("public", "cliente", "cpf")).isInstanceOf(ErroApi.class);
        verifyNoInteractions(banco);
    }
    @Test void naoAceitaCatalogoTruncado() {
        when(banco.consultar(anyString())).thenReturn(new Resultado(Verificacao.LIMITE_EXCEDIDO, List.of(), List.of(), null, 0));
        assertThatThrownBy(() -> service(10, 1, List.of()).obter()).isInstanceOf(ErroApi.class).hasMessageContaining("catálogo completo");
    }
    @Test void amostraApenasColunaPermitidaVisivelComIdentificadoresEscapados() {
        when(banco.consultar(contains("information_schema.columns"))).thenReturn(new Resultado(Verificacao.VALIDO, List.of(),
                List.of(List.of("public", "t\"abela", "status", "text", "YES")), null, 0));
        when(banco.consultar(contains("pg_constraint"))).thenReturn(new Resultado(Verificacao.VAZIO, List.of(), List.of(), null, 0));
        when(banco.consultar(startsWith("SELECT DISTINCT"))).thenReturn(new Resultado(Verificacao.VALIDO, List.of(), List.of(List.of("ATIVO")), null, 0));
        assertThat(service(10, 1, List.of("public.t\"abela.status")).amostrar("public", "t\"abela", "status").linhas()).containsExactly(List.of("ATIVO"));
        verify(banco).consultar("SELECT DISTINCT \"status\" FROM \"public\".\"t\"\"abela\" WHERE \"status\" IS NOT NULL LIMIT 3");
    }
}
