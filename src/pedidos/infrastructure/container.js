// Composicao: monta as dependencias (injecao manual) e devolve o app + consumidor.
const express = require('express');
const amqplib = require('amqplib');
const mysql = require('mysql2/promise');
const config = require('./config');
const PedidoRepositorioMysql = require('../adapters/out/pedido-repositorio-mysql');
const EstoqueApiHttp = require('../adapters/out/estoque-api-http');
const PagamentoApiHttp = require('../adapters/out/pagamento-api-http');
const EventosPublicadorRabbit = require('../adapters/out/eventos-publicador-rabbit');
const FinalizarCompra = require('../application/usecases/finalizar-compra');
const ProcessarResultadoPagamento = require('../application/usecases/processar-resultado-pagamento');
const rotaPedidos = require('../adapters/in/rota-pedidos');
const consumidorResultadoPagamento = require('../adapters/in/consumidor-resultado-pagamento');

async function criarApp() {
  const pool = await mysql.createPool({ ...config.mysql, waitForConnections: true });

  const pedidoRepositorio = new PedidoRepositorioMysql({ pool });
  const estoqueApi = new EstoqueApiHttp({ baseUrl: config.urls.estoque });
  const pagamentoApi = new PagamentoApiHttp({ baseUrl: config.urls.pagamento });

  const conexaoRabbit = await amqplib.connect(config.rabbitmq.url);
  const canal = await conexaoRabbit.createChannel();
  await canal.assertExchange(config.rabbitmq.exchange, 'topic', { durable: true });
  const eventosPublicador = new EventosPublicadorRabbit({
    exchange: config.rabbitmq.exchange,
    publicar: (...args) => canal.publish(...args),
  });

  const finalizarCompra = new FinalizarCompra({ pedidoRepositorio, estoqueApi, pagamentoApi });
  const processarResultadoPagamento = new ProcessarResultadoPagamento({ pedidoRepositorio, eventosPublicador });

  const app = express();
  app.use(express.json());
  app.use(rotaPedidos({ finalizarCompra }));

  // Handler unico de erros: mapeia erro de dominio (erro.status) para resposta HTTP.
  // eslint-disable-next-line no-unused-vars
  app.use((erro, req, res, next) => {
    const status = erro.status || 500;
    if (status >= 500) console.error('[pedidos]', erro);
    res.status(status).json({ erro: erro.message });
  });

  // consome o resultado do pagamento em paralelo ao servidor HTTP
  await consumidorResultadoPagamento({
    canal,
    fila: config.rabbitmq.filaResultadoPagamento,
    processarResultadoPagamento,
  });

  return app;
}

module.exports = { criarApp };
