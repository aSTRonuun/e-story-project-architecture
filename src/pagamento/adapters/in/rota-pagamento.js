const { Router } = require('express');

// Adaptador de entrada (transport layer): HTTP -> caso de uso.
// Unico endpoint do servico: POST /cobrancas
function rotaPagamento({ cobrarPedido }) {
  const router = Router();

  router.post('/cobrancas', async (req, res, next) => {
    try {
      const resultado = await cobrarPedido.executar(req.body);
      res.status(201).json(resultado);
    } catch (erro) {
      next(erro);
    }
  });

  return router;
}

module.exports = rotaPagamento;
