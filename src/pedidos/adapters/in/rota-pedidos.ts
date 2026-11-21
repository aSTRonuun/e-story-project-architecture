import type { FinalizarCompraPorta, Checkout } from '../../application/ports';
import { Router } from 'express';

// Adaptador de entrada (transport layer): HTTP -> caso de uso.
// Unico endpoint do servico: POST /pedidos
function rotaPedidos({
  finalizarCompra,
}: {
  finalizarCompra: FinalizarCompraPorta;
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

  return router;
}

export = rotaPedidos;
