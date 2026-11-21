// Falhas transitórias: até 3 tentativas atrasadas; inválidas/esgotadas: fila de erro durável.
async function consumir({ canal, fila, aplicarResultadoPagamento }) {
  await canal.assertQueue(fila, { durable: true });
  for (const key of ['pagamento.aprovado', 'pagamento.recusado'])
    await canal.bindQueue(fila, 'loja.eventos', key);
  await canal.assertQueue(fila + '.erro', { durable: true });
  await canal.assertQueue(fila + '.retry', {
    durable: true,
    arguments: {
      'x-message-ttl': 2000,
      'x-dead-letter-exchange': '',
      'x-dead-letter-routing-key': fila,
    },
  });
  await canal.prefetch(1);
  return canal.consume(
    fila,
    async (msg) => {
      if (!msg) return;
      try {
        const dados = JSON.parse(msg.content.toString());
        const esperado =
          msg.fields.routingKey === 'pagamento.aprovado'
            ? 'PagamentoAprovado'
            : msg.fields.routingKey === 'pagamento.recusado'
              ? 'PagamentoRecusado'
              : undefined;
        if (esperado && dados?.evento !== esperado)
          throw Object.assign(new Error('routing key e evento divergentes'), {
            status: 400,
          });
        await aplicarResultadoPagamento.executar(dados);
        canal.ack(msg);
      } catch (e) {
        console.error('[estoque] falha ao processar evento:', e.message);
        const tentativas = Number(msg.properties.headers?.tentativas || 0);
        const destino =
          e.status === 400 || e instanceof SyntaxError || tentativas >= 3
            ? fila + '.erro'
            : fila + '.retry';
        try {
          await new Promise((resolve, reject) =>
            canal.sendToQueue(
              destino,
              msg.content,
              {
                persistent: true,
                contentType: 'application/json',
                headers: { tentativas: tentativas + 1, erro: e.message },
              },
              (err) => (err ? reject(err) : resolve())
            )
          );
          canal.ack(msg);
        } catch (falha) {
          console.error(
            '[estoque] falha ao preservar mensagem:',
            falha.message
          );
          try {
            canal.nack(msg, false, true);
          } catch (_) {
            /* conexão fechada devolve mensagens sem ack */
          }
        }
      }
    },
    { noAck: false }
  );
}
module.exports = consumir;
