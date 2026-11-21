// Portas de saida do nucleo (interfaces). Cada uma vira uma classe adaptadora.
// Implementacoes: adapters/out/

class EstoqueRepositorio {
  async buscarItens(_ids) { throw new Error('nao implementado'); }
  // RNF03/RF10: precisa ser atomico (transacao + UPDATE condicional no banco).
  // Retorna { ok, motivo? } - ok:false quando algum item nao tem saldo.
  async reservar(_pedidoId, _itens) { throw new Error('nao implementado'); }
  // Baixa definitiva (pagamento aprovado) e liberacao (recusado), tambem condicionais.
  async baixar(_produtoId, _quantidade) { throw new Error('nao implementado'); }
  async liberar(_produtoId, _quantidade) { throw new Error('nao implementado'); }
  async buscarReserva(_pedidoId) { throw new Error('nao implementado'); }
}

module.exports = { EstoqueRepositorio };
