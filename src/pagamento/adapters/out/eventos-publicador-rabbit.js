const { EventosPublicador } = require('../../application/ports');
class EventosPublicadorRabbit extends EventosPublicador {
  constructor({ exchange, publicar }) {
    super();
    this.exchange = exchange;
    this.publicarMensagem = publicar;
  }
  async publicar(routingKey, mensagem) {
    await this.publicarMensagem(
      this.exchange,
      routingKey,
      Buffer.from(JSON.stringify(mensagem)),
      { persistent: true, contentType: 'application/json' }
    );
  }
}
module.exports = EventosPublicadorRabbit;
