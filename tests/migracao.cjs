const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const { join, resolve } = require('node:path');
const ts = require('../src/pagamento/node_modules/typescript');
const Encaminhar = require('../src/gateway/dist/application/usecases/encaminhar-checkout');
const Finalizar = require('../src/pedidos/dist/application/usecases/finalizar-compra');
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
