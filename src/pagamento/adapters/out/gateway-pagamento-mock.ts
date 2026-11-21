import type { GatewayPagamento } from '../../application/ports';

// Adaptador de saida: gateway de pagamento EXTERNO SIMULADO (RNF02).
// Trocar esta classe por um gateway real nao altera dominio nem caso de uso.
// Aprova sempre, exceto quando simularRecusa = true (usado para demostrar o caminho da recusa).
class GatewayPagamentoMock implements GatewayPagamento {
  async autorizar(
    _valor: number,
    { simularRecusa = false }: { simularRecusa?: boolean } = {}
  ) {
    await new Promise((r) => setTimeout(r, 100)); // simula latencia da rede
    return { aprovado: !simularRecusa };
  }
}

export = GatewayPagamentoMock;
