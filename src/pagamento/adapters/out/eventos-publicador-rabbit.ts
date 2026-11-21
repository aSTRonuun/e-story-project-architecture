import type {
  EventoPagamento,
  RoutingPagamento,
} from '../../application/ports';
import type { Options } from 'amqplib';
type PublicarMensagem = (
  exchange: string,
  key: string,
  content: Buffer,
  options: Options.Publish
) => Promise<void>;
import type { EventosPublicador } from '../../application/ports';
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
    this.publicarMensagem = publicar;
  }
  async publicar(routingKey: RoutingPagamento, mensagem: EventoPagamento) {
    await this.publicarMensagem(
      this.exchange,
      routingKey,
      Buffer.from(JSON.stringify(mensagem)),
      { persistent: true, contentType: 'application/json' }
    );
  }
}
export = EventosPublicadorRabbit;
