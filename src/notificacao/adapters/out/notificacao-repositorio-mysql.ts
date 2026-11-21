import type { Aviso } from '../../application/ports';
interface NotificacaoLinha extends RowDataPacket {
  id: number;
  pedido_id: number;
  canal: 'email' | 'push';
  mensagem: string;
  enviado_em: Date;
}
import type {
  Pool,
  PoolConnection,
  RowDataPacket,
  ResultSetHeader,
} from 'mysql2/promise';
import type { NotificacaoRepositorio } from '../../application/ports';
import Notificacao = require('../../domain/notificacao');

// Adaptador de saida: persistencia em MySQL.
class NotificacaoRepositorioMysql implements NotificacaoRepositorio {
  private readonly pool: Pool;

  constructor({ pool }: { pool: Pool }) {
    this.pool = pool;
  }

  async enviarUmaVez(
    chave: string,
    notificacao: Aviso,
    enviar: () => Promise<void>
  ) {
    const c = await this.pool.getConnection();
    try {
      await c.beginTransaction();
      await c.execute<ResultSetHeader>(
        'INSERT INTO notificacoes (chave,pedido_id,canal,mensagem) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE chave=chave',
        [chave, notificacao.pedidoId, notificacao.canal, notificacao.mensagem]
      );
      const [[linha]] = await c.execute<NotificacaoLinha[]>(
        'SELECT * FROM notificacoes WHERE chave=? FOR UPDATE',
        [chave]
      );
      if (!linha.enviado_em) {
        await enviar();
        await c.execute<ResultSetHeader>(
          'UPDATE notificacoes SET enviado_em=? WHERE id=?',
          [new Date(notificacao.enviadoEm), linha.id]
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

  async listar() {
    const [linhas] = await this.pool.execute<NotificacaoLinha[]>(
      'SELECT * FROM notificacoes WHERE enviado_em IS NOT NULL ORDER BY id DESC'
    );
    return linhas.map(
      (l) =>
        new Notificacao({
          id: l.id,
          pedidoId: l.pedido_id,
          canal: l.canal,
          mensagem: l.mensagem,
          enviadoEm: l.enviado_em,
        })
    );
  }
}

export = NotificacaoRepositorioMysql;
