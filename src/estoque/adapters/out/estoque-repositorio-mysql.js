const { EstoqueRepositorio } = require('../../application/ports');
const ItemEstoque = require('../../domain/item-estoque');

// Adaptador de saida: persistencia em MySQL.
// TODO(RAFael): usar transacao/lock para a concorrência (RNF03).
class EstoqueRepositorioMysql extends EstoqueRepositorio {
  constructor({ pool }) {
    super();
    this.pool = pool;
  }

  async buscarItens(ids) {
    if (ids.length === 0) return [];
    const marcadores = ids.map(() => '?').join(',');
    const [linhas] = await this.pool.execute(
      `SELECT produto_id, saldo, reservado FROM estoque WHERE produto_id IN (${marcadores})`,
      ids
    );
    return linhas.map(
      (l) => new ItemEstoque({ produtoId: l.produto_id, saldo: l.saldo, reservado: l.reservado })
    );
  }

  async salvarItem(item) {
    await this.pool.execute('UPDATE estoque SET saldo = ?, reservado = ? WHERE produto_id = ?', [
      item.saldo,
      item.reservado,
      item.produtoId,
    ]);
  }

  async gravarReserva(pedidoId, itens) {
    await this.pool.execute('DELETE FROM reservas WHERE pedido_id = ?', [pedidoId]);
    for (const item of itens) {
      await this.pool.execute(
        'INSERT INTO reservas (pedido_id, produto_id, quantidade) VALUES (?, ?, ?)',
        [pedidoId, item.produtoId, item.quantidade]
      );
    }
  }

  async buscarReserva(pedidoId) {
    const [linhas] = await this.pool.execute('SELECT * FROM reservas WHERE pedido_id = ?', [pedidoId]);
    if (linhas.length === 0) return null;
    return {
      pedidoId,
      itens: linhas.map((l) => ({ produtoId: l.produto_id, quantidade: l.quantidade })),
    };
  }
}

module.exports = EstoqueRepositorioMysql;
