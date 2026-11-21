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
      const notificacoes = await listarNotificacoes.executar();
      res.status(200).json({ notificacoes });
    } catch (erro) {
      next(erro);
    }
  });

  return router;
}

export = rotaNotificacao;
