import type { Request, Response, NextFunction } from 'express';
import { mensagemErro, statusErro } from '../domain/erro';
// Composicao: monta as dependencias (injecao manual) e devolve o app + consumidor.
import express = require('express');
import conectarRabbit = require('./rabbit');
import mysql = require('mysql2/promise');
import config = require('./config');
import NotificacaoRepositorioMysql = require('../adapters/out/notificacao-repositorio-mysql');
import CanalEnvioMock = require('../adapters/out/canal-envio-mock');
import NotificarMudancaStatus = require('../application/usecases/notificar-mudanca-status');
import ListarNotificacoes = require('../application/usecases/listar-notificacoes');
import rotaNotificacao = require('../adapters/in/rota-notificacao');
import consumidorMudancaStatus = require('../adapters/in/consumidor-mudanca-status');

async function criarApp() {
  const pool = await mysql.createPool({
    ...config.mysql,
    waitForConnections: true,
    timezone: 'Z',
  });

  const notificacaoRepositorio = new NotificacaoRepositorioMysql({ pool });
  const canalEnvio = new CanalEnvioMock();
  const notificarMudancaStatus = new NotificarMudancaStatus({
    notificacaoRepositorio,
    canalEnvio,
  });
  const listarNotificacoes = new ListarNotificacoes({ notificacaoRepositorio });

  const app = express();
  app.use(express.json());
  app.use(rotaNotificacao({ listarNotificacoes }));

  // eslint-disable-next-line no-unused-vars
  app.use((erro: unknown, req: Request, res: Response, next: NextFunction) => {
    const status = statusErro(erro);
    if (status >= 500) console.error('[notificacao]', erro);
    res.status(status).json({ erro: mensagemErro(erro) });
  });

  const rabbit = await conectarRabbit(config.rabbitmq, async (canal) => {
    await consumidorMudancaStatus({
      canal,
      fila: config.rabbitmq.filaMudancaStatus,
      notificarMudancaStatus,
    });
  });
  app.locals.fechar = async () => {
    await rabbit.fechar();
    await pool.end();
  };

  return app;
}

export { criarApp };
