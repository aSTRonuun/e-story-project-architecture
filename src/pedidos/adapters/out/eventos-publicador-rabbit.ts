import type { EventoStatus } from '../../application/ports';
import type { Options } from 'amqplib';
type PublicarMensagem = (
  exchange: string,
  key: string,
  content: Buffer,
  options: Options.Publish
) => boolean;
import type { EventosPublicador } from '../../application/ports';

// Adaptador de saida: publica eventos no RabbitMQ (exchange topic "loja.eventos").
class EventosPublicadorRabbit implements EventosPublicador {
  private readonly exchange: string;
  private readonly publicarMensagem: PublicarMensagem;

  constructor({
    exchange,
    publicar,
  }: {
    exchange: string;
    publicar: PublicarMensagem;
  }) {
    this.exchange = exchange;
    this.publicarMensagem = publicar; // injecao da funcao de publicacao do amqplib
  }

  async publicar(routingKey: 'pedido.status.alterado', mensagem: EventoStatus) {
    this.publicarMensagem(
      this.exchange,
      routingKey,
      Buffer.from(JSON.stringify(mensagem)),
      { persistent: true }
    );
  }
}

export = EventosPublicadorRabbit;
