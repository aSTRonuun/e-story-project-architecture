import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkoutErrorMessage } from './checkout-error';

describe('checkoutErrorMessage', () => {
  it('explica que a reserva de estoque falhou e preserva a sacola', () => {
    assert.match(
      checkoutErrorMessage(409, 'estoque_insuficiente'),
      /ficaram sem estoque disponível/
    );
  });

  it('orienta revisar um produto removido do catálogo', () => {
    assert.match(
      checkoutErrorMessage(404, 'produto 99 nao encontrado'),
      /não está mais disponível/
    );
  });

  it('orienta corrigir os dados rejeitados', () => {
    assert.match(
      checkoutErrorMessage(400, 'quantidade invalida'),
      /Confira os produtos e as quantidades/
    );
  });

  it('indica indisponibilidade temporária dos serviços', () => {
    assert.match(
      checkoutErrorMessage(503, 'serviço indisponível'),
      /temporariamente indisponível/
    );
  });

  it('orienta verificar a conexão quando o Gateway não responde', () => {
    assert.match(
      checkoutErrorMessage(undefined, undefined),
      /conectar à loja/
    );
  });
});
