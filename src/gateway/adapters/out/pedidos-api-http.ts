import type {
  CheckoutNormalizado,
  RespostaHttp,
} from '../../application/ports/pedidos-api';
import type { PedidosApi } from '../../application/ports/pedidos-api';

// Adaptador de saida: chama o servico de Pedidos por HTTP.
class PedidosApiHttp implements PedidosApi {
  private readonly baseUrl: string;

  constructor({ baseUrl }: { baseUrl: string }) {
    this.baseUrl = baseUrl;
  }

  async criarPedido(requisicao: CheckoutNormalizado): Promise<RespostaHttp> {
    const resposta = await fetch(`${this.baseUrl}/pedidos`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(requisicao),
    });
    return { status: resposta.status, corpo: await resposta.json() };
  }

  async buscarPedido(id: number, clienteId: string): Promise<RespostaHttp> {
    const url = new URL(`${this.baseUrl}/pedidos/${id}`);
    url.searchParams.set('clienteId', clienteId);
    const resposta = await fetch(url);
    return { status: resposta.status, corpo: await resposta.json() };
  }
}

export = PedidosApiHttp;
