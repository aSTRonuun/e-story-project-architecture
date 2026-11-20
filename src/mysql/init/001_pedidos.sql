-- 001_pedidos.sql — serviço de Pedidos (ADR-0002: dono de carrinhos e pedidos)
-- Executado pelo MySQL na primeira subida do docker compose.
-- Dono do arquivo: Josias. (Estoque: 002, Pagamento: 003, Notificação: 004)

CREATE TABLE IF NOT EXISTS pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,            -- 'Aguardando pagamento' | 'Pago' | 'Cancelado'
  total DECIMAL(10, 2) NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Copia de nome e preço do produto no momento da compra (ADR-0002),
-- preservando o histórico mesmo com o produto alterado depois.
CREATE TABLE IF NOT EXISTS pedido_itens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  produto_id INT NOT NULL,
  nome_produto VARCHAR(120) NOT NULL,
  preco_unitario DECIMAL(10, 2) NOT NULL,
  quantidade INT NOT NULL,
  CONSTRAINT fk_pedido_itens_pedido FOREIGN KEY (pedido_id)
    REFERENCES pedidos (id) ON DELETE CASCADE
) ENGINE=InnoDB;
