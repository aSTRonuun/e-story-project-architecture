import type { ReservarEstoquePorta } from '../../application/ports';
import { Router } from 'express';

// Adaptador de entrada (transport layer): HTTP -> caso de uso.
// Unico endpoint do servico: POST /reservas
function rotaEstoque({
  reservarEstoque,
}: {
  reservarEstoque: ReservarEstoquePorta;
}) {
  const router = Router();

  router.post<Record<string, string>, unknown, unknown>(
    '/reservas',
    async (req, res, next) => {
      try {
        const resultado = await reservarEstoque.executar(req.body);
        res.status(200).json(resultado);
      } catch (erro) {
        next(erro);
      }
    }
  );

  return router;
}

export = rotaEstoque;
