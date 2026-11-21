// Composicao: monta as dependencias (injecao manual) e devolve o app.
const express = require('express');
const conectarRabbit = require('./rabbit');
const mysql = require('mysql2/promise');
const config = require('./config');
const CobrancaRepositorioMysql = require('../adapters/out/cobranca-repositorio-mysql');
const GatewayPagamentoMock = require('../adapters/out/gateway-pagamento-mock');
const EventosPublicadorRabbit = require('../adapters/out/eventos-publicador-rabbit');
const CobrarPedido = require('../application/usecases/cobrar-pedido');
const rotaPagamento = require('../adapters/in/rota-pagamento');

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
  app.use((erro, req, res, next) => {
    const status = erro.status || 500;
    if (status >= 500) console.error('[pagamento]', erro);
    res.status(status).json({ erro: erro.message });
  });

  let executando = false;
  const worker = setInterval(async () => {
    if (executando) return;
    executando = true;
    try {
      await cobrarPedido.republicarPendentes();
    } catch (e) {
      console.error('[pagamento] outbox:', e.message);
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

module.exports = { criarApp };
