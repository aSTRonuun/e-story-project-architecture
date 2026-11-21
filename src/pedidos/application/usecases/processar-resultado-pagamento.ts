import type { EventoPagamento } from '../ports';
import type {
  ProcessarResultadoPagamentoPorta,
  PedidoRepositorio,
  EventosPublicador,
} from '../ports';
import { STATUS } from '../../domain/pedido';

// RF06 - Reagir ao resultado do pagamento (evento PagamentoAprovado / PagamentoRecusado).
// Consumidor idempotente: entrega do RabbitMQ pode ser repetida (ADR-0003).
class ProcessarResultadoPagamento implements ProcessarResultadoPagamentoPorta {
  private readonly pedidoRepositorio: PedidoRepositorio;
  private readonly eventosPublicador: EventosPublicador;

  private readonly processados: Set<string>;
  constructor({
    pedidoRepositorio,
    eventosPublicador,
  }: {
    pedidoRepositorio: PedidoRepositorio;
    eventosPublicador: EventosPublicador;
  }) {
    this.pedidoRepositorio = pedidoRepositorio;
    this.eventosPublicador = eventosPublicador;
    this.processados = new Set(); // idempotencia em memoria (demo)
  }

  async executar({ evento, pedidoId }: EventoPagamento) {
    const chave = `${evento}:${pedidoId}`;
    if (this.processados.has(chave)) return;
    this.processados.add(chave);

    const pedido = await this.pedidoRepositorio.buscarPorId(pedidoId);
    if (!pedido) return; // mensagem fora de ordem ou pedido ja removido: ignora

    if (evento === 'PagamentoAprovado') {
      if (pedido.status === STATUS.PAGO) return;
      await this.pedidoRepositorio.atualizarStatus(pedidoId, STATUS.PAGO);
      // Notificacao reage a mudanca de status (RF08)
      await this.eventosPublicador.publicar('pedido.status.alterado', {
        evento: 'PedidoStatusAlterado',
        pedidoId,
        status: STATUS.PAGO,
        data: new Date().toISOString(),
      });
    }

    if (evento === 'PagamentoRecusado') {
      // RF06: pedido permanece pendente; o Estoque libera a reserva conforme ADR-0004.
      await this.eventosPublicador.publicar('pedido.status.alterado', {
        evento: 'PedidoStatusAlterado',
        pedidoId,
        status: pedido.status,
        motivo: 'pagamento recusado',
        data: new Date().toISOString(),
      });
    }
  }
}

export = ProcessarResultadoPagamento;
