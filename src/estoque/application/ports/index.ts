import type { ItemReserva, TipoResultadoPagamento } from '../../domain/reserva';
export type ResultadoReserva =
  | { ok: true }
  | { ok: false; motivo: 'estoque_insuficiente' };
export interface EstoqueRepositorio {
  reservar(pedidoId: number, itens: ItemReserva[]): Promise<ResultadoReserva>;
  aplicarResultado(
    pedidoId: number,
    evento: TipoResultadoPagamento
  ): Promise<void>;
}
export interface ReservarEstoquePorta {
  executar(dados: unknown): Promise<ResultadoReserva>;
}
export interface AplicarResultadoPagamentoPorta {
  executar(dados: unknown): Promise<void>;
}
