const { Router } = require('express');

// Adaptador de entrada (transport layer): HTTP -> caso de uso.
// Unico endpoint do servico: POST /reservas
function rotaEstoque({ reservarEstoque }) {
  const router = Router();

  router.post('/reservas', async (req, res, next) => {
    try {
      const resultado = await reservarEstoque.executar(req.body);
      res.status(200).json(resultado);
    } catch (erro) {
      next(erro);
    }
  });

  return router;
}

module.exports = rotaEstoque;
