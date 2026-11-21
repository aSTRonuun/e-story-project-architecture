import type { ChannelModel, ConfirmChannel, Options } from 'amqplib';
import { mensagemErro } from '../domain/erro';
import amqplib = require('amqplib');
// Reconecta e reinstala a topologia/consumidores após perda da conexão.
async function conectarRabbit(
  config: { url: string; exchange: string },
  instalar: (canal: ConfirmChannel) => Promise<void>
) {
  let conexao: ChannelModel | undefined;
  let canal: ConfirmChannel | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let fechando = false;
  async function abrir() {
    try {
      conexao = await amqplib.connect(config.url + '?heartbeat=10');
      conexao.on('error', (e) => console.error('[rabbit]', mensagemErro(e)));
      conexao.on('close', () => {
        canal = undefined;
        if (!fechando) timer = setTimeout(abrir, 2000);
      });
      const novo = await conexao.createConfirmChannel();
      novo.on('error', (e) =>
        console.error('[rabbit] canal:', mensagemErro(e))
      );
      novo.on('close', () => {
        if (!fechando) conexao?.close().catch(() => {});
      });
      await novo.assertExchange(config.exchange, 'topic', { durable: true });
      await instalar(novo);
      canal = novo;
    } catch (e) {
      console.error('[rabbit] conexao indisponivel:', mensagemErro(e));
      if (conexao) await conexao?.close().catch(() => {});
      clearTimeout(timer);
      if (!fechando) timer = setTimeout(abrir, 2000);
    }
  }
  await abrir();
  return {
    async publicar(
      exchange: string,
      key: string,
      content: Buffer,
      options: Options.Publish
    ): Promise<void> {
      const atual = canal;
      if (!atual) throw new Error('RabbitMQ indisponivel');
      return new Promise<void>((resolve, reject) =>
        atual.publish(exchange, key, content, options, (e) =>
          e ? reject(e) : resolve()
        )
      );
    },
    async fechar() {
      fechando = true;
      clearTimeout(timer);
      if (conexao) await conexao?.close().catch(() => {});
    },
  };
}
export = conectarRabbit;
