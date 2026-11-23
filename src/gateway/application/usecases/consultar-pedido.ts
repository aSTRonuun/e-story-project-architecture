import type {
  ConsultarPedidoPorta,
  PedidosApi,
} from '../ports/pedidos-api';

class ConsultarPedido implements ConsultarPedidoPorta {
  private readonly pedidosApi: PedidosApi;

  constructor({ pedidosApi }: { pedidosApi: PedidosApi }) {
    this.pedidosApi = pedidosApi;
  }

  executar(id: number, clienteId: string) {
    return this.pedidosApi.buscarPedido(id, clienteId);
  }
}

export = ConsultarPedido;
