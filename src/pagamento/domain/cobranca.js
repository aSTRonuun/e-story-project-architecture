// Entidade principal do dominio de Pagamento: a cobranca de um pedido.

class Cobranca {
  constructor({ id, pedidoId, valor, status, criadoEm }) {
    this.id = id;
    this.pedidoId = pedidoId;
    this.valor = valor;
    this.status = status; // 'aprovada' | 'recusada'
    this.criadoEm = criadoEm;
  }

  aprovar() { this.status = 'aprovada'; }
  recusar() { this.status = 'recusada'; }
}

module.exports = Cobranca;
