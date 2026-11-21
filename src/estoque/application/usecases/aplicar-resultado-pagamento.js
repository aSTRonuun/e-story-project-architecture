const { validarId, erro } = require('../../domain/reserva');
class AplicarResultadoPagamento {
  constructor({ estoqueRepositorio }) {
    this.estoqueRepositorio = estoqueRepositorio;
  }
  async executar(dados) {
    if (
      !dados ||
      !validarId(dados.pedidoId) ||
      !['PagamentoAprovado', 'PagamentoRecusado'].includes(dados.evento)
    )
      throw erro(400, 'evento de pagamento invalido');
    return this.estoqueRepositorio.aplicarResultado(
      dados.pedidoId,
      dados.evento
    );
  }
}
module.exports = AplicarResultadoPagamento;
