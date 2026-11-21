import { erro, registro } from './erro';
export { erro };
export interface ItemReserva {
  produtoId: number;
  quantidade: number;
}
export interface Reserva {
  pedidoId: number;
  itens: ItemReserva[];
}
export type TipoResultadoPagamento = 'PagamentoAprovado' | 'PagamentoRecusado';
export function validarId(id: unknown): id is number {
  return (
    typeof id === 'number' && Number.isInteger(id) && id > 0 && id <= 2147483647
  );
}
export function normalizarReserva(dados: unknown): Reserva {
  if (
    !registro(dados) ||
    !validarId(dados.pedidoId) ||
    !Array.isArray(dados.itens) ||
    !dados.itens.length
  )
    throw erro(400, 'pedidoId e itens validos sao obrigatorios');
  const totais = new Map<number, number>();
  for (const item of dados.itens as unknown[]) {
    if (
      !registro(item) ||
      !validarId(item.produtoId) ||
      !validarId(item.quantidade)
    )
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
