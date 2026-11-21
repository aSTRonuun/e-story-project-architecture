import type Cobranca = require('../../domain/cobranca');
export type StatusCobranca = 'aprovada' | 'recusada';
export type RoutingPagamento = 'pagamento.aprovado' | 'pagamento.recusado';
export interface EventoPagamento {
  evento: 'PagamentoAprovado' | 'PagamentoRecusado';
  pedidoId: number;
  valor: number;
  data: string;
}
export interface CobrancaPersistida {
  id: number;
  pedido_id: number;
  valor: string | number;
  status: StatusCobranca;
  simular_recusa: number;
  criado_em: Date;
}
export interface EventosPublicador {
  publicar(
    routingKey: RoutingPagamento,
    mensagem: EventoPagamento
  ): Promise<void>;
}
export interface PersistenciaOutbox {
  publicarPendentes(publicador: EventosPublicador): Promise<void>;
}
export interface CobrancaRepositorio extends PersistenciaOutbox {
  obterOuCriar(
    cobranca: Pick<Cobranca, 'pedidoId' | 'valor'>,
    simularRecusa: boolean,
    autorizar: () => Promise<boolean>
  ): Promise<CobrancaPersistida>;
}
export interface GatewayPagamento {
  autorizar(
    valor: number,
    opcoes?: { simularRecusa?: boolean }
  ): Promise<{ aprovado: boolean }>;
}
export interface ResultadoCobranca {
  cobrancaId: number;
  status: 'aprovado' | 'recusado';
}
export interface CobrarPedidoPorta {
  executar(dados: unknown): Promise<ResultadoCobranca>;
}
