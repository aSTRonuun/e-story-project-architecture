CREATE TABLE IF NOT EXISTS cobrancas (
 id INT AUTO_INCREMENT PRIMARY KEY, pedido_id INT NOT NULL UNIQUE,
 valor DECIMAL(10,2) NOT NULL, status VARCHAR(16) NOT NULL,
 simular_recusa BOOLEAN NOT NULL DEFAULT FALSE,
 criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK (valor > 0), CHECK (status IN ('aprovada','recusada'))
) ENGINE=InnoDB;
-- Outbox: resultado e intenção de publicação confirmados na mesma transação.
CREATE TABLE IF NOT EXISTS pagamento_eventos (
 id INT AUTO_INCREMENT PRIMARY KEY, pedido_id INT NOT NULL UNIQUE,
 routing_key VARCHAR(64) NOT NULL, mensagem JSON NOT NULL,
 publicado BOOLEAN NOT NULL DEFAULT FALSE,
 FOREIGN KEY (pedido_id) REFERENCES cobrancas(pedido_id)
) ENGINE=InnoDB;
