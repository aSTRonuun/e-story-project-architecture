const { normalizarReserva } = require('../../domain/reserva');
class ReservarEstoque {
  constructor({ estoqueRepositorio }) {
    this.estoqueRepositorio = estoqueRepositorio;
  }
  async executar(dados) {
    const { pedidoId, itens } = normalizarReserva(dados);
    return this.estoqueRepositorio.reservar(pedidoId, itens);
  }
}
module.exports = ReservarEstoque;
