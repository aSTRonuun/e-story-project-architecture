// Portas de saida do nucleo (interfaces). Cada uma vira uma classe adaptadora.
// Implementacoes: adapters/out/

class NotificacaoRepositorio {
  async inserir(_notificacao) { throw new Error('nao implementado'); }
  async listar() { throw new Error('nao implementado'); }
}

// Servico externo de envio simulado (RNF02: substituivel).
class CanalEnvio {
  async enviar(_notificacao) { throw new Error('nao implementado'); }
}

module.exports = { NotificacaoRepositorio, CanalEnvio };
