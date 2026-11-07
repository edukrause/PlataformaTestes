ALTER TABLE tarefa ADD COLUMN documentacao_texto CLOB;
ALTER TABLE tarefa ADD COLUMN documentacao_versao VARCHAR(80);
ALTER TABLE chamada_modelo ADD COLUMN finalidade VARCHAR(20) NOT NULL DEFAULT 'CENARIOS';
