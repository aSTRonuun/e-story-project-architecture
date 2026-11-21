import type { CheckoutEntrada } from '../ports/pedidos-api';
import type { EncaminharCheckoutPorta, PedidosApi } from '../ports/pedidos-api';
import RequisicaoCheckout = require('../../domain/requisicao-checkout');

// Caso de uso: encaminhar o checkout para o servico de Pedidos.
// Sem regra de negocio: valida a entrada e repassa (ADR-0003).
class EncaminharCheckout implements EncaminharCheckoutPorta {
  private readonly pedidosApi: PedidosApi;

  constructor({ pedidosApi }: { pedidosApi: PedidosApi }) {
    this.pedidosApi = pedidosApi;
  }

  async executar(dados: CheckoutEntrada) {
    const requisicao = new RequisicaoCheckout(dados);
    const { status, corpo } = await this.pedidosApi.criarPedido(requisicao);
    return { status, corpo };
  }
}

export = EncaminharCheckout;
