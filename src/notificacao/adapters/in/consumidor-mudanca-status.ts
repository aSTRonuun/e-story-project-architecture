import type { ConfirmChannel } from 'amqplib';
import type { NotificarMudancaStatusPorta } from '../../application/ports';
import { mensagemErro, statusErro, registro } from '../../domain/erro';
// Falhas transitórias: até 3 tentativas atrasadas; inválidas/esgotadas: fila de erro durável.
async function consumir({
  canal,
  fila,
  notificarMudancaStatus,
}: {
  canal: ConfirmChannel;
  fila: string;
  notificarMudancaStatus: NotificarMudancaStatusPorta;
}) {
  await canal.assertQueue(fila, { durable: true });
  for (const key of ['pedido.status.alterado'])
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
        const dados: unknown = JSON.parse(msg.content.toString());
        const esperado =
          msg.fields.routingKey === 'pagamento.aprovado'
            ? 'PagamentoAprovado'
            : msg.fields.routingKey === 'pagamento.recusado'
              ? 'PagamentoRecusado'
              : undefined;
        if (esperado && (!registro(dados) || dados.evento !== esperado))
          throw Object.assign(new Error('routing key e evento divergentes'), {
            status: 400,
          });
        await notificarMudancaStatus.executar(dados);
        canal.ack(msg);
      } catch (e) {
        console.error(
          '[notificacao] falha ao processar evento:',
          mensagemErro(e)
        );
        const tentativas = Number(msg.properties.headers?.tentativas || 0);
        const destino =
          statusErro(e) === 400 || e instanceof SyntaxError || tentativas >= 3
            ? fila + '.erro'
            : fila + '.retry';
        try {
          await new Promise<void>((resolve, reject) =>
            canal.sendToQueue(
              destino,
              msg.content,
              {
                persistent: true,
                contentType: 'application/json',
                headers: { tentativas: tentativas + 1, erro: mensagemErro(e) },
              },
              (err) => (err ? reject(err) : resolve())
            )
          );
          canal.ack(msg);
        } catch (falha) {
          console.error(
            '[notificacao] falha ao preservar mensagem:',
            mensagemErro(falha)
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
export = consumir;
