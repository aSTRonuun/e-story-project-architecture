const { EstoqueRepositorio } = require('../../application/ports');
const ItemEstoque = require('../../domain/item-estoque');

// Adaptador de saida: persistencia em MySQL.
// A concorrencia (RNF03/RF10) e resolvida aqui, com UPDATE condicional:
// o banco decide se ha saldo, nunca o read-then-write da aplicacao.
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

  // Reserva atomica: transacao com UPDATE condicional por item.
  // Se qualquer item nao tiver saldo disponivel, a transacao inteira e desfeita
  // (sem reserva parcial) e a reserva do pedido nao e gravada.
  async reservar(pedidoId, itens) {
    const conexao = await this.pool.getConnection();
    try {
      await conexao.beginTransaction();
      for (const item of itens) {
        const [resultado] = await conexao.execute(
          'UPDATE estoque SET reservado = reservado + ? WHERE produto_id = ? AND (saldo - reservado) >= ?',
          [item.quantidade, item.produtoId, item.quantidade]
        );
        if (resultado.affectedRows === 0) {
          await conexao.rollback();
          return { ok: false, motivo: `estoque insuficiente do produto ${item.produtoId}` };
        }
      }
      if (pedidoId) {
        await conexao.execute('DELETE FROM reservas WHERE pedido_id = ?', [pedidoId]);
        for (const item of itens) {
          await conexao.execute(
            'INSERT INTO reservas (pedido_id, produto_id, quantidade) VALUES (?, ?, ?)',
            [pedidoId, item.produtoId, item.quantidade]
          );
        }
      }
      await conexao.commit();
      return { ok: true };
    } catch (erro) {
      await conexao.rollback();
      throw erro;
    } finally {
      conexao.release();
    }
  }

  // Baixa definitiva no pagamento aprovado: so executa se a reserva ainda existe.
  async baixar(produtoId, quantidade) {
    const [resultado] = await this.pool.execute(
      'UPDATE estoque SET saldo = saldo - ?, reservado = reservado - ? WHERE produto_id = ? AND reservado >= ? AND saldo >= ?',
      [quantidade, quantidade, produtoId, quantidade, quantidade]
    );
    return resultado.affectedRows > 0;
  }

  // Liberacao da reserva no pagamento recusado: so zera o que foi reservado.
  async liberar(produtoId, quantidade) {
    const [resultado] = await this.pool.execute(
      'UPDATE estoque SET reservado = reservado - ? WHERE produto_id = ? AND reservado >= ?',
      [quantidade, produtoId, quantidade]
    );
    return resultado.affectedRows > 0;
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
