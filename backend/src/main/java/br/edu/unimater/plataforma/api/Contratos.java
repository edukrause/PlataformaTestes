package br.edu.unimater.plataforma.api;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class Contratos {
    private Contratos() {}
    public record NovaExecucaoRequest(
            @NotBlank @Pattern(regexp = "[A-Za-z][A-Za-z0-9_]*-[1-9][0-9]*") String chaveJira,
            boolean usarDocumentacao) {}
    public record MensagemRequest(@Positive Long conversaId, @NotBlank @Size(max = 10000) String texto,
                                  boolean usarDocumentacao) {}
    public record RevisaoRequest(@NotBlank @Size(max = 120) String analista,
            @NotBlank @Pattern(regexp = "ACEITO|ACEITO_ALTERACAO|REJEITADO") String decisao,
            @NotNull Map<Long, String> valoresCorrigidos, @PositiveOrZero long tempoRevisaoS,
            @NotNull @Size(max = 10000) String comentario) {}
    public record ExecucaoTeste(
            @NotBlank @Pattern(regexp = "PASSOU|FALHOU|BLOQUEADO") String resultado,
            @NotNull @Size(max = 1000) List<@NotNull @Pattern(regexp = "PASSOU|FALHOU|NAO_EXECUTADO") String> passos,
            @NotNull @Size(max = 10000) String observacao,
            @NotBlank @Size(max = 120) String executadoPor, @NotNull Instant executadoEm) {}
    public record Tarefa(long id, String chaveJira, String titulo, String area, String requisito,
                         String documentacaoRef, Instant coletadaEm) {}
    public record Demanda(String chaveJira, String status, String criadaEm, String prazo, BigDecimal estimativaH) {}
    public record Cenario(long id, String tipo, String titulo, String gherkin, String resultadoEsperado,
                           boolean sintaxeValida, ExecucaoTeste execucaoTeste) {}
    public record PontoAtencao(String tipo, String texto) {}
    public record Revisao(long id, String analista, String decisao, int valoresAlterados,
                          long tempoRevisaoS, String comentario, Instant registradaEm) {}
    public record Execucao(long id, Tarefa tarefa, String versaoPrompt, String status, String etapa,
            boolean exigeApuracao, long tempoTotalMs, BigDecimal custoTotalUsd, Instant iniciadaEm,
            List<Cenario> cenarios, List<JsonNode> apuracoes, List<PontoAtencao> pontosAtencao,
            Revisao revisao, String mensagemErro, boolean apuracaoDisponivel) {}
    public record Mensagem(long id, String papel, String texto, Instant enviadaEm, Long execucaoId) {}
    public record Conversa(long id, String titulo, Instant criadaEm, List<Mensagem> mensagens) {}
}
