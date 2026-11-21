import type { Request, Response, NextFunction } from 'express';
import { mensagemErro, statusErro } from '../domain/erro';
// Composicao: monta as dependencias (injecao manual) e devolve o app + consumidor.
import express = require('express');
import amqplib = require('amqplib');
import mysql = require('mysql2/promise');
import config = require('./config');
import PedidoRepositorioMysql = require('../adapters/out/pedido-repositorio-mysql');
import EstoqueApiHttp = require('../adapters/out/estoque-api-http');
import PagamentoApiHttp = require('../adapters/out/pagamento-api-http');
import EventosPublicadorRabbit = require('../adapters/out/eventos-publicador-rabbit');
import FinalizarCompra = require('../application/usecases/finalizar-compra');
import ProcessarResultadoPagamento = require('../application/usecases/processar-resultado-pagamento');
import rotaPedidos = require('../adapters/in/rota-pedidos');
import consumidorResultadoPagamento = require('../adapters/in/consumidor-resultado-pagamento');

async function criarApp() {
  const pool = await mysql.createPool({
    ...config.mysql,
    waitForConnections: true,
  });

  const pedidoRepositorio = new PedidoRepositorioMysql({ pool });
  const estoqueApi = new EstoqueApiHttp({ baseUrl: config.urls.estoque });
  const pagamentoApi = new PagamentoApiHttp({ baseUrl: config.urls.pagamento });

  const conexaoRabbit = await amqplib.connect(config.rabbitmq.url);
  const canal = await conexaoRabbit.createChannel();
  await canal.assertExchange(config.rabbitmq.exchange, 'topic', {
    durable: true,
  });
  const eventosPublicador = new EventosPublicadorRabbit({
    exchange: config.rabbitmq.exchange,
    publicar: (...args) => canal.publish(...args),
  });

  const finalizarCompra = new FinalizarCompra({
    pedidoRepositorio,
    estoqueApi,
    pagamentoApi,
  });
  const processarResultadoPagamento = new ProcessarResultadoPagamento({
    pedidoRepositorio,
    eventosPublicador,
  });

  const app = express();
  app.use(express.json());
  app.use(rotaPedidos({ finalizarCompra }));

  // Handler unico de erros: mapeia erro de dominio (erro.status) para resposta HTTP.
  // eslint-disable-next-line no-unused-vars
  app.use((erro: unknown, req: Request, res: Response, next: NextFunction) => {
    const status = statusErro(erro);
    if (status >= 500) console.error('[pedidos]', erro);
    res.status(status).json({ erro: mensagemErro(erro) });
  });

  // consome o resultado do pagamento em paralelo ao servidor HTTP
  await consumidorResultadoPagamento({
    canal,
    fila: config.rabbitmq.filaResultadoPagamento,
    processarResultadoPagamento,
  });

  return app;
}

export { criarApp };
