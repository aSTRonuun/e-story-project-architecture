const { EstoqueApi } = require('../../application/ports');

// Adaptador de saida: chama o servico de Estoque por HTTP (ADR-0003, REST sincrono).
class EstoqueApiHttp extends EstoqueApi {
  constructor({ baseUrl }) {
    super();
    this.baseUrl = baseUrl;
  }

  async reservar(pedidoId, itens) {
    const resposta = await fetch(`${this.baseUrl}/reservas`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pedidoId, itens }),
    });
    return resposta.json(); // { ok, motivo? }
  }
}

module.exports = EstoqueApiHttp;
