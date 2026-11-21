import type { CobrarPedidoPorta } from '../../application/ports';
import { Router } from 'express';

// Adaptador de entrada (transport layer): HTTP -> caso de uso.
// Unico endpoint do servico: POST /cobrancas
function rotaPagamento({ cobrarPedido }: { cobrarPedido: CobrarPedidoPorta }) {
  const router = Router();

  router.post<Record<string, string>, unknown, unknown>(
    '/cobrancas',
    async (req, res, next) => {
      try {
        const resultado = await cobrarPedido.executar(req.body);
        res.status(201).json(resultado);
      } catch (erro) {
        next(erro);
      }
    }
  );

  return router;
}

export = rotaPagamento;
