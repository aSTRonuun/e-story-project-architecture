const { PagamentoApi } = require('../../application/ports');

// Adaptador de saida: chama o servico de Pagamento por HTTP (ADR-0003, REST sincrono).
// O resultado definitivo chega por evento (pagamento.aprovado / pagamento.recusado).
class PagamentoApiHttp extends PagamentoApi {
  constructor({ baseUrl }) {
    super();
    this.baseUrl = baseUrl;
  }

  async cobrar(pedidoId, valor, opcoes = {}) {
    const resposta = await fetch(`${this.baseUrl}/cobrancas`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pedidoId, valor, ...opcoes }),
    });
    return resposta.json(); // { status }
  }
}

module.exports = PagamentoApiHttp;
