// Operações atômicas da porta de persistência. A aplicação não conhece MySQL.
class EstoqueRepositorio {
  async reservar(_pedidoId, _itens) {
    throw new Error('nao implementado');
  }
  async aplicarResultado(_pedidoId, _evento) {
    throw new Error('nao implementado');
  }
}
module.exports = { EstoqueRepositorio };
