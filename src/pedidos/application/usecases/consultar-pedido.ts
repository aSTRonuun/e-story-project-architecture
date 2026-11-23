import type {
  ConsultarPedidoPorta,
  PedidoConsultado,
  PedidoRepositorio,
} from '../ports';
import { Pedido } from '../../domain/pedido';

class ConsultarPedido implements ConsultarPedidoPorta {
  private readonly pedidoRepositorio: PedidoRepositorio;

  constructor({ pedidoRepositorio }: { pedidoRepositorio: PedidoRepositorio }) {
    this.pedidoRepositorio = pedidoRepositorio;
  }

  async executar(id: number, clienteId: string): Promise<PedidoConsultado> {
    if (!Number.isSafeInteger(id) || id <= 0)
      throw Pedido.erro(400, 'pedidoId invalido');
    if (typeof clienteId !== 'string' || clienteId.trim().length === 0)
      throw Pedido.erro(400, 'clienteId e obrigatorio');

    const pedido = await this.pedidoRepositorio.buscarPorIdDoCliente(
      id,
      clienteId
    );
    if (!pedido) throw Pedido.erro(404, 'pedido nao encontrado');

    return {
      pedidoId: pedido.id,
      clienteId: pedido.cliente_id,
      status: pedido.status,
      total: Number(pedido.total),
      criadoEm: pedido.criado_em,
      atualizadoEm: pedido.atualizado_em,
      itens: pedido.itens.map((item) => ({
        produtoId: item.produto_id,
        nome: item.nome_produto,
        precoUnitario: Number(item.preco_unitario),
        quantidade: item.quantidade,
      })),
    };
  }
}

export = ConsultarPedido;
