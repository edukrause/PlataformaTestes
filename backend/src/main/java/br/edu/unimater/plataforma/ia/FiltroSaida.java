package br.edu.unimater.plataforma.ia;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class FiltroSaida {
    private final String termos;
    public FiltroSaida(@Value("${plataforma.privacy.sensitive-terms}") String termos) { this.termos = termos; }
    public record Filtrado(String texto, Map<String, String> correspondencias) {}
    public Filtrado filtrar(String texto) {
        Map<String, String> mapa = new LinkedHashMap<>();
        texto = substituir(texto, "(?<!\\d)\\d{2}\\.?\\d{3}\\.?\\d{3}/?\\d{4}-?\\d{2}(?!\\d)", "CNPJ", mapa);
        texto = substituir(texto, "(?<!\\d)\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}(?!\\d)", "CPF", mapa);
        texto = substituir(texto, "(?i)[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}", "EMAIL", mapa);
        texto = substituir(texto, "(?<!\\d)(?:\\+55[ .-]?)?\\(?[1-9]\\d\\)?[ .-]?9?\\d{4}[ .-]?\\d{4}(?!\\d)", "TELEFONE", mapa);
        for (String termo : termos.split(";")) {
            if (!termo.isBlank()) texto = substituir(texto,
                    "(?iu)(?<![\\p{L}\\p{N}])" + Pattern.quote(termo.strip()) + "(?![\\p{L}\\p{N}])", "TERMO", mapa);
        }
        return new Filtrado(texto, mapa);
    }
    private String substituir(String texto, String regex, String tipo, Map<String, String> mapa) {
        return Pattern.compile(regex).matcher(texto).replaceAll(match -> {
            String chave = match.group();
            String marcador = mapa.computeIfAbsent(chave, k -> "[" + tipo + "_" + (mapa.size() + 1) + "]");
            return java.util.regex.Matcher.quoteReplacement(marcador);
        });
    }
}
