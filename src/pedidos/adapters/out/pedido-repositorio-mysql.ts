import type { Pedido, ItemPedido, StatusPedido } from '../../domain/pedido';
import type { PedidoPersistido, ProdutoMock } from '../../application/ports';
type PedidoLinha = RowDataPacket & Omit<PedidoPersistido, 'itens'>;
type ItemLinha = RowDataPacket & PedidoPersistido['itens'][number];
type ProdutoLinha = RowDataPacket & ProdutoMock;
import type {
  Pool,
  PoolConnection,
  RowDataPacket,
  ResultSetHeader,
} from 'mysql2/promise';
import type { PedidoRepositorio } from '../../application/ports';

// Adaptador de saida: persistencia em MySQL.
// Tambem le a tabela de produtos (dados mockados - sem servico de Catalogo na demo).
class PedidoRepositorioMysql implements PedidoRepositorio {
  private readonly pool: Pool;

  constructor({ pool }: { pool: Pool }) {
    this.pool = pool;
  }

  async inserir(pedido: Pedido) {
    const [resultado] = await this.pool.execute<ResultSetHeader>(
      'INSERT INTO pedidos (cliente_id, status, total) VALUES (?, ?, ?)',
      [pedido.clienteId, pedido.status, pedido.total]
    );
    return resultado.insertId;
  }

  async inserirItens(pedidoId: number, itens: ItemPedido[]) {
    for (const item of itens) {
      await this.pool.execute<ResultSetHeader>(
        'INSERT INTO pedido_itens (pedido_id, produto_id, nome_produto, preco_unitario, quantidade) VALUES (?, ?, ?, ?, ?)',
        [
          pedidoId,
          item.produtoId,
          item.nomeProduto,
          item.precoUnitario,
          item.quantidade,
        ]
      );
    }
  }

  async buscarPorId(id: number): Promise<PedidoPersistido | null> {
    const [linhas] = await this.pool.execute<PedidoLinha[]>(
      'SELECT * FROM pedidos WHERE id = ?',
      [id]
    );
    if (linhas.length === 0) return null;
    const linha = linhas[0];
    const [itens] = await this.pool.execute<ItemLinha[]>(
      'SELECT * FROM pedido_itens WHERE pedido_id = ?',
      [id]
    );
    return { ...linha, itens };
  }

  async atualizarStatus(id: number, status: StatusPedido) {
    await this.pool.execute<ResultSetHeader>(
      'UPDATE pedidos SET status = ? WHERE id = ?',
      [status, id]
    );
  }

  // Mock do Catalogo (RF01/RF02 ficam fora da demo): nome e preco vem do seed.
  async buscarProdutos(ids: number[]): Promise<ProdutoMock[]> {
    if (ids.length === 0) return [];
    const marcadores = ids.map(() => '?').join(',');
    const [linhas] = await this.pool.execute<ProdutoLinha[]>(
      `SELECT id, nome, preco FROM produtos WHERE id IN (${marcadores})`,
      ids
    );
    return linhas;
  }

  // Usado quando a reserva de estoque falha (RF05: o pedido nao e criado).
  async remover(pedidoId: number) {
    await this.pool.execute<ResultSetHeader>(
      'DELETE FROM pedidos WHERE id = ?',
      [pedidoId]
    );
  }
}

export = PedidoRepositorioMysql;
