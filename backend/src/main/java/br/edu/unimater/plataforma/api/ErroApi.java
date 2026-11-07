package br.edu.unimater.plataforma.api;

import org.springframework.http.HttpStatus;

public class ErroApi extends RuntimeException {
    private final HttpStatus status;
    public ErroApi(HttpStatus status, String message) { super(message); this.status = status; }
    public HttpStatus status() { return status; }
    public static ErroApi configuracao(String message) { return new ErroApi(HttpStatus.SERVICE_UNAVAILABLE, message); }
    public static ErroApi entrada(String message) { return new ErroApi(HttpStatus.BAD_REQUEST, message); }
    public static ErroApi naoEncontrado() { return new ErroApi(HttpStatus.NOT_FOUND, "Registro não encontrado."); }
}
