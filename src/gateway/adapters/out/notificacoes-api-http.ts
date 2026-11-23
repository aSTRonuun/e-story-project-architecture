import type { RespostaHttp, NotificacoesApi } from '../../application/ports/pedidos-api';

class NotificacoesApiHttp implements NotificacoesApi {
  private readonly baseUrl: string;

  constructor({ baseUrl }: { baseUrl: string }) {
    this.baseUrl = baseUrl;
  }

  async listarPorPedido(pedidoId: number): Promise<RespostaHttp> {
    const url = new URL(`${this.baseUrl}/notificacoes`);
    url.searchParams.set('pedidoId', String(pedidoId));
    const resposta = await fetch(url);
    return { status: resposta.status, corpo: await resposta.json() };
  }
}

export = NotificacoesApiHttp;
