// RF08 - Reagir a mudanca de status do pedido (evento pedido.status.alterado).
// Falha no envio NAO afeta o pedido (RF08) - aqui so registramos o envio.
// Consumidor idempotente (entrega pode ser repetida).
class NotificarMudancaStatus {
  constructor({ notificacaoRepositorio, canalEnvio }) {
    this.notificacaoRepositorio = notificacaoRepositorio;
    this.canalEnvio = canalEnvio;
    this.processados = new Set();
  }

  async executar({ evento, pedidoId, status }) {
    const chave = `${evento}:${pedidoId}:${status}`;
    if (this.processados.has(chave)) return;
    this.processados.add(chave);

    const notificacao = {
      pedidoId,
      canal: 'email',
      mensagem: `Seu pedido ${pedidoId} mudou para "${status}"`,
      enviadoEm: new Date().toISOString(),
    };

    try {
      await this.canalEnvio.enviar(notificacao);
      notificacao.id = await this.notificacaoRepositorio.inserir(notificacao);
    } catch (erro) {
      // RF08: falha no envio nao derruba o fluxo; registra e segue.
      console.error(`[notificacao] falha ao enviar aviso do pedido ${pedidoId}:`, erro.message);
    }
  }
}

module.exports = NotificarMudancaStatus;
