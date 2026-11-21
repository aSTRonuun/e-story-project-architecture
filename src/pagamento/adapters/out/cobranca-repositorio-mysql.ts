import type {
  CobrancaPersistida,
  EventosPublicador,
  EventoPagamento,
  RoutingPagamento,
} from '../../application/ports';
import type Cobranca = require('../../domain/cobranca');
type CobrancaLinha = RowDataPacket & CobrancaPersistida;
interface EventoLinha extends RowDataPacket {
  id: number;
  pedido_id: number;
  routing_key: RoutingPagamento;
  mensagem: string | EventoPagamento;
}
import type {
  Pool,
  PoolConnection,
  RowDataPacket,
  ResultSetHeader,
} from 'mysql2/promise';
import type { CobrancaRepositorio } from '../../application/ports';
class CobrancaRepositorioMysql implements CobrancaRepositorio {
  private readonly pool: Pool;

  constructor({ pool }: { pool: Pool }) {
    this.pool = pool;
  }
  async obterOuCriar(
    cobranca: Pick<Cobranca, 'pedidoId' | 'valor'>,
    simularRecusa: boolean,
    autorizar: () => Promise<boolean>
  ): Promise<CobrancaPersistida> {
    const c = await this.pool.getConnection();
    try {
      await c.beginTransaction();
      // Inserção provisória fica invisível até a autorização e outbox serem confirmadas.
      await c.execute<ResultSetHeader>(
        'INSERT INTO cobrancas (pedido_id,valor,status,simular_recusa) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE pedido_id=pedido_id',
        [cobranca.pedidoId, cobranca.valor, 'recusada', simularRecusa]
      );
      const [[linha]] = await c.execute<CobrancaLinha[]>(
        'SELECT * FROM cobrancas WHERE pedido_id=? FOR UPDATE',
        [cobranca.pedidoId]
      );
      if (
        Number(linha.valor) !== cobranca.valor ||
        Boolean(linha.simular_recusa) !== simularRecusa
      )
        throw Object.assign(
          new Error('pedidoId ja cobrado com outros parametros'),
          { status: 409 }
        );
      const [eventos] = await c.execute<EventoLinha[]>(
        'SELECT id FROM pagamento_eventos WHERE pedido_id=?',
        [cobranca.pedidoId]
      );
      if (!eventos.length) {
        const aprovado = await autorizar();
        linha.status = aprovado ? 'aprovada' : 'recusada';
        await c.execute<ResultSetHeader>(
          'UPDATE cobrancas SET status=? WHERE id=?',
          [linha.status, linha.id]
        );
        const mensagem: EventoPagamento = {
          evento: aprovado ? 'PagamentoAprovado' : 'PagamentoRecusado',
          pedidoId: cobranca.pedidoId,
          valor: cobranca.valor,
          data: new Date().toISOString(),
        };
        await c.execute<ResultSetHeader>(
          'INSERT INTO pagamento_eventos (pedido_id,routing_key,mensagem) VALUES (?,?,?)',
          [
            cobranca.pedidoId,
            aprovado ? 'pagamento.aprovado' : 'pagamento.recusado',
            JSON.stringify(mensagem),
          ]
        );
      }
      await c.commit();
      return linha;
    } catch (e) {
      await c.rollback();
      throw e;
    } finally {
      c.release();
    }
  }
  async publicarPendentes(publicador: EventosPublicador) {
    const c = await this.pool.getConnection();
    try {
      await c.beginTransaction();
      const [linhas] = await c.execute<EventoLinha[]>(
        'SELECT * FROM pagamento_eventos WHERE publicado=FALSE ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED'
      );
      for (const linha of linhas) {
        const mensagem: EventoPagamento =
          typeof linha.mensagem === 'string'
            ? JSON.parse(linha.mensagem)
            : linha.mensagem;
        await publicador.publicar(linha.routing_key, mensagem);
        await c.execute<ResultSetHeader>(
          'UPDATE pagamento_eventos SET publicado=TRUE WHERE id=?',
          [linha.id]
        );
      }
      await c.commit();
    } catch (e) {
      await c.rollback();
      throw e;
    } finally {
      c.release();
    }
  }
}
export = CobrancaRepositorioMysql;
