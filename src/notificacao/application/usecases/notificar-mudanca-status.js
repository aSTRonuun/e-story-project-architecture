class NotificarMudancaStatus {
  constructor({ notificacaoRepositorio, canalEnvio }) {
    Object.assign(this, { notificacaoRepositorio, canalEnvio });
  }
  async executar(dados) {
    const { evento, pedidoId, status, motivo } = dados || {};
    if (
      evento !== 'PedidoStatusAlterado' ||
      !Number.isInteger(pedidoId) ||
      pedidoId <= 0 ||
      pedidoId > 2147483647 ||
      ![
        'Aguardando pagamento',
        'Pago',
        'Cancelado',
        'Enviado',
        'Entregue',
      ].includes(status) ||
      (motivo !== undefined &&
        (typeof motivo !== 'string' || motivo.length > 120))
    )
      throw Object.assign(new Error('evento de status invalido'), {
        status: 400,
      });
    // Chave de efeito estável: independe do timestamp e sobrevive ao reinício.
    const chave = JSON.stringify([pedidoId, status, motivo || '']);
    const notificacao = {
      pedidoId,
      canal: 'email',
      mensagem: `Seu pedido ${pedidoId} mudou para "${status}"${motivo ? `: ${motivo}` : ''}`,
      enviadoEm: new Date().toISOString(),
    };
    await this.notificacaoRepositorio.enviarUmaVez(
      chave,
      notificacao,
      async () => {
        const resultado = await this.canalEnvio.enviar({
          ...notificacao,
          chave,
        });
        if (!resultado?.ok) throw new Error('envio nao confirmado');
      }
    );
  }
}
module.exports = NotificarMudancaStatus;
