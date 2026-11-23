export function checkoutErrorMessage(
  status: number | undefined,
  message: string | undefined
): string {
  const reason = message?.trim().toLocaleLowerCase('pt-BR') ?? '';

  if (status === 409 && reason.includes('estoque')) {
    return 'Um ou mais produtos ficaram sem estoque disponível. A sacola foi mantida; revise as quantidades e tente novamente.';
  }

  if (status === 404 || reason.includes('nao encontrado')) {
    return 'Um dos produtos não está mais disponível para este pedido. Revise sua sacola antes de tentar novamente.';
  }

  if (status === 400) {
    return 'Os dados do pedido não foram aceitos. Confira os produtos e as quantidades da sacola.';
  }

  if (status !== undefined && status >= 500) {
    return 'A loja está temporariamente indisponível. Seu carrinho continua salvo nesta página; tente novamente em instantes.';
  }

  if (status === undefined) {
    return 'Não foi possível conectar à loja. Confira se os serviços estão ativos e tente novamente.';
  }

  return 'Não foi possível concluir o pedido. A sacola foi mantida; tente novamente ou revise os itens.';
}
