// Reacao ao resultado do pagamento (evento pagamento.aprovado / pagamento.recusado).
// Aprovado: baixa definitiva. Recusado: libera a reserva (ADR-0003).
// Consumidor idempotente (entrega pode ser repetida).
class AplicarResultadoPagamento {
  constructor({ estoqueRepositorio }) {
    this.estoqueRepositorio = estoqueRepositorio;
    this.processados = new Set();
  }

  async executar({ evento, pedidoId }) {
    const chave = `${evento}:${pedidoId}`;
    if (this.processados.has(chave)) return;
    this.processados.add(chave);

    const reserva = await this.estoqueRepositorio.buscarReserva(pedidoId);
    if (!reserva) return;

    for (const item of reserva.itens) {
      const estoque = (await this.estoqueRepositorio.buscarItens([item.produtoId]))[0];
      if (!estoque) continue;
      if (evento === 'PagamentoAprovado') estoque.baixar(item.quantidade);
      else estoque.liberar(item.quantidade);
      await this.estoqueRepositorio.salvarItem(estoque);
    }
  }
}

module.exports = AplicarResultadoPagamento;
