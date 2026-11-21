import type { Checkout, ResultadoCheckout } from '../ports';
import type {
  FinalizarCompraPorta,
  PedidoRepositorio,
  EstoqueApi,
  PagamentoApi,
} from '../ports';
import { Pedido, STATUS } from '../../domain/pedido';

// RF05 - Finalizar compra:
// 1. le nome e preco dos produtos (mock, sem servico de Catalogo na demo)
// 2. cria o pedido para obter o id
// 3. reserva estoque (REST, precisa de resposta imediata - ADR-0003);
//    se a reserva falhar o pedido e apagado, como manda o RF05
// 4. dispara a cobranca no Pagamento
class FinalizarCompra implements FinalizarCompraPorta {
  private readonly pedidoRepositorio: PedidoRepositorio;
  private readonly estoqueApi: EstoqueApi;
  private readonly pagamentoApi: PagamentoApi;

  constructor({
    pedidoRepositorio,
    estoqueApi,
    pagamentoApi,
  }: {
    pedidoRepositorio: PedidoRepositorio;
    estoqueApi: EstoqueApi;
    pagamentoApi: PagamentoApi;
  }) {
    this.pedidoRepositorio = pedidoRepositorio;
    this.estoqueApi = estoqueApi;
    this.pagamentoApi = pagamentoApi;
  }

  async executar({
    clienteId,
    itens,
    simularRecusa,
  }: Checkout): Promise<ResultadoCheckout> {
    const produtos = await this.pedidoRepositorio.buscarProdutos(
      itens.map((i) => i.produtoId)
    );
    const porId = new Map(produtos.map((p) => [p.id, p]));

    const itensDoPedido = itens.map((item) => {
      const produto = porId.get(item.produtoId);
      if (!produto) {
        throw Pedido.erro(404, `produto ${item.produtoId} nao encontrado`);
      }
      // copia de nome e preco no momento da compra (ADR-0002)
      return {
        produtoId: produto.id,
        nomeProduto: produto.nome,
        precoUnitario: produto.preco,
        quantidade: item.quantidade,
      };
    });

    // 2. cria o pedido para ter o id (a reserva fica vinculada a ele)
    const pedido = Pedido.criar({ clienteId, itens: itensDoPedido });
    const pedidoId = await this.pedidoRepositorio.inserir(pedido);
    await this.pedidoRepositorio.inserirItens(pedidoId, itensDoPedido);

    // 3. reserva de estoque com o id do pedido (RF05/ADR-0003)
    const reserva = await this.estoqueApi.reservar(pedidoId, itensDoPedido);
    if (!reserva.ok) {
      // RF05: item esgotou -> o pedido nao e criado e o cliente e informado
      await this.pedidoRepositorio.remover(pedidoId);
      throw Pedido.erro(409, reserva.motivo || 'estoque insuficiente');
    }

    // 4. cobranca sincrona; o Pagamento publica o resultado como evento (ADR-0003)
    const cobranca = await this.pagamentoApi.cobrar(pedidoId, pedido.total, {
      simularRecusa,
    });

    return {
      pedidoId,
      status: STATUS.AGUARDANDO_PAGAMENTO,
      total: pedido.total,
      pagamentoSolicitado: cobranca.status,
    };
  }
}

export = FinalizarCompra;
