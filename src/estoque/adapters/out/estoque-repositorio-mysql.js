const { EstoqueRepositorio } = require('../../application/ports');
const { erro } = require('../../domain/reserva');
class EstoqueRepositorioMysql extends EstoqueRepositorio {
  constructor({ pool }) {
    super();
    this.pool = pool;
  }
  async transacao(operacao) {
    const c = await this.pool.getConnection();
    try {
      await c.beginTransaction();
      const resultado = await operacao(c);
      await c.commit();
      return resultado;
    } catch (e) {
      await c.rollback();
      throw e;
    } finally {
      c.release();
    }
  }
  async reservar(pedidoId, itens) {
    try {
      return await this.transacao(async (c) => {
        const assinatura = JSON.stringify(itens);
        // A chave única serializa inclusive duas primeiras requisições simultâneas.
        await c.execute(
          'INSERT INTO estoque_reservas (pedido_id,assinatura) VALUES (?,?) ON DUPLICATE KEY UPDATE pedido_id=pedido_id',
          [pedidoId, assinatura]
        );
        const [[reserva]] = await c.execute(
          'SELECT * FROM estoque_reservas WHERE pedido_id=? FOR UPDATE',
          [pedidoId]
        );
        if (reserva.assinatura !== assinatura)
          throw erro(409, 'pedidoId ja utilizado com outros itens');
        const [existentes] = await c.execute(
          'SELECT produto_id FROM reservas WHERE pedido_id=?',
          [pedidoId]
        );
        if (existentes.length) return { ok: true };
        for (const item of itens) {
          const [r] = await c.execute(
            'UPDATE estoque SET reservado=reservado+? WHERE produto_id=? AND saldo-reservado>=?',
            [item.quantidade, item.produtoId, item.quantidade]
          );
          if (!r.affectedRows) throw erro(409, 'estoque_insuficiente');
          await c.execute(
            'INSERT INTO reservas (pedido_id,produto_id,quantidade) VALUES (?,?,?)',
            [pedidoId, item.produtoId, item.quantidade]
          );
        }
        return { ok: true };
      });
    } catch (e) {
      if (e.message === 'estoque_insuficiente')
        return { ok: false, motivo: 'estoque_insuficiente' };
      throw e;
    }
  }
  async aplicarResultado(pedidoId, evento) {
    return this.transacao(async (c) => {
      const [[reserva]] = await c.execute(
        'SELECT * FROM estoque_reservas WHERE pedido_id=? FOR UPDATE',
        [pedidoId]
      );
      if (!reserva) throw new Error('reserva ainda nao encontrada');
      if (reserva.status !== 'pendente') return;
      const [itens] = await c.execute(
        'SELECT * FROM reservas WHERE pedido_id=? ORDER BY produto_id',
        [pedidoId]
      );
      const aprovado = evento === 'PagamentoAprovado';
      for (const item of itens) {
        const [r] = await c.execute(
          aprovado
            ? 'UPDATE estoque SET saldo=saldo-?, reservado=reservado-? WHERE produto_id=? AND reservado>=? AND saldo>=?'
            : 'UPDATE estoque SET reservado=reservado-? WHERE produto_id=? AND reservado>=?',
          aprovado
            ? [
                item.quantidade,
                item.quantidade,
                item.produto_id,
                item.quantidade,
                item.quantidade,
              ]
            : [item.quantidade, item.produto_id, item.quantidade]
        );
        if (!r.affectedRows) throw new Error('reserva inconsistente');
      }
      await c.execute(
        'UPDATE estoque_reservas SET status=? WHERE pedido_id=?',
        [aprovado ? 'baixada' : 'liberada', pedidoId]
      );
    });
  }
}
module.exports = EstoqueRepositorioMysql;
