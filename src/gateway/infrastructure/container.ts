import type { Request, Response, NextFunction } from 'express';
import { mensagemErro, statusErro } from '../domain/erro';
// Composicao: monta as dependencias do caso de uso e devolve o app Express.
// Em um servico maior seria aqui que entraria uma biblioteca de injecao de dependencia.
import express = require('express');
import config = require('./config');
import PedidosApiHttp = require('../adapters/out/pedidos-api-http');
import EncaminharCheckout = require('../application/usecases/encaminhar-checkout');
import ConsultarPedido = require('../application/usecases/consultar-pedido');
import ConsultarNotificacoes = require('../application/usecases/consultar-notificacoes');
import rotaCheckout = require('../adapters/in/rota-checkout');
import rotaConsultas = require('../adapters/in/rota-consultas');
import NotificacoesApiHttp = require('../adapters/out/notificacoes-api-http');

function criarApp() {
  const pedidosApi = new PedidosApiHttp({ baseUrl: config.urls.pedidos });
  const notificacoesApi = new NotificacoesApiHttp({
    baseUrl: config.urls.notificacao,
  });
  const encaminharCheckout = new EncaminharCheckout({ pedidosApi });
  const consultarPedido = new ConsultarPedido({ pedidosApi });
  const consultarNotificacoes = new ConsultarNotificacoes({
    pedidosApi,
    notificacoesApi,
  });

  const app = express();
  app.use(express.json());
  app.use(rotaCheckout({ encaminharCheckout }));
  app.use(rotaConsultas({ consultarPedido, consultarNotificacoes }));

  // Handler unico de erros: mapeia erro de dominio (erro.status) para resposta HTTP.
  // eslint-disable-next-line no-unused-vars
  app.use((erro: unknown, req: Request, res: Response, next: NextFunction) => {
    const status = statusErro(erro);
    if (status >= 500) console.error('[gateway]', erro);
    res.status(status).json({ erro: mensagemErro(erro) });
  });

  return app;
}

export { criarApp };
