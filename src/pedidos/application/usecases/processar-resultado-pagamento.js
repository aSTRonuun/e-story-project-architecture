const { STATUS } = require('../../domain/pedido');

// RF06 - Reagir ao resultado do pagamento (evento PagamentoAprovado / PagamentoRecusado).
// Consumidor idempotente: entrega do RabbitMQ pode ser repetida (ADR-0003).
class ProcessarResultadoPagamento {
  constructor({ pedidoRepositorio, eventosPublicador }) {
    this.pedidoRepositorio = pedidoRepositorio;
    this.eventosPublicador = eventosPublicador;
    this.processados = new Set(); // idempotencia em memoria (demo)
  }

  async executar({ evento, pedidoId }) {
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
      // RF06: pedido permanece pendente; a reserva e mantida ate a expiracao.
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

module.exports = ProcessarResultadoPagamento;
