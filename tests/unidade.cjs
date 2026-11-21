const { test } = require('node:test');
const assert = require('node:assert/strict');
const Reservar = require('../src/estoque/application/usecases/reservar-estoque');
const Aplicar = require('../src/estoque/application/usecases/aplicar-resultado-pagamento');
const Cobrar = require('../src/pagamento/application/usecases/cobrar-pedido');
const Notificar = require('../src/notificacao/application/usecases/notificar-mudanca-status');
const Item = require('../src/estoque/domain/item-estoque');
for (const dados of [
  null,
  {},
  { pedidoId: 0, itens: [] },
  { pedidoId: 1, itens: [{ produtoId: 1, quantidade: -1 }] },
  { pedidoId: 1, itens: [{ produtoId: 1, quantidade: 1.5 }] },
  { pedidoId: 1, itens: [{ produtoId: '1', quantidade: 1 }] },
])
  test(`reserva rejeita ${JSON.stringify(dados)}`, async () => {
    const caso = new Reservar({ estoqueRepositorio: {} });
    await assert.rejects(caso.executar(dados), { status: 400 });
  });
test('reserva agrupa produtos repetidos e ordena locks', async () => {
  const caso = new Reservar({
    estoqueRepositorio: { reservar: async (id, itens) => ({ id, itens }) },
  });
  assert.deepEqual(
    await caso.executar({
      pedidoId: 1,
      itens: [
        { produtoId: 2, quantidade: 1 },
        { produtoId: 1, quantidade: 1 },
        { produtoId: 2, quantidade: 2 },
      ],
    }),
    {
      id: 1,
      itens: [
        { produtoId: 1, quantidade: 1 },
        { produtoId: 2, quantidade: 3 },
      ],
    }
  );
});
test('evento desconhecido não libera estoque', async () => {
  await assert.rejects(
    new Aplicar({ estoqueRepositorio: {} }).executar({
      pedidoId: 1,
      evento: 'outro',
    }),
    { status: 400 }
  );
});
test('entidade impede movimentos negativos e acima da reserva', () => {
  const item = new Item({ produtoId: 1, saldo: 2, reservado: 1 });
  assert.equal(item.podeReservar(-1), false);
  assert.throws(() => item.baixar(2));
  assert.throws(() => item.liberar(-1));
  item.baixar(1);
  assert.equal(item.saldo, 1);
  assert.equal(item.reservado, 0);
});
for (const dados of [
  null,
  {},
  { pedidoId: 1, valor: 0 },
  { pedidoId: 1, valor: NaN },
  { pedidoId: 1, valor: 1.111 },
  { pedidoId: 1, valor: 1, simularRecusa: 'true' },
])
  test(`cobrança rejeita ${JSON.stringify(dados)}`, async () => {
    await assert.rejects(new Cobrar({}).executar(dados), { status: 400 });
  });
test('falha do gateway se propaga para rollback do adaptador', async () => {
  const caso = new Cobrar({
    cobrancaRepositorio: {
      obterOuCriar: async (c, s, autorizar) => autorizar(),
    },
    gatewayPagamento: {
      autorizar: async () => {
        throw new Error('gateway indisponivel');
      },
    },
  });
  await assert.rejects(
    caso.executar({ pedidoId: 1, valor: 10 }),
    /gateway indisponivel/
  );
});
test('falha na publicação preserva resultado síncrono já persistido', async () => {
  const caso = new Cobrar({
    cobrancaRepositorio: {
      obterOuCriar: async () => ({ id: 2, status: 'aprovada' }),
      publicarPendentes: async () => {
        throw new Error('broker indisponivel');
      },
    },
  });
  assert.deepEqual(await caso.executar({ pedidoId: 1, valor: 10 }), {
    cobrancaId: 2,
    status: 'aprovado',
  });
});
test('notificação propaga falha para o consumidor tentar novamente', async () => {
  const caso = new Notificar({
    notificacaoRepositorio: { enviarUmaVez: async (k, n, enviar) => enviar() },
    canalEnvio: {
      enviar: async () => {
        throw new Error('falha de envio');
      },
    },
  });
  await assert.rejects(
    caso.executar({
      evento: 'PedidoStatusAlterado',
      pedidoId: 1,
      status: 'Pago',
    }),
    /falha de envio/
  );
});
test('notificação rejeita evento inválido', async () => {
  await assert.rejects(new Notificar({}).executar({}), { status: 400 });
});
for (const servico of ['estoque', 'notificacao'])
  for (const modo of [
    'sucesso',
    'transitorio',
    'invalido',
    'esgotado',
    'falha-publicar',
  ])
    test(`${servico}: consumidor ${modo} confirma ou preserva mensagem`, async () => {
      let callback,
        acks = 0,
        nacks = 0,
        destino;
      const canal = {
        assertQueue: async () => {},
        bindQueue: async () => {},
        prefetch: async () => {},
        consume: async (f, cb) => {
          callback = cb;
        },
        ack: () => acks++,
        nack: (msg, multiple, requeue) => {
          assert.equal(requeue, true);
          nacks++;
        },
        sendToQueue: (fila, body, opcoes, cb) => {
          destino = fila;
          cb(modo === 'falha-publicar' ? new Error('broker caiu') : null);
        },
      };
      const caso = {
        executar: async () => {
          if (modo !== 'sucesso')
            throw Object.assign(new Error('falha simulada'), {
              status: modo === 'invalido' ? 400 : 500,
            });
        },
      };
      const consumir = require(
        servico === 'estoque'
          ? '../src/estoque/adapters/in/consumidor-resultado-pagamento'
          : '../src/notificacao/adapters/in/consumidor-mudanca-status'
      );
      await consumir({
        canal,
        fila: 'teste',
        aplicarResultadoPagamento: caso,
        notificarMudancaStatus: caso,
      });
      await callback({
        content: Buffer.from(JSON.stringify({ evento: 'PagamentoAprovado' })),
        fields: { routingKey: 'pagamento.aprovado' },
        properties: { headers: { tentativas: modo === 'esgotado' ? 3 : 0 } },
      });
      if (modo === 'falha-publicar') {
        assert.equal(acks, 0);
        assert.equal(nacks, 1);
      } else {
        assert.equal(acks, 1);
        assert.equal(nacks, 0);
        if (modo !== 'sucesso')
          assert.equal(
            destino,
            modo === 'transitorio' ? 'teste.retry' : 'teste.erro'
          );
      }
    });
