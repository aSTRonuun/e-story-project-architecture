const { Router } = require('express');

// Adaptador de entrada (transport layer): HTTP -> caso de uso.
// Unico endpoint do servico: POST /checkout
function rotaCheckout({ encaminharCheckout }) {
  const router = Router();

  router.post('/checkout', async (req, res, next) => {
    try {
      const { status, corpo } = await encaminharCheckout.executar(req.body);
      res.status(status).json(corpo);
    } catch (erro) {
      next(erro);
    }
  });

  return router;
}

module.exports = rotaCheckout;
