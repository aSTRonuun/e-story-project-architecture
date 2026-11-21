// Portas de saida do nucleo (interfaces). Cada uma vira uma classe adaptadora.
// Implementacoes: adapters/out/

// Repositorio de pedidos (persistencia).
class PedidoRepositorio {
  async inserir(_pedido) { throw new Error('nao implementado'); }
  async buscarPorId(_id) { throw new Error('nao implementado'); }
  async inserirItens(_pedidoId, _itens) { throw new Error('nao implementado'); }
  async atualizarStatus(_id, _status) { throw new Error('nao implementado'); }
  async buscarProdutos(_ids) { throw new Error('nao implementado'); }
  async remover(_pedidoId) { throw new Error('nao implementado'); }
}

// Servico de Estoque (outro servico, por HTTP).
class EstoqueApi {
  async reservar(_pedidoId, _itens) { throw new Error('nao implementado'); }
}

// Servico de Pagamento (outro servico, por HTTP).
class PagamentoApi {
  async cobrar(_pedidoId, _valor) { throw new Error('nao implementado'); }
}

// Publicacao de eventos no broker (ESB).
class EventosPublicador {
  async publicar(_routingKey, _mensagem) { throw new Error('nao implementado'); }
}

module.exports = { PedidoRepositorio, EstoqueApi, PagamentoApi, EventosPublicador };
