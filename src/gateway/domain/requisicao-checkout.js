// Entidade principal do dominio do Gateway: a requisicao de checkout encaminhada.
// O Gateway nao tem regra de negocio (ADR-0003) - aqui fica apenas a validacao
// do formato da entrada antes de rotear.
class RequisicaoCheckout {
  constructor({ clienteId, itens, simularRecusa = false }) {
    if (!clienteId) {
      throw RequisicaoCheckout.erro(400, 'clienteId e obrigatorio');
    }
    if (!Array.isArray(itens) || itens.length === 0) {
      throw RequisicaoCheckout.erro(400, 'itens e obrigatorio');
    }
    for (const item of itens) {
      if (!item.produtoId || !(Number(item.quantidade) > 0)) {
        throw RequisicaoCheckout.erro(400, 'cada item precisa de produtoId e quantidade maior que zero');
      }
    }
    this.clienteId = clienteId;
    this.itens = itens.map((item) => ({
      produtoId: item.produtoId,
      quantidade: Number(item.quantidade),
    }));
    this.simularRecusa = Boolean(simularRecusa);
  }

  static erro(status, mensagem) {
    const e = new Error(mensagem);
    e.status = status;
    return e;
  }
}

module.exports = RequisicaoCheckout;
