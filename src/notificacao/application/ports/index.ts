import type Notificacao = require('../../domain/notificacao');
export interface Aviso {
  pedidoId: number;
  canal: 'email' | 'push';
  mensagem: string;
  enviadoEm: string;
}
export interface NotificacaoRepositorio {
  enviarUmaVez(
    chave: string,
    notificacao: Aviso,
    enviar: () => Promise<void>
  ): Promise<void>;
  listar(pedidoId?: number): Promise<Notificacao[]>;
}
export interface CanalEnvio {
  enviar(notificacao: Aviso & { chave?: string }): Promise<{ ok: boolean }>;
}
export interface NotificarMudancaStatusPorta {
  executar(dados: unknown): Promise<void>;
}
export interface ListarNotificacoesPorta {
  executar(pedidoId?: number): Promise<Notificacao[]>;
}
