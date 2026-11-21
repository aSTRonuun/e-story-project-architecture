// Executar no contêiner de teste com o repositório montado em /projeto (ver relatório).
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('/app/node_modules/mysql2/promise');
const amqp = require('/app/node_modules/amqplib');
const root = '/projeto/src/';
const pool = mysql.createPool({
  host: 'mysql',
  user: 'root',
  password: 'root',
  database: 'loja_virtual',
  timezone: 'Z',
});
const base = 100000000 + Math.floor(Math.random() * 500000000);
const produto = base;
let canal, conexao;
async function sql(q, args = []) {
  return (await pool.execute(q, args))[0];
}
async function esperar(fn) {
  const fim = Date.now() + 20000;
  let ultimo;
  while (Date.now() < fim) {
    ultimo = await fn();
    if (ultimo) return ultimo;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('tempo excedido: ' + JSON.stringify(ultimo));
}
async function post(servico, porta, path, body) {
  const r = await fetch(`http://${servico}:${porta}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json() };
}
const reserva = (id, itens) =>
  post('estoque', 3002, '/reservas', { pedidoId: id, itens });
const item = (id, q) => ({ produtoId: id, quantidade: q });
const pagamento = (id, recusa = false) =>
  post('pagamento', 3003, '/cobrancas', {
    pedidoId: id,
    valor: 10,
    simularRecusa: recusa,
  });
async function publicar(key, body) {
  await new Promise((resolve, reject) =>
    canal.publish(
      'loja.eventos',
      key,
      Buffer.from(JSON.stringify(body)),
      { persistent: true },
      (e) => (e ? reject(e) : resolve())
    )
  );
}
test('integração com MySQL e RabbitMQ', async (t) => {
  t.after(async () => {
    if (conexao) await conexao.close();
    await pool.end();
  });
  const test = (...args) => t.test(...args);
  await test('preparação: fixtures próprias e assinatura da exchange', async () => {
    await sql(
      'INSERT INTO estoque (produto_id,saldo) VALUES (?,10),(?,1),(?,5)',
      [produto, produto + 1, produto + 2]
    );
    conexao = await amqp.connect('amqp://loja:loja@rabbitmq');
    canal = await conexao.createConfirmChannel();
    await canal.assertExchange('loja.eventos', 'topic', { durable: true });
  });
  await test('reserva válida e repetição concorrente não duplicam quantidades', async () => {
    const respostas = await Promise.all(
      Array.from({ length: 5 }, () => reserva(base, [item(produto, 2)]))
    );
    respostas.forEach((r) => assert.deepEqual(r.body, { ok: true }));
    assert.equal(
      (
        await sql('SELECT reservado FROM estoque WHERE produto_id=?', [produto])
      )[0].reservado,
      2
    );
  });
  await test('mesmo pedido com itens diferentes é conflito', async () => {
    assert.equal((await reserva(base, [item(produto, 3)])).status, 409);
  });
  await test('insuficiente e produto inexistente preservam contrato', async () => {
    for (const itens of [[item(produto, 99)], [item(produto + 99, 1)]])
      assert.deepEqual((await reserva(base + 3, itens)).body, {
        ok: false,
        motivo: 'estoque_insuficiente',
      });
  });
  await test('quantidade inválida retorna 400', async () => {
    assert.equal((await reserva(base + 3, [item(produto, -1)])).status, 400);
  });
  await test('rollback de múltiplos itens restaura primeira atualização', async () => {
    assert.equal(
      (await reserva(base + 3, [item(produto, 1), item(produto + 99, 1)])).body
        .ok,
      false
    );
    assert.equal(
      (
        await sql('SELECT reservado FROM estoque WHERE produto_id=?', [produto])
      )[0].reservado,
      2
    );
    assert.equal(
      (
        await sql('SELECT * FROM estoque_reservas WHERE pedido_id=?', [
          base + 3,
        ])
      ).length,
      0
    );
  });
  await test('itens repetidos são somados e reserva multitem é atômica', async () => {
    assert.equal(
      (
        await reserva(base + 4, [
          item(produto, 1),
          item(produto, 1),
          item(produto + 2, 1),
        ])
      ).body.ok,
      true
    );
    const linhas = await sql(
      'SELECT produto_id,quantidade FROM reservas WHERE pedido_id=? ORDER BY produto_id',
      [base + 4]
    );
    assert.deepEqual(linhas, [
      { produto_id: produto, quantidade: 2 },
      { produto_id: produto + 2, quantidade: 1 },
    ]);
  });
  await test('20 concorrentes disputam a última unidade: somente um vence', async () => {
    const rs = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        reserva(base + 10 + i, [item(produto + 1, 1)])
      )
    );
    assert.equal(rs.filter((r) => r.body.ok).length, 1);
    assert.equal(
      (
        await sql('SELECT reservado FROM estoque WHERE produto_id=?', [
          produto + 1,
        ])
      )[0].reservado,
      1
    );
  });
  await test('aprovação: persistência, evento no formato existente e baixa única', async () => {
    const fila = await canal.assertQueue('', { exclusive: true });
    await canal.bindQueue(fila.queue, 'loja.eventos', 'pagamento.aprovado');
    const r = await pagamento(base);
    assert.equal(r.body.status, 'aprovado');
    const msg = await esperar(() => canal.get(fila.queue, { noAck: true }));
    const body = JSON.parse(msg.content.toString());
    assert.equal(body.evento, 'PagamentoAprovado');
    assert.equal(body.pedidoId, base);
    assert.equal(body.valor, 10);
    assert.ok(Date.parse(body.data));
    await esperar(
      async () =>
        (
          await sql('SELECT status FROM estoque_reservas WHERE pedido_id=?', [
            base,
          ])
        )[0].status === 'baixada'
    );
    for (let i = 0; i < 3; i++) await publicar('pagamento.aprovado', body);
    await new Promise((r) => setTimeout(r, 400));
    assert.deepEqual(
      (
        await sql('SELECT saldo,reservado FROM estoque WHERE produto_id=?', [
          produto,
        ])
      )[0],
      { saldo: 8, reservado: 2 }
    );
    await canal.deleteQueue(fila.queue);
  });
  await test('recusa libera todos os itens, inclusive evento duplicado', async () => {
    assert.equal((await pagamento(base + 4, true)).body.status, 'recusado');
    await esperar(
      async () =>
        (
          await sql('SELECT status FROM estoque_reservas WHERE pedido_id=?', [
            base + 4,
          ])
        )[0].status === 'liberada'
    );
    await publicar('pagamento.recusado', {
      evento: 'PagamentoRecusado',
      pedidoId: base + 4,
    });
    await new Promise((r) => setTimeout(r, 300));
    assert.deepEqual(
      (
        await sql('SELECT saldo,reservado FROM estoque WHERE produto_id=?', [
          produto,
        ])
      )[0],
      { saldo: 8, reservado: 0 }
    );
  });
  await test('cobranças concorrentes repetidas retornam mesmo id e não publicam novo evento', async () => {
    const rs = await Promise.all(
      Array.from({ length: 5 }, () => pagamento(base))
    );
    assert.equal(new Set(rs.map((r) => r.body.cobrancaId)).size, 1);
    assert.equal(
      (await sql('SELECT * FROM cobrancas WHERE pedido_id=?', [base])).length,
      1
    );
    assert.equal(
      (await sql('SELECT * FROM pagamento_eventos WHERE pedido_id=?', [base]))
        .length,
      1
    );
    assert.equal(
      (
        await post('pagamento', 3003, '/cobrancas', {
          pedidoId: base,
          valor: 20,
        })
      ).status,
      409
    );
  });
  await test('falha de gateway reverte cobrança e outbox no MySQL', async () => {
    const Repo = require(
      root + 'pagamento/dist/adapters/out/cobranca-repositorio-mysql'
    );
    await assert.rejects(
      new Repo({ pool }).obterOuCriar(
        { pedidoId: base + 40, valor: 10 },
        false,
        async () => {
          throw new Error('gateway falhou');
        }
      ),
      /gateway falhou/
    );
    assert.equal(
      (await sql('SELECT * FROM cobrancas WHERE pedido_id=?', [base + 40]))
        .length,
      0
    );
  });
  await test('outbox conserva evento em falha de publicação e permite recuperação', async () => {
    const Repo = require(
      root + 'pagamento/dist/adapters/out/cobranca-repositorio-mysql'
    );
    const repo = new Repo({ pool });
    // O worker do serviço pode concorrer; criamos e bloqueamos o lote no próprio callback.
    await repo.obterOuCriar(
      { pedidoId: base + 41, valor: 10 },
      false,
      async () => true
    );
    await assert.rejects(
      repo.publicarPendentes({
        publicar: async () => {
          throw new Error('broker falhou');
        },
      }),
      /broker falhou/
    );
    assert.equal(
      (
        await sql('SELECT publicado FROM pagamento_eventos WHERE pedido_id=?', [
          base + 41,
        ])
      )[0].publicado,
      0
    );
    await repo.publicarPendentes({
      publicar: async (key, m) => assert.equal(m.pedidoId, base + 41),
    });
    assert.equal(
      (
        await sql('SELECT publicado FROM pagamento_eventos WHERE pedido_id=?', [
          base + 41,
        ])
      )[0].publicado,
      1
    );
  });
  await test('notificação consome evento real, persiste e expõe API', async () => {
    const evento = {
      evento: 'PedidoStatusAlterado',
      pedidoId: base,
      status: 'Pago',
      data: new Date().toISOString(),
    };
    await publicar('pedido.status.alterado', evento);
    await esperar(
      async () =>
        (await sql('SELECT * FROM notificacoes WHERE pedido_id=?', [base]))
          .length === 1
    );
    for (let i = 0; i < 3; i++)
      await publicar('pedido.status.alterado', evento);
    await new Promise((r) => setTimeout(r, 300));
    const { notificacoes } = await (
      await fetch('http://notificacao:3004/notificacoes')
    ).json();
    const ns = notificacoes.filter((n) => n.pedidoId === base);
    assert.equal(ns.length, 1);
    assert.equal(ns[0].canal, 'email');
    assert.ok(Date.parse(ns[0].enviadoEm));
  });
  await test('falha de envio reverte registro e nova instância recupera sem duplicar', async () => {
    const Repo = require(
      root + 'notificacao/dist/adapters/out/notificacao-repositorio-mysql'
    );
    const Caso = require(
      root + 'notificacao/dist/application/usecases/notificar-mudanca-status'
    );
    const repo = new Repo({ pool });
    const evento = {
      evento: 'PedidoStatusAlterado',
      pedidoId: base + 50,
      status: 'Pago',
    };
    await assert.rejects(
      new Caso({
        notificacaoRepositorio: repo,
        canalEnvio: {
          enviar: async () => {
            throw new Error('falha');
          },
        },
      }).executar(evento),
      /falha/
    );
    assert.equal(
      (await sql('SELECT * FROM notificacoes WHERE pedido_id=?', [base + 50]))
        .length,
      0
    );
    let envios = 0;
    const canalEnvio = {
      enviar: async () => {
        envios++;
        return { ok: true };
      },
    };
    for (let i = 0; i < 2; i++)
      await new Caso({
        notificacaoRepositorio: new Repo({ pool }),
        canalEnvio,
      }).executar(evento);
    assert.equal(envios, 1);
    assert.equal(
      (await repo.listar()).filter((n) => n.pedidoId === base + 50).length,
      1
    );
  });
  await test('evento inválido fica na fila durável de erro', async () => {
    await publicar('pedido.status.alterado', {
      evento: 'incorreto',
      pedidoId: base,
    });
    await esperar(
      async () =>
        (await canal.checkQueue('notificacao.mudanca-status.erro'))
          .messageCount > 0
    );
  });
  for (const recusa of [false, true])
    await test(`ponta a ponta pelo Gateway: ${recusa ? 'recusado' : 'aprovado'}`, async () => {
      const antes = (
        await sql('SELECT saldo,reservado FROM estoque WHERE produto_id=5')
      )[0];
      const r = await post('gateway', 3000, '/checkout', {
        clienteId: 'teste-rafael',
        itens: [item(5, 1)],
        simularRecusa: recusa,
      });
      assert.equal(r.status, 201);
      assert.equal(
        r.body.pagamentoSolicitado,
        recusa ? 'recusado' : 'aprovado'
      );
      const id = r.body.pedidoId;
      await esperar(
        async () =>
          (
            await sql('SELECT status FROM estoque_reservas WHERE pedido_id=?', [
              id,
            ])
          )[0]?.status === (recusa ? 'liberada' : 'baixada')
      );
      await esperar(
        async () =>
          (await sql('SELECT * FROM notificacoes WHERE pedido_id=?', [id]))
            .length === 1
      );
      assert.equal(
        (await sql('SELECT status FROM pedidos WHERE id=?', [id]))[0].status,
        recusa ? 'Aguardando pagamento' : 'Pago'
      );
      assert.deepEqual(
        (
          await sql('SELECT saldo,reservado FROM estoque WHERE produto_id=5')
        )[0],
        { saldo: antes.saldo - (recusa ? 0 : 1), reservado: antes.reservado }
      );
    });
  await test('invariante global: nenhum saldo negativo ou reserva acima do saldo', async () => {
    assert.equal(
      (
        await sql(
          'SELECT * FROM estoque WHERE saldo<0 OR reservado<0 OR reservado>saldo'
        )
      ).length,
      0
    );
  });
  console.log('FIXTURE_BASE=' + base);
});
