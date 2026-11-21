const { Router } = require('express');

// Adaptador de entrada (transport layer): HTTP -> caso de uso.
// Unico endpoint do servico: POST /pedidos
function rotaPedidos({ finalizarCompra }) {
  const router = Router();

  router.post('/pedidos', async (req, res, next) => {
    try {
      const resultado = await finalizarCompra.executar(req.body);
      res.status(201).json(resultado);
    } catch (erro) {
      next(erro);
    }
  });

  return router;
}

module.exports = rotaPedidos;
