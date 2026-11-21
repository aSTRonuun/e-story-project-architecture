import { erro } from './erro';
export const STATUS = {
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
  PAGO: 'Pago',
  CANCELADO: 'Cancelado',
} as const;
export type StatusPedido = (typeof STATUS)[keyof typeof STATUS];
export interface ItemPedido {
  produtoId: number;
  nomeProduto: string;
  precoUnitario: number | string;
  quantidade: number;
}
export interface DadosPedido {
  id?: number;
  clienteId: string;
  itens: ItemPedido[];
  total: number;
  status: StatusPedido;
  criadoEm?: Date | string;
}
export class Pedido {
  id?: number;
  clienteId: string;
  itens: ItemPedido[];
  total: number;
  status: StatusPedido;
  criadoEm?: Date | string;
  constructor({ id, clienteId, itens, total, status, criadoEm }: DadosPedido) {
    this.id = id;
    this.clienteId = clienteId;
    this.itens = itens;
    this.total = total;
    this.status = status;
    this.criadoEm = criadoEm;
  }
  static criar({
    id,
    clienteId,
    itens,
  }: Pick<DadosPedido, 'id' | 'clienteId' | 'itens'>): Pedido {
    if (!Array.isArray(itens) || itens.length === 0)
      throw erro(400, 'pedido precisa de pelo menos um item');
    const total = itens.reduce(
      (soma, item) => soma + Number(item.precoUnitario) * item.quantidade,
      0
    );
    return new Pedido({
      id,
      clienteId,
      itens,
      total,
      status: STATUS.AGUARDANDO_PAGAMENTO,
    });
  }
  pagar(): void {
    if (this.status !== STATUS.AGUARDANDO_PAGAMENTO)
      throw erro(409, `pedido com status "${this.status}" nao pode ser pago`);
    this.status = STATUS.PAGO;
  }
  cancelar(): void {
    this.status = STATUS.CANCELADO;
  }
  static erro = erro;
}
