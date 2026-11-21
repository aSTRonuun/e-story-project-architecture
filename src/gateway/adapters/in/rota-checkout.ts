import type {
  EncaminharCheckoutPorta,
  CheckoutEntrada,
} from '../../application/ports/pedidos-api';
import { Router } from 'express';

// Adaptador de entrada (transport layer): HTTP -> caso de uso.
// Unico endpoint do servico: POST /checkout
function rotaCheckout({
  encaminharCheckout,
}: {
  encaminharCheckout: EncaminharCheckoutPorta;
}) {
  const router = Router();

  router.post<Record<string, string>, unknown, CheckoutEntrada>(
    '/checkout',
    async (req, res, next) => {
      try {
        const { status, corpo } = await encaminharCheckout.executar(req.body);
        res.status(status).json(corpo);
      } catch (erro) {
        next(erro);
      }
    }
  );

  return router;
}

export = rotaCheckout;
