package br.edu.unimater.plataforma.banco;

import org.springframework.stereotype.Service;

@Service
public class ConsultaBancoService {
    private final VerificadorSql verificador;
    private final ConsultaBancoGateway banco;

    public ConsultaBancoService(VerificadorSql verificador, ConsultaBancoGateway banco) {
        this.verificador = verificador;
        this.banco = banco;
    }

    public ConsultaBancoGateway.Resultado consultar(String sql) {
        return banco.consultar(verificador.validar(sql));
    }
}
