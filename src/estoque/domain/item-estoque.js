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
    return (
      Number.isInteger(quantidade) &&
      quantidade > 0 &&
      this.disponivel >= quantidade
    );
  }

  reservar(quantidade) {
    if (!this.podeReservar(quantidade)) {
      const e = new Error(`estoque insuficiente do produto ${this.produtoId}`);
      e.status = 409;
      throw e;
    }
    this.reservado += quantidade;
  }

  validarMovimento(quantidade) {
    if (
      !Number.isInteger(quantidade) ||
      quantidade <= 0 ||
      quantidade > this.reservado
    )
      throw new Error('quantidade invalida para movimentar reserva');
  }
  baixar(quantidade) {
    this.validarMovimento(quantidade);
    this.reservado -= quantidade;
    this.saldo -= quantidade;
  }
  liberar(quantidade) {
    this.validarMovimento(quantidade);
    this.reservado -= quantidade;
  }
}

module.exports = ItemEstoque;
