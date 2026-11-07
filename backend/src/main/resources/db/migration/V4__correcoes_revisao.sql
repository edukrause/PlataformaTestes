ALTER TABLE revisao ADD COLUMN valores_corrigidos_json CLOB NOT NULL DEFAULT '{}';
ALTER TABLE historico_revisao ADD COLUMN valores_corrigidos_json CLOB NOT NULL DEFAULT '{}';
