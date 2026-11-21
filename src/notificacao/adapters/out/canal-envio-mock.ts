import type { Aviso } from '../../application/ports';
import type { CanalEnvio } from '../../application/ports';

// Adaptador de saida: servico EXTERNO de notificacao SIMULADO (RNF02).
// Trocar por um provedor real (e-mail/push) nao altera dominio nem caso de uso.
class CanalEnvioMock implements CanalEnvio {
  async enviar(notificacao: Aviso & { chave?: string }) {
    await new Promise((r) => setTimeout(r, 50)); // simula latencia do provedor
    console.log(
      `[notificacao] >> enviando ${notificacao.canal} para pedido ${notificacao.pedidoId}: ${notificacao.mensagem}`
    );
    return { ok: true };
  }
}

export = CanalEnvioMock;
