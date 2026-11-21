import type { Request, Response, NextFunction } from 'express';
import { mensagemErro, statusErro } from '../domain/erro';
// Composicao: monta as dependencias (injecao manual) e devolve o app + consumidor.
import express = require('express');
import conectarRabbit = require('./rabbit');
import mysql = require('mysql2/promise');
import config = require('./config');
import EstoqueRepositorioMysql = require('../adapters/out/estoque-repositorio-mysql');
import ReservarEstoque = require('../application/usecases/reservar-estoque');
import AplicarResultadoPagamento = require('../application/usecases/aplicar-resultado-pagamento');
import rotaEstoque = require('../adapters/in/rota-estoque');
import consumidorResultadoPagamento = require('../adapters/in/consumidor-resultado-pagamento');

async function criarApp() {
  const pool = await mysql.createPool({
    ...config.mysql,
    waitForConnections: true,
    timezone: 'Z',
  });
  const estoqueRepositorio = new EstoqueRepositorioMysql({ pool });

  const reservarEstoque = new ReservarEstoque({ estoqueRepositorio });
  const aplicarResultadoPagamento = new AplicarResultadoPagamento({
    estoqueRepositorio,
  });

  const app = express();
  app.use(express.json());
  app.use(rotaEstoque({ reservarEstoque }));

  // eslint-disable-next-line no-unused-vars
  app.use((erro: unknown, req: Request, res: Response, next: NextFunction) => {
    const status = statusErro(erro);
    if (status >= 500) console.error('[estoque]', erro);
    res.status(status).json({ erro: mensagemErro(erro) });
  });

  const rabbit = await conectarRabbit(config.rabbitmq, async (canal) => {
    await consumidorResultadoPagamento({
      canal,
      fila: config.rabbitmq.filaResultadoPagamento,
      aplicarResultadoPagamento,
    });
  });
  app.locals.fechar = async () => {
    await rabbit.fechar();
    await pool.end();
  };

  return app;
}

export { criarApp };
