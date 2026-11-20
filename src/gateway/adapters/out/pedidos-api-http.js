const PedidosApi = require('../../application/ports/pedidos-api');

// Adaptador de saida: chama o servico de Pedidos por HTTP.
class PedidosApiHttp extends PedidosApi {
  constructor({ baseUrl }) {
    super();
    this.baseUrl = baseUrl;
  }

  async criarPedido(requisicao) {
    const resposta = await fetch(`${this.baseUrl}/pedidos`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(requisicao),
    });
    return { status: resposta.status, corpo: await resposta.json() };
  }
}

module.exports = PedidosApiHttp;
