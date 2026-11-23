import type { ListarNotificacoesPorta } from '../../application/ports';
import { Router } from 'express';

// Adaptador de entrada (transport layer): HTTP -> caso de uso.
// Unico endpoint do servico: GET /notificacoes
function rotaNotificacao({
  listarNotificacoes,
}: {
  listarNotificacoes: ListarNotificacoesPorta;
}) {
  const router = Router();

  router.get('/notificacoes', async (req, res, next) => {
    try {
      const pedidoIdQuery = req.query.pedidoId;
      if (pedidoIdQuery !== undefined && typeof pedidoIdQuery !== 'string') {
        res.status(400).json({ erro: 'pedidoId invalido' });
        return;
      }
      const pedidoId =
        typeof pedidoIdQuery === 'string' ? Number(pedidoIdQuery) : undefined;
      if (
        pedidoId !== undefined &&
        (!Number.isSafeInteger(pedidoId) || pedidoId <= 0)
      ) {
        res.status(400).json({ erro: 'pedidoId invalido' });
        return;
      }
      const notificacoes = await listarNotificacoes.executar(pedidoId);
      res.status(200).json({ notificacoes });
    } catch (erro) {
      next(erro);
    }
  });

  return router;
}

export = rotaNotificacao;
