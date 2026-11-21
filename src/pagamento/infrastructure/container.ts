import type { Request, Response, NextFunction } from 'express';
import { mensagemErro, statusErro } from '../domain/erro';
// Composicao: monta as dependencias (injecao manual) e devolve o app.
import express = require('express');
import conectarRabbit = require('./rabbit');
import mysql = require('mysql2/promise');
import config = require('./config');
import CobrancaRepositorioMysql = require('../adapters/out/cobranca-repositorio-mysql');
import GatewayPagamentoMock = require('../adapters/out/gateway-pagamento-mock');
import EventosPublicadorRabbit = require('../adapters/out/eventos-publicador-rabbit');
import CobrarPedido = require('../application/usecases/cobrar-pedido');
import rotaPagamento = require('../adapters/in/rota-pagamento');

async function criarApp() {
  const pool = await mysql.createPool({
    ...config.mysql,
    waitForConnections: true,
  });

  const rabbit = await conectarRabbit(config.rabbitmq, async (canal) => {
    // Filas independentes existem antes da primeira publicação, mesmo se consumidores iniciarem depois.
    for (const fila of [
      'pedidos.resultado-pagamento',
      'estoque.resultado-pagamento',
    ]) {
      await canal.assertQueue(fila, { durable: true });
      for (const key of ['pagamento.aprovado', 'pagamento.recusado'])
        await canal.bindQueue(fila, config.rabbitmq.exchange, key);
    }
    await canal.assertQueue('notificacao.mudanca-status', { durable: true });
    await canal.bindQueue(
      'notificacao.mudanca-status',
      config.rabbitmq.exchange,
      'pedido.status.alterado'
    );
  });

  const cobrancaRepositorio = new CobrancaRepositorioMysql({ pool });
  const gatewayPagamento = new GatewayPagamentoMock();
  const eventosPublicador = new EventosPublicadorRabbit({
    exchange: config.rabbitmq.exchange,
    publicar: (...args) => rabbit.publicar(...args),
  });

  const cobrarPedido = new CobrarPedido({
    cobrancaRepositorio,
    gatewayPagamento,
    eventosPublicador,
  });

  const app = express();
  app.use(express.json());
  app.use(rotaPagamento({ cobrarPedido }));

  // eslint-disable-next-line no-unused-vars
  app.use((erro: unknown, req: Request, res: Response, next: NextFunction) => {
    const status = statusErro(erro);
    if (status >= 500) console.error('[pagamento]', erro);
    res.status(status).json({ erro: mensagemErro(erro) });
  });

  let executando = false;
  const worker = setInterval(async () => {
    if (executando) return;
    executando = true;
    try {
      await cobrarPedido.republicarPendentes();
    } catch (e) {
      console.error('[pagamento] outbox:', mensagemErro(e));
    } finally {
      executando = false;
    }
  }, 2000);
  app.locals.fechar = async () => {
    clearInterval(worker);
    await rabbit.fechar();
    await pool.end();
  };
  return app;
}

export { criarApp };
