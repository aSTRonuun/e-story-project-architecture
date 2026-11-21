import { registro } from '../../domain/erro';
import type {
  AplicarResultadoPagamentoPorta,
  EstoqueRepositorio,
} from '../ports';
import { validarId, erro } from '../../domain/reserva';
class AplicarResultadoPagamento implements AplicarResultadoPagamentoPorta {
  private readonly estoqueRepositorio: EstoqueRepositorio;

  constructor({
    estoqueRepositorio,
  }: {
    estoqueRepositorio: EstoqueRepositorio;
  }) {
    this.estoqueRepositorio = estoqueRepositorio;
  }
  async executar(dados: unknown) {
    if (
      !registro(dados) ||
      !validarId(dados.pedidoId) ||
      (dados.evento !== 'PagamentoAprovado' &&
        dados.evento !== 'PagamentoRecusado')
    )
      throw erro(400, 'evento de pagamento invalido');
    return this.estoqueRepositorio.aplicarResultado(
      dados.pedidoId,
      dados.evento
    );
  }
}
export = AplicarResultadoPagamento;
