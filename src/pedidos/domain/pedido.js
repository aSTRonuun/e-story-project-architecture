// Entidade principal do dominio de Pedidos: o pedido e seu ciclo de vida.
// Sem dependencia de framework, banco ou outros servicos (RNF01).

const STATUS = {
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
  PAGO: 'Pago',
  CANCELADO: 'Cancelado',
};

class Pedido {
  constructor({ id, clienteId, itens, total, status, criadoEm }) {
    this.id = id;
    this.clienteId = clienteId;
    this.itens = itens; // copia de nome e preco no momento da compra (ADR-0002)
    this.total = total;
    this.status = status;
    this.criadoEm = criadoEm;
  }

  // RF05: pedido nasce "Aguardando pagamento" apos a reserva de estoque aceita.
  static criar({ id, clienteId, itens }) {
    if (!Array.isArray(itens) || itens.length === 0) {
      throw Pedido.erro(400, 'pedido precisa de pelo menos um item');
    }
    const total = itens.reduce((soma, item) => soma + Number(item.precoUnitario) * item.quantidade, 0);
    return new Pedido({ id, clienteId, itens, total, status: STATUS.AGUARDANDO_PAGAMENTO });
  }

  // RF06: pagamento aprovado leva o pedido a "Pago".
  pagar() {
    if (this.status !== STATUS.AGUARDANDO_PAGAMENTO) {
      throw Pedido.erro(409, `pedido com status "${this.status}" nao pode ser pago`);
    }
    this.status = STATUS.PAGO;
  }

  cancelar() {
    this.status = STATUS.CANCELADO;
  }

  static erro(status, mensagem) {
    const e = new Error(mensagem);
    e.status = status;
    return e;
  }
}

module.exports = { Pedido, STATUS };
