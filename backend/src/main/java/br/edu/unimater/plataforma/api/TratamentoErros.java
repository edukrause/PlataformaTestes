package br.edu.unimater.plataforma.api;

import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class TratamentoErros {
    @ExceptionHandler(ErroApi.class)
    ResponseEntity<ProblemDetail> tratar(ErroApi erro) {
        return ResponseEntity.status(erro.status()).body(ProblemDetail.forStatusAndDetail(erro.status(), erro.getMessage()));
    }
    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class})
    ResponseEntity<ProblemDetail> entrada(Exception erro) {
        return ResponseEntity.badRequest().body(ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                "Requisição inválida. Confira os campos e seus formatos."));
    }
    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetail> inesperado(Exception erro) {
        // Não devolver mensagens de banco, prompts nem respostas dos provedores ao navegador.
        return ResponseEntity.internalServerError().body(ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR, "Não foi possível concluir a operação."));
    }
}
