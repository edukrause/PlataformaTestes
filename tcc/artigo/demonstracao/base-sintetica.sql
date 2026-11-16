-- Base sintética da demonstração técnica. Não contém dados do ERP estudado.
DROP DATABASE IF EXISTS demo_erp;
CREATE DATABASE demo_erp;
CREATE TABLE demo_erp.produto (id INT PRIMARY KEY, descricao VARCHAR(60) NOT NULL, ativo TINYINT(1) NOT NULL);
CREATE TABLE demo_erp.pedido (
  id INT PRIMARY KEY, empresa INT NOT NULL, filial INT NOT NULL, emissao DATE NOT NULL,
  situacao CHAR(1) NOT NULL COMMENT 'N = normal, C = cancelado', excluido TINYINT(1) NOT NULL DEFAULT 0);
CREATE TABLE demo_erp.pedido_item (
  pedido_id INT NOT NULL, produto_id INT NOT NULL, quantidade DECIMAL(12,3) NOT NULL, valor_unitario DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (pedido_id) REFERENCES demo_erp.pedido(id), FOREIGN KEY (produto_id) REFERENCES demo_erp.produto(id));
INSERT INTO demo_erp.produto VALUES (10,'Parafuso 6 mm',1),(20,'Arruela 6 mm',1),(30,'Porca 6 mm',0);
INSERT INTO demo_erp.pedido VALUES
 (1,1,1,'2026-10-02','N',0),(2,1,1,'2026-10-05','C',0),(3,1,2,'2026-10-09','N',0),(4,1,1,'2026-10-15','N',1),
 (5,1,2,'2026-10-20','N',0),(6,2,1,'2026-10-21','N',0),(7,1,1,'2026-11-03','N',0),(8,1,1,'2026-10-28','N',0);
INSERT INTO demo_erp.pedido_item VALUES
 (1,10,100,0.50),(1,20,50,0.20),(2,10,40,0.50),(3,10,10,0.55),(3,30,5,0.30),(4,20,30,0.20),
 (5,20,20,0.20),(6,10,70,0.50),(7,10,15,0.50),(8,10,30,0.50),(8,20,10,0.25);
DROP USER IF EXISTS 'demo_leitura'@'%';
CREATE USER 'demo_leitura'@'%' IDENTIFIED BY 'demo-leitura';
GRANT SELECT ON demo_erp.* TO 'demo_leitura'@'%';
