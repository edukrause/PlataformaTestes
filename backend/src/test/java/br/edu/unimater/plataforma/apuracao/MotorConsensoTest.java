package br.edu.unimater.plataforma.apuracao;

import br.edu.unimater.plataforma.apuracao.MotorConsenso.*;
import br.edu.unimater.plataforma.banco.ConsultaBancoGateway.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

class MotorConsensoTest {
    private final MotorConsenso motor = new MotorConsenso(new NormalizadorResultados(new ObjectMapper()));
    private Candidato candidato(Provedor provedor, Object valor) {
        return new Candidato(provedor, new Resultado(Verificacao.VALIDO, List.of(new Coluna("total", "numeric", 2)),
                List.of(Arrays.asList(valor)), null, 1));
    }
    private Candidato erro(Provedor provedor, Verificacao status) {
        return new Candidato(provedor, new Resultado(status, List.of(), List.of(), "Descartado", 1));
    }

    @Test void exigeTresConcordantesParaUnanimidade() {
        var resultado = motor.decidir(List.of(candidato(Provedor.CLAUDE, 10), candidato(Provedor.GEMINI, 10), candidato(Provedor.LLAMA, 10)), false);
        assertThat(resultado.desfecho()).isEqualTo(Desfecho.UNANIME);
        assertThat(resultado.hashes()).hasSize(3);
        assertThat(resultado.resultadoReferencia()).isNotNull();
    }

    @Test void doisConcordantesProduzemMaioriaMesmoComTerceiroDescartado() {
        var resultado = motor.decidir(List.of(candidato(Provedor.CLAUDE, 10), candidato(Provedor.GEMINI, 10), erro(Provedor.LLAMA, Verificacao.LIMITE_EXCEDIDO)), false);
        assertThat(resultado.desfecho()).isEqualTo(Desfecho.MAIORIA);
        assertThat(resultado.descartes()).containsKey(Provedor.LLAMA);
        var divergente = motor.decidir(List.of(candidato(Provedor.CLAUDE, 10), candidato(Provedor.GEMINI, 10), candidato(Provedor.LLAMA, 11)), false);
        assertThat(divergente.desfecho()).isEqualTo(Desfecho.MAIORIA);
    }

    @Test void divergenciaNaoEscolheValorPorPreferenciaDeModelo() {
        var resultado = motor.decidir(List.of(candidato(Provedor.CLAUDE, 10), candidato(Provedor.GEMINI, 20), candidato(Provedor.LLAMA, 30)), false);
        assertThat(resultado.desfecho()).isEqualTo(Desfecho.DIVERGENTE);
        assertThat(resultado.resultadoReferencia()).isNull();
    }

    @Test void errosEVaziosNaoVotam() {
        var resultado = motor.decidir(List.of(candidato(Provedor.CLAUDE, 10), erro(Provedor.GEMINI, Verificacao.VAZIO), erro(Provedor.LLAMA, Verificacao.ERRO_EXPLAIN)), false);
        assertThat(resultado.desfecho()).isEqualTo(Desfecho.FALHA);
        assertThat(resultado.resultadoReferencia()).isNull();
        assertThat(motor.decidir(List.of(), false).desfecho()).isEqualTo(Desfecho.FALHA);
    }

    @Test void retentativaDoMesmoProvedorNaoPodeVirarSegundoVoto() {
        assertThatThrownBy(() -> motor.decidir(List.of(candidato(Provedor.CLAUDE, 10), candidato(Provedor.CLAUDE, 10)), false))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test void resultadosNaoNormalizaveisSaoDescartados() {
        var resultado = motor.decidir(List.of(candidato(Provedor.CLAUDE, Double.NaN), candidato(Provedor.GEMINI, 10)), false);
        assertThat(resultado.desfecho()).isEqualTo(Desfecho.FALHA);
        assertThat(resultado.descartes()).containsKey(Provedor.CLAUDE);
    }
}
