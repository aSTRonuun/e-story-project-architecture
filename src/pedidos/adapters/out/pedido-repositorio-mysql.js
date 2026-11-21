const { PedidoRepositorio } = require('../../application/ports');

// Adaptador de saida: persistencia em MySQL.
// Tambem le a tabela de produtos (dados mockados - sem servico de Catalogo na demo).
class PedidoRepositorioMysql extends PedidoRepositorio {
  constructor({ pool }) {
    super();
    this.pool = pool;
  }

  async inserir(pedido) {
    const [resultado] = await this.pool.execute(
      'INSERT INTO pedidos (cliente_id, status, total) VALUES (?, ?, ?)',
      [pedido.clienteId, pedido.status, pedido.total]
    );
    return resultado.insertId;
  }

  async inserirItens(pedidoId, itens) {
    for (const item of itens) {
      await this.pool.execute(
        'INSERT INTO pedido_itens (pedido_id, produto_id, nome_produto, preco_unitario, quantidade) VALUES (?, ?, ?, ?, ?)',
        [pedidoId, item.produtoId, item.nomeProduto, item.precoUnitario, item.quantidade]
      );
    }
  }

  async buscarPorId(id) {
    const [linhas] = await this.pool.execute('SELECT * FROM pedidos WHERE id = ?', [id]);
    if (linhas.length === 0) return null;
    const linha = linhas[0];
    const [itens] = await this.pool.execute('SELECT * FROM pedido_itens WHERE pedido_id = ?', [id]);
    return { ...linha, itens };
  }

  async atualizarStatus(id, status) {
    await this.pool.execute('UPDATE pedidos SET status = ? WHERE id = ?', [status, id]);
  }

  // Mock do Catalogo (RF01/RF02 ficam fora da demo): nome e preco vem do seed.
  async buscarProdutos(ids) {
    if (ids.length === 0) return [];
    const marcadores = ids.map(() => '?').join(',');
    const [linhas] = await this.pool.execute(
      `SELECT id, nome, preco FROM produtos WHERE id IN (${marcadores})`,
      ids
    );
    return linhas;
  }

  // Usado quando a reserva de estoque falha (RF05: o pedido nao e criado).
  async remover(pedidoId) {
    await this.pool.execute('DELETE FROM pedidos WHERE id = ?', [pedidoId]);
  }
}

module.exports = PedidoRepositorioMysql;
