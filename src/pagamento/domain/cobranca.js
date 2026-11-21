class Cobranca {
  constructor({ id, pedidoId, valor, status, criadoEm }) {
    if (
      !Number.isInteger(pedidoId) ||
      pedidoId <= 0 ||
      pedidoId > 2147483647 ||
      typeof valor !== 'number' ||
      !Number.isFinite(valor) ||
      valor <= 0 ||
      valor > 99999999.99 ||
      Math.abs(valor * 100 - Math.round(valor * 100)) > 0.00001
    )
      throw Object.assign(new Error('pedidoId e valor invalidos'), {
        status: 400,
      });
    Object.assign(this, { id, pedidoId, valor, status, criadoEm });
  }
  aprovar() {
    this.status = 'aprovada';
  }
  recusar() {
    this.status = 'recusada';
  }
}
module.exports = Cobranca;
