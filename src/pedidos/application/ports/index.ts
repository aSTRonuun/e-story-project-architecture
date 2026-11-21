import type { Pedido, ItemPedido, StatusPedido } from '../../domain/pedido';
export interface ItemReserva {
  produtoId: number;
  quantidade: number;
}
export interface Checkout {
  clienteId: string;
  itens: ItemReserva[];
  simularRecusa?: boolean;
}
export interface ProdutoMock {
  id: number;
  nome: string;
  preco: number | string;
}
// DTO de leitura preserva os nomes SQL já retornados pelo adaptador existente.
export interface PedidoPersistido {
  id: number;
  cliente_id: string;
  status: StatusPedido;
  total: string | number;
  criado_em: Date;
  atualizado_em: Date;
  itens: {
    id: number;
    pedido_id: number;
    produto_id: number;
    nome_produto: string;
    preco_unitario: string | number;
    quantidade: number;
  }[];
}
export interface PedidoRepositorio {
  inserir(pedido: Pedido): Promise<number>;
  inserirItens(pedidoId: number, itens: ItemPedido[]): Promise<void>;
  buscarPorId(id: number): Promise<PedidoPersistido | null>;
  atualizarStatus(id: number, status: StatusPedido): Promise<void>;
  buscarProdutos(ids: number[]): Promise<ProdutoMock[]>;
  remover(pedidoId: number): Promise<void>;
}
export type ResultadoReserva = { ok: true } | { ok: false; motivo?: string };
export interface EstoqueApi {
  reservar(pedidoId: number, itens: ItemReserva[]): Promise<ResultadoReserva>;
}
export interface ResultadoCobranca {
  cobrancaId?: number;
  status: 'aprovado' | 'recusado';
}
export interface PagamentoApi {
  cobrar(
    pedidoId: number,
    valor: number,
    opcoes?: { simularRecusa?: boolean }
  ): Promise<ResultadoCobranca>;
}
export interface EventoPagamento {
  evento: 'PagamentoAprovado' | 'PagamentoRecusado';
  pedidoId: number;
  valor?: number;
  data?: string;
}
export interface EventoStatus {
  evento: 'PedidoStatusAlterado';
  pedidoId: number;
  status: StatusPedido;
  motivo?: string;
  data: string;
}
export interface EventosPublicador {
  publicar(
    routingKey: 'pedido.status.alterado',
    mensagem: EventoStatus
  ): Promise<void>;
}
export interface ResultadoCheckout {
  pedidoId: number;
  status: StatusPedido;
  total: number;
  pagamentoSolicitado: 'aprovado' | 'recusado';
}
export interface FinalizarCompraPorta {
  executar(dados: Checkout): Promise<ResultadoCheckout>;
}
export interface ProcessarResultadoPagamentoPorta {
  executar(dados: EventoPagamento): Promise<void>;
}
