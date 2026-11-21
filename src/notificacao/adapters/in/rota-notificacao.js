const { Router } = require('express');

// Adaptador de entrada (transport layer): HTTP -> caso de uso.
// Unico endpoint do servico: GET /notificacoes
function rotaNotificacao({ listarNotificacoes }) {
  const router = Router();

  router.get('/notificacoes', async (req, res, next) => {
    try {
      const notificacoes = await listarNotificacoes.executar();
      res.status(200).json({ notificacoes });
    } catch (erro) {
      next(erro);
    }
  });

  return router;
}

module.exports = rotaNotificacao;
