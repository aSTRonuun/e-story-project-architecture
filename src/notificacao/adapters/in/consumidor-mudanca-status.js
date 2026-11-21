// Adaptador de entrada: consumidor de eventos do RabbitMQ (mudanca de status do pedido).
function consumidorMudancaStatus({ canal, fila, notificarMudancaStatus }) {
  canal.assertQueue(fila, { durable: true });
  canal.bindQueue(fila, 'loja.eventos', 'pedido.status.alterado');
  canal.prefetch(1);

  return canal.consume(fila, async (msg) => {
    if (!msg) return;
    try {
      await notificarMudancaStatus.executar(JSON.parse(msg.content.toString()));
      canal.ack(msg);
    } catch (erro) {
      console.error('[notificacao] falha ao processar evento:', erro.message);
      canal.nack(msg, false, false);
    }
  });
}

module.exports = consumidorMudancaStatus;
