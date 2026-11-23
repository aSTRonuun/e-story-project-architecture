export interface CheckoutEntrada {
  clienteId: string;
  itens: { produtoId: number; quantidade: number | string }[];
  simularRecusa?: boolean;
}
export interface CheckoutNormalizado {
  clienteId: string;
  itens: { produtoId: number; quantidade: number }[];
  simularRecusa: boolean;
}
export interface RespostaHttp {
  status: number;
  corpo: unknown;
}
export interface PedidosApi {
  criarPedido(requisicao: CheckoutNormalizado): Promise<RespostaHttp>;
  buscarPedido(id: number, clienteId: string): Promise<RespostaHttp>;
}
export interface NotificacoesApi {
  listarPorPedido(pedidoId: number): Promise<RespostaHttp>;
}
export interface EncaminharCheckoutPorta {
  executar(dados: CheckoutEntrada): Promise<RespostaHttp>;
}
export interface ConsultarPedidoPorta {
  executar(id: number, clienteId: string): Promise<RespostaHttp>;
}
export interface ConsultarNotificacoesPorta {
  executar(pedidoId: number, clienteId: string): Promise<RespostaHttp>;
}
