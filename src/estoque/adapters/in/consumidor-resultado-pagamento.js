// Adaptador de entrada: consumidor de eventos do RabbitMQ (resultado do pagamento).
function consumidorResultadoPagamento({ canal, fila, aplicarResultadoPagamento }) {
  canal.assertQueue(fila, { durable: true });
  canal.bindQueue(fila, 'loja.eventos', 'pagamento.aprovado');
  canal.bindQueue(fila, 'loja.eventos', 'pagamento.recusado');
  canal.prefetch(1);

  return canal.consume(fila, async (msg) => {
    if (!msg) return;
    try {
      await aplicarResultadoPagamento.executar(JSON.parse(msg.content.toString()));
      canal.ack(msg);
    } catch (erro) {
      console.error('[estoque] falha ao processar evento:', erro.message);
      canal.nack(msg, false, false);
    }
  });
}

module.exports = consumidorResultadoPagamento;
