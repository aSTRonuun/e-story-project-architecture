import type { Channel } from 'amqplib';
import type {
  EventoPagamento,
  ProcessarResultadoPagamentoPorta,
} from '../../application/ports';
import { mensagemErro } from '../../domain/erro';
// Adaptador de entrada: consumidor de eventos do RabbitMQ.
// Traduz a mensagem em chamada ao caso de uso ProcessarResultadoPagamento.
function consumidorResultadoPagamento({
  canal,
  fila,
  processarResultadoPagamento,
}: {
  canal: Channel;
  fila: string;
  processarResultadoPagamento: ProcessarResultadoPagamentoPorta;
}) {
  canal.assertQueue(fila, { durable: true });
  canal.bindQueue(fila, 'loja.eventos', 'pagamento.aprovado');
  canal.bindQueue(fila, 'loja.eventos', 'pagamento.recusado');
  canal.prefetch(1);

  return canal.consume(fila, async (msg) => {
    if (!msg) return;
    try {
      const conteudo: EventoPagamento = JSON.parse(msg.content.toString());
      await processarResultadoPagamento.executar(conteudo);
      canal.ack(msg);
    } catch (erro) {
      console.error('[pedidos] falha ao processar evento:', mensagemErro(erro));
      canal.nack(msg, false, false); // descarta (demo); em producao: fila de erro
    }
  });
}

export = consumidorResultadoPagamento;
