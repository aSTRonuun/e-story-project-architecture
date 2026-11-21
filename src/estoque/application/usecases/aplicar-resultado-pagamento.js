// Reacao ao resultado do pagamento (evento pagamento.aprovado / pagamento.recusado).
// Aprovado: baixa definitiva. Recusado: libera a reserva (ADR-0004).
// Consumidor idempotente (entrega pode ser repetida - ADR-0003).
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
    if (!reserva) return; // reserva ja baixada/liberada ou inexistente: idempotente

    for (const item of reserva.itens) {
      if (evento === 'PagamentoAprovado') {
        await this.estoqueRepositorio.baixar(item.produtoId, item.quantidade);
      } else {
        await this.estoqueRepositorio.liberar(item.produtoId, item.quantidade);
      }
    }
  }
}

module.exports = AplicarResultadoPagamento;
