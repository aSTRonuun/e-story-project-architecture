const { CanalEnvio } = require('../../application/ports');

// Adaptador de saida: servico EXTERNO de notificacao SIMULADO (RNF02).
// Trocar por um provedor real (e-mail/push) nao altera dominio nem caso de uso.
class CanalEnvioMock extends CanalEnvio {
  async enviar(notificacao) {
    await new Promise((r) => setTimeout(r, 50)); // simula latencia do provedor
    console.log(`[notificacao] >> enviando ${notificacao.canal} para pedido ${notificacao.pedidoId}: ${notificacao.mensagem}`);
    return { ok: true };
  }
}

module.exports = CanalEnvioMock;
