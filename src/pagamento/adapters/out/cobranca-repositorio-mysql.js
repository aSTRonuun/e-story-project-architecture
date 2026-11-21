const { CobrancaRepositorio } = require('../../application/ports');
class CobrancaRepositorioMysql extends CobrancaRepositorio {
  constructor({ pool }) {
    super();
    this.pool = pool;
  }
  async obterOuCriar(cobranca, simularRecusa, autorizar) {
    const c = await this.pool.getConnection();
    try {
      await c.beginTransaction();
      // Inserção provisória fica invisível até a autorização e outbox serem confirmadas.
      await c.execute(
        'INSERT INTO cobrancas (pedido_id,valor,status,simular_recusa) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE pedido_id=pedido_id',
        [cobranca.pedidoId, cobranca.valor, 'recusada', simularRecusa]
      );
      const [[linha]] = await c.execute(
        'SELECT * FROM cobrancas WHERE pedido_id=? FOR UPDATE',
        [cobranca.pedidoId]
      );
      if (
        Number(linha.valor) !== cobranca.valor ||
        Boolean(linha.simular_recusa) !== simularRecusa
      )
        throw Object.assign(
          new Error('pedidoId ja cobrado com outros parametros'),
          { status: 409 }
        );
      const [eventos] = await c.execute(
        'SELECT id FROM pagamento_eventos WHERE pedido_id=?',
        [cobranca.pedidoId]
      );
      if (!eventos.length) {
        const aprovado = await autorizar();
        linha.status = aprovado ? 'aprovada' : 'recusada';
        await c.execute('UPDATE cobrancas SET status=? WHERE id=?', [
          linha.status,
          linha.id,
        ]);
        const mensagem = {
          evento: aprovado ? 'PagamentoAprovado' : 'PagamentoRecusado',
          pedidoId: cobranca.pedidoId,
          valor: cobranca.valor,
          data: new Date().toISOString(),
        };
        await c.execute(
          'INSERT INTO pagamento_eventos (pedido_id,routing_key,mensagem) VALUES (?,?,?)',
          [
            cobranca.pedidoId,
            aprovado ? 'pagamento.aprovado' : 'pagamento.recusado',
            JSON.stringify(mensagem),
          ]
        );
      }
      await c.commit();
      return linha;
    } catch (e) {
      await c.rollback();
      throw e;
    } finally {
      c.release();
    }
  }
  async publicarPendentes(publicador) {
    const c = await this.pool.getConnection();
    try {
      await c.beginTransaction();
      const [linhas] = await c.execute(
        'SELECT * FROM pagamento_eventos WHERE publicado=FALSE ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED'
      );
      for (const linha of linhas) {
        const mensagem =
          typeof linha.mensagem === 'string'
            ? JSON.parse(linha.mensagem)
            : linha.mensagem;
        await publicador.publicar(linha.routing_key, mensagem);
        await c.execute(
          'UPDATE pagamento_eventos SET publicado=TRUE WHERE id=?',
          [linha.id]
        );
      }
      await c.commit();
    } catch (e) {
      await c.rollback();
      throw e;
    } finally {
      c.release();
    }
  }
}
module.exports = CobrancaRepositorioMysql;
