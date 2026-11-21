// Composicao: monta as dependencias do caso de uso e devolve o app Express.
// Em um servico maior seria aqui que entraria uma biblioteca de injecao de dependencia.
const express = require('express');
const config = require('./config');
const PedidosApiHttp = require('../adapters/out/pedidos-api-http');
const EncaminharCheckout = require('../application/usecases/encaminhar-checkout');
const rotaCheckout = require('../adapters/in/rota-checkout');

function criarApp() {
  const pedidosApi = new PedidosApiHttp({ baseUrl: config.urls.pedidos });
  const encaminharCheckout = new EncaminharCheckout({ pedidosApi });

  const app = express();
  app.use(express.json());
  app.use(rotaCheckout({ encaminharCheckout }));

  // Handler unico de erros: mapeia erro de dominio (erro.status) para resposta HTTP.
  // eslint-disable-next-line no-unused-vars
  app.use((erro, req, res, next) => {
    const status = erro.status || 500;
    if (status >= 500) console.error('[gateway]', erro);
    res.status(status).json({ erro: erro.message });
  });

  return app;
}

module.exports = { criarApp };
