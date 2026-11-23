import type {
  ConsultarNotificacoesPorta,
  NotificacoesApi,
  PedidosApi,
} from '../ports/pedidos-api';
import { erro } from '../../domain/erro';

class ConsultarNotificacoes implements ConsultarNotificacoesPorta {
  private readonly pedidosApi: PedidosApi;
  private readonly notificacoesApi: NotificacoesApi;

  constructor({
    pedidosApi,
    notificacoesApi,
  }: {
    pedidosApi: PedidosApi;
    notificacoesApi: NotificacoesApi;
  }) {
    this.pedidosApi = pedidosApi;
    this.notificacoesApi = notificacoesApi;
  }

  async executar(
    pedidoId: number,
    clienteId: string
  ): Promise<{ status: number; corpo: unknown }> {
    if (!Number.isSafeInteger(pedidoId) || pedidoId <= 0)
      throw erro(400, 'pedidoId invalido');
    if (!clienteId.trim()) throw erro(400, 'clienteId e obrigatorio');

    const pedido = await this.pedidosApi.buscarPedido(pedidoId, clienteId);
    if (pedido.status !== 200) return pedido;
    return this.notificacoesApi.listarPorPedido(pedidoId);
  }
}

export = ConsultarNotificacoes;
