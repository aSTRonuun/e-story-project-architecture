// Entidade principal do dominio de Notificacao: um aviso enviado ao cliente.

class Notificacao {
  constructor({ id, pedidoId, canal, mensagem, enviadoEm }) {
    this.id = id;
    this.pedidoId = pedidoId;
    this.canal = canal; // 'email' | 'push'
    this.mensagem = mensagem;
    this.enviadoEm = enviadoEm;
  }
}

module.exports = Notificacao;
