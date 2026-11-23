import './test-setup';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

function jsonResponse(
  body: object,
  status = 201
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
});

const originalFetch = globalThis.fetch;

function stubFetch(
  ...responses: Array<Response | Error>
): Array<{ input: RequestInfo | URL; init?: RequestInit }> {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const response = responses.shift();
    if (response instanceof Error) throw response;
    if (!response) throw new Error('No mocked response configured');
    return response;
  };
  return calls;
}

describe('loja miolo', () => {
  it('filtra a vitrine por categoria e texto de busca', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Som' }));
    assert.equal(screen.getAllByRole('article').length, 1);
    assert.ok(screen.getByRole('heading', { name: 'Headset' }));

    await user.click(screen.getByRole('button', { name: 'Tudo' }));
    await user.type(screen.getByRole('textbox', { name: 'Buscar objetos' }), 'webcam');
    assert.equal(screen.getAllByRole('article').length, 1);
    assert.ok(screen.getByRole('heading', { name: 'Webcam' }));
  });

  it('adiciona itens, altera quantidades e atualiza o total', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Adicionar Mouse à sacola' }));
    await user.click(screen.getByRole('button', { name: 'Aumentar quantidade de Mouse' }));
    await user.click(screen.getByRole('button', { name: 'Adicionar Teclado à sacola' }));

    const cart = within(document.getElementById('sacola')!);
    assert.ok(cart.getByRole('heading', { name: 'A sacola (3)' }));
    assert.ok(cart.getByText('R$ 199,75'));

    await user.click(cart.getByRole('button', { name: 'Diminuir quantidade de Mouse' }));
    assert.ok(cart.getByRole('heading', { name: 'A sacola (2)' }));
    assert.ok(cart.getByText('R$ 149,85'));
  });

  it('configura a forma demonstrativa e chama o Gateway ao finalizar', async () => {
    const user = userEvent.setup();
    const fetchCalls = stubFetch(
      jsonResponse({
        pedidoId: 321,
        status: 'Aguardando pagamento',
        total: 99.95,
        pagamentoSolicitado: 'aprovado',
      })
    );
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Adicionar Teclado à sacola' }));
    await user.type(
      screen.getByRole('textbox', { name: /Um nome para o pedido/ }),
      'Alex Silva'
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: /Forma de pagamento/ }),
      'pix'
    );
    assert.equal(fetchCalls.length, 0);
    await user.click(screen.getByRole('button', { name: 'finalizar pedido' }));

    assert.ok(await screen.findByRole('heading', { name: 'Pedido recebido!' }));
    assert.ok(screen.getByText('#321'));
    assert.ok(screen.getByText('Pix', { selector: 'strong' }));
    assert.deepEqual(fetchCalls[0], {
      input: '/api/checkout',
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clienteId: 'alex-silva',
          itens: [{ produtoId: 1, quantidade: 1 }],
          simularRecusa: false,
        }),
      },
    });
    assert.ok(screen.getByText('Aguardando pagamento'));
  });

  it('mostra um popup amigável para reserva inválida e mantém a sacola', async () => {
    const user = userEvent.setup();
    stubFetch(jsonResponse({ erro: 'estoque_insuficiente' }, 409));
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Adicionar Teclado à sacola' }));
    await user.click(screen.getByRole('button', { name: 'finalizar pedido' }));

    const popup = await screen.findByRole('alertdialog');
    assert.match(popup.textContent || '', /ficaram sem estoque disponível/);
    assert.match(popup.textContent || '', /A sacola foi mantida/);
    assert.ok(
      within(document.getElementById('sacola')!).getByRole('heading', {
        name: 'A sacola (1)',
      })
    );

    await user.click(within(popup).getByRole('button', { name: 'revisar sacola' }));
    assert.equal(screen.queryByRole('alertdialog'), null);
    assert.ok(screen.getByRole('heading', { name: 'A sacola (1)' }));
  });

  it('permite tentar novamente após corrigir uma falha de estoque', async () => {
    const user = userEvent.setup();
    const fetchCalls = stubFetch(
      jsonResponse({ erro: 'estoque_insuficiente' }, 409),
        jsonResponse({
          pedidoId: 322,
          status: 'Aguardando pagamento',
          total: 49.9,
          pagamentoSolicitado: 'aprovado',
        })
    );
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Adicionar Mouse à sacola' }));
    await user.click(screen.getByRole('button', { name: 'finalizar pedido' }));
    const popup = await screen.findByRole('alertdialog');
    await user.click(within(popup).getByRole('button', { name: /tentar novamente/ }));

    assert.ok(await screen.findByRole('heading', { name: 'Pedido recebido!' }));
    assert.ok(screen.getByText('#322'));
    assert.equal(fetchCalls.length, 2);
  });

  it('fecha o popup de erro com Escape e preserva os itens', async () => {
    const user = userEvent.setup();
    stubFetch(jsonResponse({ erro: 'estoque_insuficiente' }, 409));
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Adicionar Teclado à sacola' }));
    await user.click(screen.getByRole('button', { name: 'finalizar pedido' }));
    await screen.findByRole('alertdialog');
    await user.keyboard('{Escape}');

    assert.equal(screen.queryByRole('alertdialog'), null);
    assert.ok(screen.getByRole('heading', { name: 'A sacola (1)' }));
  });

  it('mostra erro de validação do backend sem limpar os itens', async () => {
    const user = userEvent.setup();
    stubFetch(jsonResponse({ erro: 'quantidade invalida' }, 400));
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Adicionar Webcam à sacola' }));
    await user.click(screen.getByRole('button', { name: 'finalizar pedido' }));

    const popup = await screen.findByRole('alertdialog');
    assert.match(popup.textContent || '', /Confira os produtos e as quantidades/);
    assert.ok(screen.getByRole('heading', { name: 'A sacola (1)' }));
  });

  it('avisa quando não consegue conectar ao Gateway e mantém os itens', async () => {
    const user = userEvent.setup();
    stubFetch(new TypeError('Failed to fetch'));
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Adicionar Headset à sacola' }));
    await user.click(screen.getByRole('button', { name: 'finalizar pedido' }));

    const popup = await screen.findByRole('alertdialog');
    assert.match(popup.textContent || '', /Não foi possível conectar à loja/);
    assert.ok(screen.getByRole('heading', { name: 'A sacola (1)' }));
  });

  it('trata pagamento recusado como resposta do checkout, não como erro de conexão', async () => {
    const user = userEvent.setup();
    stubFetch(
        jsonResponse({
          pedidoId: 323,
          status: 'Aguardando pagamento',
          total: 149.9,
          pagamentoSolicitado: 'recusado',
        })
    );
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Adicionar Headset à sacola' }));
    await user.click(screen.getByRole('button', { name: 'finalizar pedido' }));

    assert.ok(await screen.findByRole('heading', { name: 'Pedido recebido!' }));
    assert.ok(screen.getByText('#323'));
    assert.ok(screen.getByText('recusado'));
    assert.equal(screen.queryByRole('alertdialog'), null);
  });

  it(
    'consulta o pedido e exibe a notificação recebida pelo Gateway',
    { timeout: 10000 },
    async () => {
    const user = userEvent.setup();
    const calls = stubFetch(
      jsonResponse({
        pedidoId: 324,
        status: 'Aguardando pagamento',
        total: 99.95,
        pagamentoSolicitado: 'aprovado',
      }),
      jsonResponse({ status: 'Pago' }),
      jsonResponse({
        notificacoes: [
          {
            id: 8,
            pedidoId: 324,
            canal: 'email',
            mensagem: 'Seu pedido 324 mudou para "Pago"',
            enviadoEm: '2026-11-22T20:00:00.000Z',
          },
        ],
      })
    );
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Adicionar Teclado à sacola' }));
    await user.type(
      screen.getByRole('textbox', { name: /Um nome para o pedido/ }),
      'Alex'
    );
    await user.click(screen.getByRole('button', { name: 'finalizar pedido' }));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    });
    assert.equal(calls.length, 3, JSON.stringify(calls.map((call) => call.input)));
    const notice = screen.getByText('Seu pedido 324 mudou para "Pago"');
    assert.ok(notice);
    assert.ok(screen.getByText('Pago'));
    assert.equal(calls.length, 3);
    assert.match(String(calls[1].input), /\/api\/pedidos\/324\?clienteId=alex/);
    assert.match(
      String(calls[2].input),
      /\/api\/notificacoes\?pedidoId=324&clienteId=alex/
    );
    }
  );
});
