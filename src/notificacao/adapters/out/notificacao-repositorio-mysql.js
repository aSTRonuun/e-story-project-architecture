const { NotificacaoRepositorio } = require('../../application/ports');
const Notificacao = require('../../domain/notificacao');

// Adaptador de saida: persistencia em MySQL.
class NotificacaoRepositorioMysql extends NotificacaoRepositorio {
  constructor({ pool }) {
    super();
    this.pool = pool;
  }

  async inserir(notificacao) {
    // MySQL TIMESTAMP nao aceita o formato ISO com T/Z; converte para "YYYY-MM-DD HH:MM:SS"
    const enviadoEm = String(notificacao.enviadoEm).replace('T', ' ').replace('Z', '').slice(0, 19);
    const [resultado] = await this.pool.execute(
      'INSERT INTO notificacoes (pedido_id, canal, mensagem, enviado_em) VALUES (?, ?, ?, ?)',
      [notificacao.pedidoId, notificacao.canal, notificacao.mensagem, enviadoEm]
    );
    return resultado.insertId;
  }

  async listar() {
    const [linhas] = await this.pool.execute('SELECT * FROM notificacoes ORDER BY id DESC');
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
