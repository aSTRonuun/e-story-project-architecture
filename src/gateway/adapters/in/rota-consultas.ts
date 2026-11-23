import type {
  ConsultarNotificacoesPorta,
  ConsultarPedidoPorta,
} from '../../application/ports/pedidos-api';
import { Router } from 'express';

function rotaConsultas({
  consultarPedido,
  consultarNotificacoes,
}: {
  consultarPedido: ConsultarPedidoPorta;
  consultarNotificacoes: ConsultarNotificacoesPorta;
}) {
  const router = Router();

  router.get('/pedidos/:pedidoId', async (req, res, next) => {
    try {
      const pedidoId = Number(req.params.pedidoId);
      const clienteId = req.query.clienteId;
      if (typeof clienteId !== 'string') {
        res.status(400).json({ erro: 'clienteId e obrigatorio' });
        return;
      }
      const { status, corpo } = await consultarPedido.executar(
        pedidoId,
        clienteId
      );
      res.status(status).json(corpo);
    } catch (erro) {
      next(erro);
    }
  });

  router.get('/notificacoes', async (req, res, next) => {
    try {
      const pedidoIdQuery = req.query.pedidoId;
      const clienteId = req.query.clienteId;
      if (typeof pedidoIdQuery !== 'string' || typeof clienteId !== 'string') {
        res
          .status(400)
          .json({ erro: 'pedidoId e clienteId sao obrigatorios' });
        return;
      }
      const { status, corpo } = await consultarNotificacoes.executar(
        Number(pedidoIdQuery),
        clienteId
      );
      res.status(status).json(corpo);
    } catch (erro) {
      next(erro);
    }
  });

  return router;
}

export = rotaConsultas;
