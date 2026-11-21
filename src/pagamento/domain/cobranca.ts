import { erro } from './erro';
interface DadosCobranca {
  id?: number;
  pedidoId: unknown;
  valor: unknown;
  status?: 'aprovada' | 'recusada';
  criadoEm?: Date | string;
}
class Cobranca {
  id?: number;
  pedidoId: number;
  valor: number;
  status?: 'aprovada' | 'recusada';
  criadoEm?: Date | string;
  constructor({ id, pedidoId, valor, status, criadoEm }: DadosCobranca) {
    if (
      typeof pedidoId !== 'number' ||
      !Number.isInteger(pedidoId) ||
      pedidoId <= 0 ||
      pedidoId > 2147483647 ||
      typeof valor !== 'number' ||
      !Number.isFinite(valor) ||
      valor <= 0 ||
      valor > 99999999.99 ||
      Math.abs(valor * 100 - Math.round(valor * 100)) > 0.00001
    )
      throw erro(400, 'pedidoId e valor invalidos');
    this.id = id;
    this.pedidoId = pedidoId;
    this.valor = valor;
    this.status = status;
    this.criadoEm = criadoEm;
  }
  aprovar(): void {
    this.status = 'aprovada';
  }
  recusar(): void {
    this.status = 'recusada';
  }
}
export = Cobranca;
