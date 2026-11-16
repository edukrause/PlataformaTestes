-- Temperatura efetivamente enviada ao provedor; nula quando o parâmetro foi omitido.
ALTER TABLE chamada_modelo ADD COLUMN temperatura DECIMAL(4,2);
