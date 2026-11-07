package br.edu.unimater.plataforma.contexto;

public interface DocumentacaoGateway {
    record Documento(String referencia, String versao, String texto, String hash) {}
    Documento obter(String chaveJira, String area);
}
