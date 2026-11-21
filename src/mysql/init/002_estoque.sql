-- Catálogo mock da demonstração; Pedidos lê somente nome/preço (ADR-0002).
CREATE TABLE IF NOT EXISTS produtos (
 id INT PRIMARY KEY, nome VARCHAR(120) NOT NULL, preco DECIMAL(10,2) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS estoque (
 produto_id INT PRIMARY KEY, saldo INT NOT NULL, reservado INT NOT NULL DEFAULT 0,
 CHECK (saldo >= 0 AND reservado >= 0 AND reservado <= saldo)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS estoque_reservas (
 pedido_id INT PRIMARY KEY, assinatura TEXT NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'pendente',
 CHECK (status IN ('pendente','baixada','liberada'))
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS reservas (
 pedido_id INT NOT NULL, produto_id INT NOT NULL, quantidade INT NOT NULL,
 PRIMARY KEY (pedido_id, produto_id), CHECK (quantidade > 0),
 FOREIGN KEY (pedido_id) REFERENCES estoque_reservas(pedido_id)
) ENGINE=InnoDB;
INSERT IGNORE INTO produtos (id,nome,preco) VALUES
 (1,'Teclado',99.95),(2,'Mouse',49.90),(3,'Monitor',899.90),
 (4,'Headset',149.90),(5,'Webcam',199.90);
INSERT IGNORE INTO estoque (produto_id,saldo) VALUES (1,100),(2,100),(3,20),(4,50),(5,30);
