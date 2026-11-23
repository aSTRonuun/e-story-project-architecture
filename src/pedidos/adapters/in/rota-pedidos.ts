import type {
  FinalizarCompraPorta,
  Checkout,
  ConsultarPedidoPorta,
} from '../../application/ports';
import { Router } from 'express';

// Adaptador de entrada (transport layer): HTTP -> caso de uso.
// Unico endpoint do servico: POST /pedidos
function rotaPedidos({
  finalizarCompra,
  consultarPedido,
}: {
  finalizarCompra: FinalizarCompraPorta;
  consultarPedido: ConsultarPedidoPorta;
}) {
  const router = Router();

  router.post<Record<string, string>, unknown, Checkout>(
    '/pedidos',
    async (req, res, next) => {
      try {
        const resultado = await finalizarCompra.executar(req.body);
        res.status(201).json(resultado);
      } catch (erro) {
        next(erro);
      }
    }
  );

  router.get('/pedidos/:pedidoId', async (req, res, next) => {
    try {
      const pedidoId = Number(req.params.pedidoId);
      const clienteId = req.query.clienteId;
      if (typeof clienteId !== 'string') {
        res.status(400).json({ erro: 'clienteId e obrigatorio' });
        return;
      }
      const pedido = await consultarPedido.executar(pedidoId, clienteId);
      res.status(200).json(pedido);
    } catch (erro) {
      next(erro);
    }
  });

  return router;
}

export = rotaPedidos;
