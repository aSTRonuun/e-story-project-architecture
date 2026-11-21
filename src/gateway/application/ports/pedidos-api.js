// Porta de saida: o nucleo do Gateway nao sabe que Pedidos e HTTP.
// Implementacao: adapters/out/pedidos-api-http.js
class PedidosApi {
  async criarPedido(_requisicao) {
    throw new Error('PedidosApi.criarPedido deve ser implementada por um adaptador');
  }
}

module.exports = PedidosApi;
