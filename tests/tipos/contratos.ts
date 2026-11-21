// Este arquivo é compilado com noEmit; as expectativas negativas também precisam falhar.
import type {
  GatewayPagamento,
  EventosPublicador,
  CobrancaRepositorio,
} from '../../src/pagamento/application/ports';
import type CobrarPedido = require('../../src/pagamento/application/usecases/cobrar-pedido');
import type { EstoqueRepositorio } from '../../src/estoque/application/ports';
import type { CanalEnvio } from '../../src/notificacao/application/ports';
import type { PedidosApi } from '../../src/gateway/application/ports/pedidos-api';

class GatewaySubstituto implements GatewayPagamento {
  async autorizar(_valor: number, opcoes: { simularRecusa?: boolean } = {}) {
    return { aprovado: !opcoes.simularRecusa };
  }
}
const publicador: EventosPublicador = { publicar: async () => {} };
const repositorio: CobrancaRepositorio = {
  obterOuCriar: async (cobranca) => ({
    id: 1,
    pedido_id: cobranca.pedidoId,
    valor: cobranca.valor,
    status: 'aprovada',
    simular_recusa: 0,
    criado_em: new Date(),
  }),
  publicarPendentes: async () => {},
};
const dependencias: ConstructorParameters<typeof CobrarPedido>[0] = {
  gatewayPagamento: new GatewaySubstituto(),
  cobrancaRepositorio: repositorio,
  eventosPublicador: publicador,
};
void dependencias;
// @ts-expect-error Gateway deve retornar um resultado assíncrono com aprovado booleano.
const gatewayInvalido: GatewayPagamento = { autorizar: async () => 'aprovado' };
// @ts-expect-error Publicador de pagamento não aceita eventos internos de Pedidos.
publicador.publicar('pedido.status.alterado', {
  evento: 'PedidoStatusAlterado',
  pedidoId: 1,
  status: 'Pago',
});
const estoque: EstoqueRepositorio = {
  reservar: async () => ({ ok: true }),
  aplicarResultado: async () => {},
};
// @ts-expect-error Evento desconhecido não pode movimentar uma reserva.
estoque.aplicarResultado(1, 'PagamentoDesconhecido');
const envio: CanalEnvio = { enviar: async () => ({ ok: true }) };
// @ts-expect-error Canal de envio precisa de mensagem e canal, não só pedidoId.
envio.enviar({ pedidoId: 1 });
const pedidosInvalido: PedidosApi = {
  // @ts-expect-error O adaptador de Pedidos deve preservar o envelope HTTP.
  criarPedido: async () => ({ pedidoId: 1 }),
};
void gatewayInvalido;
void pedidosInvalido;
