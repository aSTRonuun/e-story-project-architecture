const Cobranca = require('../../domain/cobranca');

// RF06 - Pagar pedido:
// 1. pede autorizacao ao gateway (porta de saida, adaptavel - RNF02)
// 2. grava a cobranca
// 3. publica o resultado como evento (ADR-0003)
class CobrarPedido {
  constructor({ cobrancaRepositorio, gatewayPagamento, eventosPublicador }) {
    this.cobrancaRepositorio = cobrancaRepositorio;
    this.gatewayPagamento = gatewayPagamento;
    this.eventosPublicador = eventosPublicador;
  }

  async executar({ pedidoId, valor, simularRecusa = false }) {
    const autorizacao = await this.gatewayPagamento.autorizar(valor, { simularRecusa });

    const cobranca = new Cobranca({ pedidoId, valor, status: autorizacao.aprovado ? 'aprovada' : 'recusada' });
    cobranca.id = await this.cobrancaRepositorio.inserir(cobranca);

    const evento = autorizacao.aprovado ? 'pagamento.aprovado' : 'pagamento.recusado';
    await this.eventosPublicador.publicar(evento, {
      evento: autorizacao.aprovado ? 'PagamentoAprovado' : 'PagamentoRecusado',
      pedidoId,
      valor,
      data: new Date().toISOString(),
    });

    return { cobrancaId: cobranca.id, status: autorizacao.aprovado ? 'aprovado' : 'recusado' };
  }
}

module.exports = CobrarPedido;
