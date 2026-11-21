function erro(status, mensagem) {
  return Object.assign(new Error(mensagem), { status });
}
function validarId(id) {
  return Number.isInteger(id) && id > 0 && id <= 2147483647;
}
function normalizarReserva(dados) {
  if (
    !dados ||
    !validarId(dados.pedidoId) ||
    !Array.isArray(dados.itens) ||
    !dados.itens.length
  )
    throw erro(400, 'pedidoId e itens validos sao obrigatorios');
  const totais = new Map();
  for (const item of dados.itens) {
    if (!item || !validarId(item.produtoId) || !validarId(item.quantidade))
      throw erro(400, 'produtoId e quantidade devem ser inteiros positivos');
    const total = (totais.get(item.produtoId) || 0) + item.quantidade;
    if (!validarId(total)) throw erro(400, 'quantidade excede o limite');
    totais.set(item.produtoId, total);
  }
  return {
    pedidoId: dados.pedidoId,
    itens: [...totais]
      .sort((a, b) => a[0] - b[0])
      .map(([produtoId, quantidade]) => ({ produtoId, quantidade })),
  };
}
module.exports = { normalizarReserva, validarId, erro };
