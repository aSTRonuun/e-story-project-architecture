const { NotificacaoRepositorio } = require('../../application/ports');
const Notificacao = require('../../domain/notificacao');

// Adaptador de saida: persistencia em MySQL.
class NotificacaoRepositorioMysql extends NotificacaoRepositorio {
  constructor({ pool }) {
    super();
    this.pool = pool;
  }

  async enviarUmaVez(chave, notificacao, enviar) {
    const c = await this.pool.getConnection();
    try {
      await c.beginTransaction();
      await c.execute(
        'INSERT INTO notificacoes (chave,pedido_id,canal,mensagem) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE chave=chave',
        [chave, notificacao.pedidoId, notificacao.canal, notificacao.mensagem]
      );
      const [[linha]] = await c.execute(
        'SELECT * FROM notificacoes WHERE chave=? FOR UPDATE',
        [chave]
      );
      if (!linha.enviado_em) {
        await enviar();
        await c.execute('UPDATE notificacoes SET enviado_em=? WHERE id=?', [
          new Date(notificacao.enviadoEm),
          linha.id,
        ]);
      }
      await c.commit();
    } catch (e) {
      await c.rollback();
      throw e;
    } finally {
      c.release();
    }
  }

  async listar() {
    const [linhas] = await this.pool.execute(
      'SELECT * FROM notificacoes WHERE enviado_em IS NOT NULL ORDER BY id DESC'
    );
    return linhas.map(
      (l) =>
        new Notificacao({
          id: l.id,
          pedidoId: l.pedido_id,
          canal: l.canal,
          mensagem: l.mensagem,
          enviadoEm: l.enviado_em,
        })
    );
  }
}

module.exports = NotificacaoRepositorioMysql;
