// Composicao: monta as dependencias (injecao manual) e devolve o app + consumidor.
const express = require('express');
const amqplib = require('amqplib');
const mysql = require('mysql2/promise');
const config = require('./config');
const EstoqueRepositorioMysql = require('../adapters/out/estoque-repositorio-mysql');
const ReservarEstoque = require('../application/usecases/reservar-estoque');
const AplicarResultadoPagamento = require('../application/usecases/aplicar-resultado-pagamento');
const rotaEstoque = require('../adapters/in/rota-estoque');
const consumidorResultadoPagamento = require('../adapters/in/consumidor-resultado-pagamento');

async function criarApp() {
  const pool = await mysql.createPool({ ...config.mysql, waitForConnections: true });
  const estoqueRepositorio = new EstoqueRepositorioMysql({ pool });

  const reservarEstoque = new ReservarEstoque({ estoqueRepositorio });
  const aplicarResultadoPagamento = new AplicarResultadoPagamento({ estoqueRepositorio });

  const conexaoRabbit = await amqplib.connect(config.rabbitmq.url);
  const canal = await conexaoRabbit.createChannel();
  await canal.assertExchange(config.rabbitmq.exchange, 'topic', { durable: true });

  const app = express();
  app.use(express.json());
  app.use(rotaEstoque({ reservarEstoque }));

  // eslint-disable-next-line no-unused-vars
  app.use((erro, req, res, next) => {
    const status = erro.status || 500;
    if (status >= 500) console.error('[estoque]', erro);
    res.status(status).json({ erro: erro.message });
  });

  await consumidorResultadoPagamento({
    canal,
    fila: config.rabbitmq.filaResultadoPagamento,
    aplicarResultadoPagamento,
  });

  return app;
}

module.exports = { criarApp };
