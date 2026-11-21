// Portas de saida do nucleo (interfaces). Cada uma vira uma classe adaptadora.
// Implementacoes: adapters/out/

class CobrancaRepositorio {
  async obterOuCriar(_cobranca, _simularRecusa, _autorizar) {
    throw new Error('nao implementado');
  }
  async publicarPendentes(_publicador) {
    throw new Error('nao implementado');
  }
  async inserir(_cobranca) {
    throw new Error('nao implementado');
  }
  async atualizarStatus(_id, _status) {
    throw new Error('nao implementado');
  }
}

// Gateway de pagamento externo (simulado - RNF02: substituivel).
class GatewayPagamento {
  async autorizar(_valor) {
    throw new Error('nao implementado');
  }
}

class EventosPublicador {
  async publicar(_routingKey, _mensagem) {
    throw new Error('nao implementado');
  }
}

module.exports = { CobrancaRepositorio, GatewayPagamento, EventosPublicador };
