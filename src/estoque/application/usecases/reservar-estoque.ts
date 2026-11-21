import type { ReservarEstoquePorta, EstoqueRepositorio } from '../ports';
import { normalizarReserva } from '../../domain/reserva';
class ReservarEstoque implements ReservarEstoquePorta {
  private readonly estoqueRepositorio: EstoqueRepositorio;

  constructor({
    estoqueRepositorio,
  }: {
    estoqueRepositorio: EstoqueRepositorio;
  }) {
    this.estoqueRepositorio = estoqueRepositorio;
  }
  async executar(dados: unknown) {
    const { pedidoId, itens } = normalizarReserva(dados);
    return this.estoqueRepositorio.reservar(pedidoId, itens);
  }
}
export = ReservarEstoque;
