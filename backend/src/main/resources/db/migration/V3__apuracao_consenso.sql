ALTER TABLE apuracao ADD COLUMN preservar_ordem BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE apuracao ADD COLUMN tempo_total_ms BIGINT NOT NULL DEFAULT 0;
ALTER TABLE apuracao ADD COLUMN origem VARCHAR(30) NOT NULL DEFAULT 'MANUAL';
ALTER TABLE candidato_sql ADD COLUMN resultado_json CLOB;
ALTER TABLE candidato_sql ADD COLUMN mensagem_erro VARCHAR(1000);
CREATE UNIQUE INDEX uq_candidato_provedor ON candidato_sql(apuracao_id, provedor);
