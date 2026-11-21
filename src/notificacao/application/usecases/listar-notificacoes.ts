import type { ListarNotificacoesPorta, NotificacaoRepositorio } from '../ports';
// Caso de uso de leitura: lista as notificacoes enviadas (usado na demostracao).
class ListarNotificacoes implements ListarNotificacoesPorta {
  private readonly notificacaoRepositorio: NotificacaoRepositorio;

  constructor({
    notificacaoRepositorio,
  }: {
    notificacaoRepositorio: NotificacaoRepositorio;
  }) {
    this.notificacaoRepositorio = notificacaoRepositorio;
  }

  async executar() {
    return this.notificacaoRepositorio.listar();
  }
}

export = ListarNotificacoes;
