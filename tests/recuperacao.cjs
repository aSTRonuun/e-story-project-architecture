const assert = require('node:assert/strict');
const fs = require('node:fs');
const mysql = require('/app/node_modules/mysql2/promise');
const amqp = require('/app/node_modules/amqplib');
const pool = mysql.createPool({
  host: 'mysql',
  user: 'root',
  password: 'root',
  database: 'loja_virtual',
});
const sql = async (q, p = []) => (await pool.execute(q, p))[0];
async function esperar(fn) {
  for (let i = 0; i < 100; i++) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('timeout recuperação');
}
async function post(host, port, path, dados) {
  const r = await fetch(`http://${host}:${port}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(dados),
  });
  assert.ok(r.ok);
  return r.json();
}
const path = '/tmp/recuperacao-state.json';
async function publicar(id) {
  const c = await amqp.connect('amqp://loja:loja@rabbitmq');
  const canal = await c.createConfirmChannel();
  for (const [key, msg] of [
    ['pagamento.aprovado', { evento: 'PagamentoAprovado', pedidoId: id }],
    [
      'pedido.status.alterado',
      { evento: 'PedidoStatusAlterado', pedidoId: id, status: 'Pago' },
    ],
  ])
    await new Promise((resolve, reject) =>
      canal.publish(
        'loja.eventos',
        key,
        Buffer.from(JSON.stringify(msg)),
        { persistent: true },
        (e) => (e ? reject(e) : resolve())
      )
    );
  await c.close();
}
(async () => {
  const modo = process.argv[2];
  if (modo === 'preparar') {
    const id = 700000000 + Math.floor(Math.random() * 100000000);
    await sql('INSERT INTO estoque (produto_id,saldo) VALUES (?,5)', [id]);
    for (const pedidoId of [id, id + 1])
      await post('estoque', 3002, '/reservas', {
        pedidoId,
        itens: [{ produtoId: id, quantidade: 1 }],
      });
    await post('pagamento', 3003, '/cobrancas', { pedidoId: id, valor: 10 });
    await publicar(id);
    await esperar(
      async () =>
        (await sql('SELECT * FROM notificacoes WHERE pedido_id=?', [id]))
          .length === 1
    );
    await esperar(
      async () =>
        (
          await sql('SELECT status FROM estoque_reservas WHERE pedido_id=?', [
            id,
          ])
        )[0].status === 'baixada'
    );
    fs.writeFileSync(path, JSON.stringify({ id }));
    console.log('Preparação OK, id=' + id);
  } else {
    const { id } = JSON.parse(fs.readFileSync(path));
    if (modo === 'reinicio') {
      await publicar(id);
      await new Promise((r) => setTimeout(r, 500));
      assert.deepEqual(
        (
          await sql('SELECT saldo,reservado FROM estoque WHERE produto_id=?', [
            id,
          ])
        )[0],
        { saldo: 4, reservado: 1 }
      );
      assert.equal(
        (await sql('SELECT * FROM notificacoes WHERE pedido_id=?', [id]))
          .length,
        1
      );
      const consulta = await (
        await fetch('http://notificacao:3004/notificacoes')
      ).json();
      assert.equal(
        consulta.notificacoes.filter((n) => n.pedidoId === id).length,
        1
      );
      console.log(
        'Reinício real: estoque e notificação idempotentes e consulta persistida OK'
      );
    } else if (modo === 'offline') {
      assert.equal(
        (
          await post('pagamento', 3003, '/cobrancas', {
            pedidoId: id + 1,
            valor: 10,
          })
        ).status,
        'aprovado'
      );
      assert.equal(
        (
          await sql(
            'SELECT publicado FROM pagamento_eventos WHERE pedido_id=?',
            [id + 1]
          )
        )[0].publicado,
        0
      );
      console.log(
        'Broker offline: cobrança persistida, resposta síncrona e outbox pendente OK'
      );
    } else if (modo === 'recuperado') {
      await esperar(
        async () =>
          (
            await sql(
              'SELECT publicado FROM pagamento_eventos WHERE pedido_id=?',
              [id + 1]
            )
          )[0].publicado === 1
      );
      await esperar(
        async () =>
          (
            await sql('SELECT status FROM estoque_reservas WHERE pedido_id=?', [
              id + 1,
            ])
          )[0].status === 'baixada'
      );
      assert.deepEqual(
        (
          await sql('SELECT saldo,reservado FROM estoque WHERE produto_id=?', [
            id,
          ])
        )[0],
        { saldo: 3, reservado: 0 }
      );
      await publicar(id);
      await new Promise((r) => setTimeout(r, 500));
      assert.equal(
        (await sql('SELECT * FROM notificacoes WHERE pedido_id=?', [id]))
          .length,
        1
      );
      console.log(
        'Reconexão real: outbox publicada, baixa e consumidor notificação recuperados OK'
      );
    } else throw new Error('modo inválido');
  }
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
