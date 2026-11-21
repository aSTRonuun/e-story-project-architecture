import type { ResultadoCobranca } from '../../application/ports';
import type { PagamentoApi } from '../../application/ports';

// Adaptador de saida: chama o servico de Pagamento por HTTP (ADR-0003, REST sincrono).
// O resultado definitivo chega por evento (pagamento.aprovado / pagamento.recusado).
class PagamentoApiHttp implements PagamentoApi {
  private readonly baseUrl: string;

  constructor({ baseUrl }: { baseUrl: string }) {
    this.baseUrl = baseUrl;
  }

  async cobrar(
    pedidoId: number,
    valor: number,
    opcoes: { simularRecusa?: boolean } = {}
  ): Promise<ResultadoCobranca> {
    const resposta = await fetch(`${this.baseUrl}/cobrancas`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pedidoId, valor, ...opcoes }),
    });
    return (await resposta.json()) as ResultadoCobranca; // { status }
  }
}

export = PagamentoApiHttp;
