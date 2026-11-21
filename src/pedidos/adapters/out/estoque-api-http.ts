import type { ItemReserva, ResultadoReserva } from '../../application/ports';
import type { EstoqueApi } from '../../application/ports';

// Adaptador de saida: chama o servico de Estoque por HTTP (ADR-0003, REST sincrono).
class EstoqueApiHttp implements EstoqueApi {
  private readonly baseUrl: string;

  constructor({ baseUrl }: { baseUrl: string }) {
    this.baseUrl = baseUrl;
  }

  async reservar(
    pedidoId: number,
    itens: ItemReserva[]
  ): Promise<ResultadoReserva> {
    const resposta = await fetch(`${this.baseUrl}/reservas`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pedidoId, itens }),
    });
    return (await resposta.json()) as ResultadoReserva; // { ok, motivo? }
  }
}

export = EstoqueApiHttp;
