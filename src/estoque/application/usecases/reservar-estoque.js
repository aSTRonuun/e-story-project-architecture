// RF10 - Reservar estoque para um pedido (chamada sincrona pelo servico de Pedidos).
// O nucleo valida as regras puras (ItemEstoque.podeReservar) e delega a gravacao
// a porta EstoqueRepositorio.reservar, que e atomica no banco (RNF03/RF10):
// dois pedidos simultaneos na ultima unidade nunca sao aceitos os dois.
class ReservarEstoque {
  constructor({ estoqueRepositorio }) {
    this.estoqueRepositorio = estoqueRepositorio;
  }

  async executar({ pedidoId, itens }) {
    const itensEstoque = await this.estoqueRepositorio.buscarItens(itens.map((i) => i.produtoId));
    const porId = new Map(itensEstoque.map((i) => [i.produtoId, i]));

    // validacao de dominio antes de ir ao banco (mensagem clara, sem efeito colateral)
    for (const item of itens) {
      const estoque = porId.get(item.produtoId);
      if (!estoque || !estoque.podeReservar(item.quantidade)) {
        return { ok: false, motivo: `estoque insuficiente do produto ${item.produtoId}` };
      }
    }

    // gravacao atomica: o UPDATE condicional decide a concorrencia (RNF03)
    return this.estoqueRepositorio.reservar(pedidoId, itens);
  }
}

module.exports = ReservarEstoque;
