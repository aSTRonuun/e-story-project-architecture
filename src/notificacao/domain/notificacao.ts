interface DadosNotificacao {
  id?: number;
  pedidoId: number;
  canal: 'email' | 'push';
  mensagem: string;
  enviadoEm: Date | string;
}
class Notificacao {
  id?: number;
  pedidoId: number;
  canal: 'email' | 'push';
  mensagem: string;
  enviadoEm: Date | string;
  constructor({ id, pedidoId, canal, mensagem, enviadoEm }: DadosNotificacao) {
    this.id = id;
    this.pedidoId = pedidoId;
    this.canal = canal;
    this.mensagem = mensagem;
    this.enviadoEm = enviadoEm;
  }
}
export = Notificacao;
