// Entidade principal do dominio de Estoque: o saldo de um produto.
// Regra de negocio pura (RNF01): disponivel = saldo - reservado.

class ItemEstoque {
  constructor({ produtoId, saldo, reservado }) {
    this.produtoId = produtoId;
    this.saldo = saldo;
    this.reservado = reservado;
  }

  get disponivel() {
    return this.saldo - this.reservado;
  }

  // RF10 / RNF03: nunca vende alem do disponivel.
  podeReservar(quantidade) {
    return this.disponivel >= quantidade;
  }

  reservar(quantidade) {
    if (!this.podeReservar(quantidade)) {
      const e = new Error(`estoque insuficiente do produto ${this.produtoId}`);
      e.status = 409;
      throw e;
    }
    this.reservado += quantidade;
  }

  baixar(quantidade) { this.reservado -= quantidade; this.saldo -= quantidade; }
  liberar(quantidade) { this.reservado -= quantidade; }
}

module.exports = ItemEstoque;
