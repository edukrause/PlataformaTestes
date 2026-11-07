package br.edu.unimater.plataforma.banco;

import java.util.*;

public interface ConsultaBancoGateway {
    enum Verificacao { VALIDO, VAZIO, ERRO_EXPLAIN, ERRO_EXECUCAO, LIMITE_EXCEDIDO }
    record Coluna(String nome, String tipo, int escala) {}
    record Resultado(Verificacao verificacao, List<Coluna> colunas, List<List<Object>> linhas,
                     String mensagemErro, long latenciaMs) {
        public Resultado {
            colunas = List.copyOf(colunas);
            // List.copyOf rejeita null; uma célula SQL NULL deve continuar nula.
            linhas = linhas.stream().map(l -> Collections.unmodifiableList(new ArrayList<>(l))).toList();
        }
    }
    Resultado consultar(String consultaValidada);
}
