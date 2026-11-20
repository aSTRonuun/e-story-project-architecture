// Portas de saida do nucleo (interfaces). Cada uma vira uma classe adaptadora.
// Implementacoes: adapters/out/

class EstoqueRepositorio {
  async buscarItens(_ids) { throw new Error('nao implementado'); }
  async salvarItem(_item) { throw new Error('nao implementado'); }
  async gravarReserva(_pedidoId, _itens) { throw new Error('nao implementado'); }
  async buscarReserva(_pedidoId) { throw new Error('nao implementado'); }
}

module.exports = { EstoqueRepositorio };
