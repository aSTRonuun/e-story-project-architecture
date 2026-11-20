// Composicao: monta as dependencias (injecao manual) e devolve o app.
const express = require('express');
const amqplib = require('amqplib');
const mysql = require('mysql2/promise');
const config = require('./config');
const CobrancaRepositorioMysql = require('../adapters/out/cobranca-repositorio-mysql');
const GatewayPagamentoMock = require('../adapters/out/gateway-pagamento-mock');
const EventosPublicadorRabbit = require('../adapters/out/eventos-publicador-rabbit');
const CobrarPedido = require('../application/usecases/cobrar-pedido');
const rotaPagamento = require('../adapters/in/rota-pagamento');

async function criarApp() {
  const pool = await mysql.createPool({ ...config.mysql, waitForConnections: true });

  const conexaoRabbit = await amqplib.connect(config.rabbitmq.url);
  const canal = await conexaoRabbit.createChannel();
  await canal.assertExchange(config.rabbitmq.exchange, 'topic', { durable: true });

  const cobrancaRepositorio = new CobrancaRepositorioMysql({ pool });
  const gatewayPagamento = new GatewayPagamentoMock();
  const eventosPublicador = new EventosPublicadorRabbit({
    exchange: config.rabbitmq.exchange,
    publicar: (...args) => canal.publish(...args),
  });

  const cobrarPedido = new CobrarPedido({ cobrancaRepositorio, gatewayPagamento, eventosPublicador });

  const app = express();
  app.use(express.json());
  app.use(rotaPagamento({ cobrarPedido }));

  // eslint-disable-next-line no-unused-vars
  app.use((erro, req, res, next) => {
    const status = erro.status || 500;
    if (status >= 500) console.error('[pagamento]', erro);
    res.status(status).json({ erro: erro.message });
  });

  return app;
}

module.exports = { criarApp };
