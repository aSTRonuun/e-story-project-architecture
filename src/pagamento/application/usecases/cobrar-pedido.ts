import { registro, mensagemErro } from '../../domain/erro';
import type { ResultadoCobranca } from '../ports';
import type {
  CobrarPedidoPorta,
  CobrancaRepositorio,
  GatewayPagamento,
  EventosPublicador,
} from '../ports';
import Cobranca = require('../../domain/cobranca');
class CobrarPedido implements CobrarPedidoPorta {
  private readonly cobrancaRepositorio: CobrancaRepositorio;
  private readonly gatewayPagamento: GatewayPagamento;
  private readonly eventosPublicador: EventosPublicador;

  constructor({
    cobrancaRepositorio,
    gatewayPagamento,
    eventosPublicador,
  }: {
    cobrancaRepositorio: CobrancaRepositorio;
    gatewayPagamento: GatewayPagamento;
    eventosPublicador: EventosPublicador;
  }) {
    this.cobrancaRepositorio = cobrancaRepositorio;
    this.gatewayPagamento = gatewayPagamento;
    this.eventosPublicador = eventosPublicador;
  }
  async executar(dados: unknown): Promise<ResultadoCobranca> {
    const {
      pedidoId,
      valor,
      simularRecusa = false,
    } = registro(dados) ? dados : {};
    const cobranca = new Cobranca({ pedidoId, valor });
    if (typeof simularRecusa !== 'boolean')
      throw Object.assign(new Error('simularRecusa deve ser booleano'), {
        status: 400,
      });
    const salva = await this.cobrancaRepositorio.obterOuCriar(
      cobranca,
      simularRecusa,
      async () => {
        const autorizacao = await this.gatewayPagamento.autorizar(
          cobranca.valor,
          {
            simularRecusa,
          }
        );
        if (typeof autorizacao?.aprovado !== 'boolean')
          throw new Error('resposta invalida do gateway');
        return autorizacao.aprovado;
      }
    );
    // A outbox permanece pendente se o broker falhar. O worker repete a publicação.
    try {
      await this.republicarPendentes();
    } catch (e) {
      console.error('[pagamento] evento pendente na outbox:', mensagemErro(e));
    }
    return {
      cobrancaId: salva.id,
      status: salva.status === 'aprovada' ? 'aprovado' : 'recusado',
    };
  }
  async republicarPendentes() {
    return this.cobrancaRepositorio.publicarPendentes(this.eventosPublicador);
  }
}
export = CobrarPedido;
