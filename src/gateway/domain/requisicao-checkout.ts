import { erro } from './erro';
interface CheckoutEntrada {
  clienteId: string;
  itens: { produtoId: number; quantidade: number | string }[];
  simularRecusa?: boolean;
}
class RequisicaoCheckout {
  readonly clienteId: string;
  readonly itens: { produtoId: number; quantidade: number }[];
  readonly simularRecusa: boolean;
  constructor({ clienteId, itens, simularRecusa = false }: CheckoutEntrada) {
    if (!clienteId) throw erro(400, 'clienteId e obrigatorio');
    if (!Array.isArray(itens) || itens.length === 0)
      throw erro(400, 'itens e obrigatorio');
    for (const item of itens) {
      if (!item.produtoId || !(Number(item.quantidade) > 0))
        throw erro(
          400,
          'cada item precisa de produtoId e quantidade maior que zero'
        );
    }
    this.clienteId = clienteId;
    this.itens = itens.map((item) => ({
      produtoId: item.produtoId,
      quantidade: Number(item.quantidade),
    }));
    this.simularRecusa = Boolean(simularRecusa);
  }
  static erro = erro;
}
export = RequisicaoCheckout;
