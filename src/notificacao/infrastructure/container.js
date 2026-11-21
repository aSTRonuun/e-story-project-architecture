// Composicao: monta as dependencias (injecao manual) e devolve o app + consumidor.
const express = require('express');
const amqplib = require('amqplib');
const mysql = require('mysql2/promise');
const config = require('./config');
const NotificacaoRepositorioMysql = require('../adapters/out/notificacao-repositorio-mysql');
const CanalEnvioMock = require('../adapters/out/canal-envio-mock');
const NotificarMudancaStatus = require('../application/usecases/notificar-mudanca-status');
const ListarNotificacoes = require('../application/usecases/listar-notificacoes');
const rotaNotificacao = require('../adapters/in/rota-notificacao');
const consumidorMudancaStatus = require('../adapters/in/consumidor-mudanca-status');

async function criarApp() {
  const pool = await mysql.createPool({ ...config.mysql, waitForConnections: true });

  const notificacaoRepositorio = new NotificacaoRepositorioMysql({ pool });
  const canalEnvio = new CanalEnvioMock();
  const notificarMudancaStatus = new NotificarMudancaStatus({ notificacaoRepositorio, canalEnvio });
  const listarNotificacoes = new ListarNotificacoes({ notificacaoRepositorio });

  const conexaoRabbit = await amqplib.connect(config.rabbitmq.url);
  const canal = await conexaoRabbit.createChannel();
  await canal.assertExchange(config.rabbitmq.exchange, 'topic', { durable: true });

  const app = express();
  app.use(express.json());
  app.use(rotaNotificacao({ listarNotificacoes }));

  // eslint-disable-next-line no-unused-vars
  app.use((erro, req, res, next) => {
    const status = erro.status || 500;
    if (status >= 500) console.error('[notificacao]', erro);
    res.status(status).json({ erro: erro.message });
  });

  await consumidorMudancaStatus({
    canal,
    fila: config.rabbitmq.filaMudancaStatus,
    notificarMudancaStatus,
  });

  return app;
}

module.exports = { criarApp };
