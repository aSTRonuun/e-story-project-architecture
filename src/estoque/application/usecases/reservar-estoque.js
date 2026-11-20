// RF10 - Reservar estoque para um pedido (chamada sincrona pelo servico de Pedidos).
// TODO(RAFael): validar concorrência (RNF03) na persistência.
class ReservarEstoque {
  constructor({ estoqueRepositorio }) {
    this.estoqueRepositorio = estoqueRepositorio;
  }

  async executar({ pedidoId, itens }) {
    const itensEstoque = await this.estoqueRepositorio.buscarItens(itens.map((i) => i.produtoId));
    const porId = new Map(itensEstoque.map((i) => [i.produtoId, i]));

    // valida tudo antes de gravar nada (evita reserva parcial)
    for (const item of itens) {
      const estoque = porId.get(item.produtoId);
      if (!estoque || !estoque.podeReservar(item.quantidade)) {
        return { ok: false, motivo: `estoque insuficiente do produto ${item.produtoId}` };
      }
    }

    for (const item of itens) {
      porId.get(item.produtoId).reservar(item.quantidade);
      await this.estoqueRepositorio.salvarItem(porId.get(item.produtoId));
    }
    if (pedidoId) await this.estoqueRepositorio.gravarReserva(pedidoId, itens);

    return { ok: true };
  }
}

module.exports = ReservarEstoque;
