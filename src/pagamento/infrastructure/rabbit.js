const amqplib = require('amqplib');
// Reconecta e reinstala a topologia/consumidores após perda da conexão.
async function conectarRabbit(config, instalar) {
  let conexao,
    canal,
    timer,
    fechando = false;
  async function abrir() {
    try {
      conexao = await amqplib.connect(config.url + '?heartbeat=10');
      conexao.on('error', (e) => console.error('[rabbit]', e.message));
      conexao.on('close', () => {
        canal = undefined;
        if (!fechando) timer = setTimeout(abrir, 2000);
      });
      const novo = await conexao.createConfirmChannel();
      novo.on('error', (e) => console.error('[rabbit] canal:', e.message));
      novo.on('close', () => {
        if (!fechando) conexao.close().catch(() => {});
      });
      await novo.assertExchange(config.exchange, 'topic', { durable: true });
      await instalar(novo);
      canal = novo;
    } catch (e) {
      console.error('[rabbit] conexao indisponivel:', e.message);
      if (conexao) await conexao.close().catch(() => {});
      clearTimeout(timer);
      if (!fechando) timer = setTimeout(abrir, 2000);
    }
  }
  await abrir();
  return {
    async publicar(...args) {
      if (!canal) throw new Error('RabbitMQ indisponivel');
      return new Promise((resolve, reject) =>
        canal.publish(...args, (e) => (e ? reject(e) : resolve()))
      );
    },
    async fechar() {
      fechando = true;
      clearTimeout(timer);
      if (conexao) await conexao.close().catch(() => {});
    },
  };
}
module.exports = conectarRabbit;
