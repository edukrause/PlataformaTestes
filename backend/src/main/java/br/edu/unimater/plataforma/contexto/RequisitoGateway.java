package br.edu.unimater.plataforma.contexto;

import br.edu.unimater.plataforma.api.Contratos.Demanda;

/** Porta de leitura de requisitos; a aplicação não depende do cliente HTTP do Jira. */
public interface RequisitoGateway {
    record Requisito(String chave, String titulo, String texto, String areaHint, Demanda demanda) {}

    Requisito obter(String chave);
}
