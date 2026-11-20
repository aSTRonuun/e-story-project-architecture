const { EventosPublicador } = require('../../application/ports');

// Adaptador de saida: publica eventos no RabbitMQ (exchange topic "loja.eventos").
class EventosPublicadorRabbit extends EventosPublicador {
  constructor({ exchange, publicar }) {
    super();
    this.exchange = exchange;
    this.publicarMensagem = publicar;
  }

  async publicar(routingKey, mensagem) {
    this.publicarMensagem(
      this.exchange,
      routingKey,
      Buffer.from(JSON.stringify(mensagem)),
      { persistent: true }
    );
  }
}

module.exports = EventosPublicadorRabbit;
