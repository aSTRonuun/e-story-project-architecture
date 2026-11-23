const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const { join, resolve } = require('node:path');
const ts = require('../src/pagamento/node_modules/typescript');
const Encaminhar = require('../src/gateway/dist/application/usecases/encaminhar-checkout');
const ConsultarPedidoGateway = require('../src/gateway/dist/application/usecases/consultar-pedido');
const ConsultarNotificacoesGateway = require('../src/gateway/dist/application/usecases/consultar-notificacoes');
const Finalizar = require('../src/pedidos/dist/application/usecases/finalizar-compra');
const ConsultarPedido = require('../src/pedidos/dist/application/usecases/consultar-pedido');
const Processar = require('../src/pedidos/dist/application/usecases/processar-resultado-pagamento');
function arquivos(pasta) {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? arquivos(join(pasta, e.name)) : [join(pasta, e.name)]
  );
}
for (const servico of [
  'gateway',
  'pedidos',
  'estoque',
  'pagamento',
  'notificacao',
]) {
  test(`${servico}: domínio e aplicação respeitam as dependências hexagonais`, () => {
    for (const camada of ['domain', 'application']) {
      for (const arquivo of arquivos(
        resolve(__dirname, '..', 'src', servico, camada)
      )) {
        assert.ok(arquivo.endsWith('.ts'), arquivo);
        const fonte = ts.createSourceFile(
          arquivo,
          readFileSync(arquivo, 'utf8'),
          ts.ScriptTarget.Latest,
          true
        );
        function visitar(no) {
          assert.notEqual(
            no.kind,
            ts.SyntaxKind.AnyKeyword,
            `${arquivo}: any explícito`
          );
          let dependencia;
          if (ts.isImportDeclaration(no)) dependencia = no.moduleSpecifier.text;
          if (
            ts.isImportEqualsDeclaration(no) &&
            ts.isExternalModuleReference(no.moduleReference)
          )
            dependencia = no.moduleReference.expression.text;
          if (dependencia) {
            assert.ok(
              dependencia.startsWith('.'),
              `${arquivo}: depende de biblioteca externa ${dependencia}`
            );
            assert.doesNotMatch(
              dependencia,
              /adapters|infrastructure/,
              arquivo
            );
            if (camada === 'domain')
              assert.doesNotMatch(dependencia, /application/, arquivo);
          }
          ts.forEachChild(no, visitar);
        }
        visitar(fonte);
      }
    }
  });
}
test('Gateway normaliza a requisição e encaminha pela porta substituta', async () => {
  let recebida;
  const caso = new Encaminhar({
    pedidosApi: {
      criarPedido: async (requisicao) => {
        recebida = requisicao;
        return { status: 201, corpo: { pedidoId: 7 } };
      },
    },
  });
  assert.deepEqual(
    await caso.executar({
      clienteId: 'cliente-1',
      itens: [{ produtoId: 1, quantidade: '2' }],
    }),
    { status: 201, corpo: { pedidoId: 7 } }
  );
  assert.deepEqual(recebida.itens, [{ produtoId: 1, quantidade: 2 }]);
});
test('Pedidos consulta pedido e itens apenas para o cliente correspondente', async () => {
  let consultado;
  const caso = new ConsultarPedido({
    pedidoRepositorio: {
      buscarPorIdDoCliente: async (id, clienteId) => {
        consultado = { id, clienteId };
        return {
          id,
          cliente_id: clienteId,
          status: 'Pago',
          total: '99.95',
          criado_em: new Date('2026-11-22T10:00:00Z'),
          atualizado_em: new Date('2026-11-22T10:01:00Z'),
          itens: [
            {
              produto_id: 1,
              nome_produto: 'Teclado',
              preco_unitario: '99.95',
              quantidade: 1,
            },
          ],
        };
      },
    },
  });
  assert.deepEqual(await caso.executar(12, 'cliente-1'), {
    pedidoId: 12,
    clienteId: 'cliente-1',
    status: 'Pago',
    total: 99.95,
    criadoEm: new Date('2026-11-22T10:00:00Z'),
    atualizadoEm: new Date('2026-11-22T10:01:00Z'),
    itens: [
      {
        produtoId: 1,
        nome: 'Teclado',
        precoUnitario: 99.95,
        quantidade: 1,
      },
    ],
  });
  assert.deepEqual(consultado, { id: 12, clienteId: 'cliente-1' });
});
test('Pedidos oculta pedidos inexistentes ou de outro cliente', async () => {
  const caso = new ConsultarPedido({
    pedidoRepositorio: { buscarPorIdDoCliente: async () => null },
  });
  await assert.rejects(caso.executar(12, 'outro-cliente'), { status: 404 });
});
test('Gateway encaminha consulta de pedido sem acessar os serviços diretamente', async () => {
  let recebido;
  const caso = new ConsultarPedidoGateway({
    pedidosApi: {
      buscarPedido: async (id, clienteId) => {
        recebido = { id, clienteId };
        return { status: 200, corpo: { pedidoId: id } };
      },
    },
  });
  assert.deepEqual(await caso.executar(12, 'cliente-1'), {
    status: 200,
    corpo: { pedidoId: 12 },
  });
  assert.deepEqual(recebido, { id: 12, clienteId: 'cliente-1' });
});
test('Gateway valida o dono antes de encaminhar a consulta de notificações', async () => {
  let pedidosConsultados = 0;
  let notificacoesConsultadas = 0;
  const caso = new ConsultarNotificacoesGateway({
    pedidosApi: {
      buscarPedido: async () => {
        pedidosConsultados++;
        return { status: 404, corpo: { erro: 'pedido nao encontrado' } };
      },
    },
    notificacoesApi: {
      listarPorPedido: async () => {
        notificacoesConsultadas++;
        return { status: 200, corpo: { notificacoes: [] } };
      },
    },
  });
  assert.deepEqual(await caso.executar(12, 'outro-cliente'), {
    status: 404,
    corpo: { erro: 'pedido nao encontrado' },
  });
  assert.equal(pedidosConsultados, 1);
  assert.equal(notificacoesConsultadas, 0);
});
test('Gateway devolve notificações depois de validar o pedido do cliente', async () => {
  const chamadas = [];
  const caso = new ConsultarNotificacoesGateway({
    pedidosApi: {
      buscarPedido: async (id, clienteId) => {
        chamadas.push(['pedido', id, clienteId]);
        return { status: 200, corpo: { pedidoId: id } };
      },
    },
    notificacoesApi: {
      listarPorPedido: async (id) => {
        chamadas.push(['notificacoes', id]);
        return { status: 200, corpo: { notificacoes: [{ pedidoId: id }] } };
      },
    },
  });
  assert.deepEqual(await caso.executar(12, 'cliente-1'), {
    status: 200,
    corpo: { notificacoes: [{ pedidoId: 12 }] },
  });
  assert.deepEqual(chamadas, [
    ['pedido', 12, 'cliente-1'],
    ['notificacoes', 12],
  ]);
});
test('Pedidos preserva sequência REST e não altera estado pela resposta de pagamento', async () => {
  const chamadas = [];
  const caso = new Finalizar({
    pedidoRepositorio: {
      buscarProdutos: async () => [{ id: 1, nome: 'Teclado', preco: '99.95' }],
      inserir: async () => {
        chamadas.push('pedido');
        return 7;
      },
      inserirItens: async () => {
        chamadas.push('itens');
      },
      atualizarStatus: async () => {
        throw new Error('estado síncrono não permitido');
      },
    },
    estoqueApi: {
      reservar: async () => {
        chamadas.push('reserva');
        return { ok: true };
      },
    },
    pagamentoApi: {
      cobrar: async () => {
        chamadas.push('cobrança');
        return { status: 'aprovado' };
      },
    },
  });
  assert.deepEqual(
    await caso.executar({
      clienteId: 'cliente-1',
      itens: [{ produtoId: 1, quantidade: 2 }],
    }),
    {
      pedidoId: 7,
      status: 'Aguardando pagamento',
      total: 199.9,
      pagamentoSolicitado: 'aprovado',
    }
  );
  assert.deepEqual(chamadas, ['pedido', 'itens', 'reserva', 'cobrança']);
});
test('Pedidos remove pedido quando a porta de estoque recusa e não cobra', async () => {
  let removido;
  const caso = new Finalizar({
    pedidoRepositorio: {
      buscarProdutos: async () => [{ id: 1, nome: 'Mouse', preco: 10 }],
      inserir: async () => 7,
      inserirItens: async () => {},
      remover: async (id) => {
        removido = id;
      },
    },
    estoqueApi: {
      reservar: async () => ({ ok: false, motivo: 'estoque_insuficiente' }),
    },
    pagamentoApi: {
      cobrar: async () => {
        throw new Error('não deve cobrar');
      },
    },
  });
  await assert.rejects(
    caso.executar({
      clienteId: 'cliente-1',
      itens: [{ produtoId: 1, quantidade: 1 }],
    }),
    { status: 409 }
  );
  assert.equal(removido, 7);
});
for (const aprovado of [true, false])
  test(`Pedidos reage ao evento ${aprovado ? 'aprovado' : 'recusado'} por portas`, async () => {
    const estados = [],
      eventos = [];
    const caso = new Processar({
      pedidoRepositorio: {
        buscarPorId: async () => ({ status: 'Aguardando pagamento' }),
        atualizarStatus: async (id, status) => estados.push(status),
      },
      eventosPublicador: {
        publicar: async (key, msg) => eventos.push({ key, msg }),
      },
    });
    const evento = {
      evento: aprovado ? 'PagamentoAprovado' : 'PagamentoRecusado',
      pedidoId: 7,
    };
    await caso.executar(evento);
    await caso.executar(evento);
    assert.deepEqual(estados, aprovado ? ['Pago'] : []);
    assert.equal(eventos.length, 1);
    assert.equal(eventos[0].key, 'pedido.status.alterado');
    assert.equal(
      eventos[0].msg.status,
      aprovado ? 'Pago' : 'Aguardando pagamento'
    );
  });
