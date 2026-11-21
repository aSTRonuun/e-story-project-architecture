// Entidade principal do dominio de Estoque: o saldo de um produto.
// Regra de negocio pura (RNF01): disponivel = saldo - reservado.

class ItemEstoque {
  produtoId: number;
  saldo: number;
  reservado: number;
  constructor({
    produtoId,
    saldo,
    reservado,
  }: {
    produtoId: number;
    saldo: number;
    reservado: number;
  }) {
    this.produtoId = produtoId;
    this.saldo = saldo;
    this.reservado = reservado;
  }

  get disponivel() {
    return this.saldo - this.reservado;
  }

  // RF10 / RNF03: nunca vende alem do disponivel.
  podeReservar(quantidade: number) {
    return (
      Number.isInteger(quantidade) &&
      quantidade > 0 &&
      this.disponivel >= quantidade
    );
  }

  reservar(quantidade: number) {
    if (!this.podeReservar(quantidade)) {
      const e = Object.assign(
        new Error(`estoque insuficiente do produto ${this.produtoId}`),
        { status: 409 }
      );
      throw e;
    }
    this.reservado += quantidade;
  }

  validarMovimento(quantidade: number) {
    if (
      !Number.isInteger(quantidade) ||
      quantidade <= 0 ||
      quantidade > this.reservado
    )
      throw new Error('quantidade invalida para movimentar reserva');
  }
  baixar(quantidade: number) {
    this.validarMovimento(quantidade);
    this.reservado -= quantidade;
    this.saldo -= quantidade;
  }
  liberar(quantidade: number) {
    this.validarMovimento(quantidade);
    this.reservado -= quantidade;
  }
}

export = ItemEstoque;
