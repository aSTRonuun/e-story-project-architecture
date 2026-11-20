const RequisicaoCheckout = require('../../domain/requisicao-checkout');

// Caso de uso: encaminhar o checkout para o servico de Pedidos.
// Sem regra de negocio: valida a entrada e repassa (ADR-0003).
class EncaminharCheckout {
  constructor({ pedidosApi }) {
    this.pedidosApi = pedidosApi;
  }

  async executar(dados) {
    const requisicao = new RequisicaoCheckout(dados);
    const { status, corpo } = await this.pedidosApi.criarPedido(requisicao);
    return { status, corpo };
  }
}

module.exports = EncaminharCheckout;
