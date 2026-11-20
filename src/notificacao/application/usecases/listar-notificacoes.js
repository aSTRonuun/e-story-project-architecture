// Caso de uso de leitura: lista as notificacoes enviadas (usado na demostracao).
class ListarNotificacoes {
  constructor({ notificacaoRepositorio }) {
    this.notificacaoRepositorio = notificacaoRepositorio;
  }

  async executar() {
    return this.notificacaoRepositorio.listar();
  }
}

module.exports = ListarNotificacoes;
