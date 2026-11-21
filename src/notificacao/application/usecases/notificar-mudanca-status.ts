import { registro } from '../../domain/erro';
import type { Aviso } from '../ports';
import type {
  NotificarMudancaStatusPorta,
  NotificacaoRepositorio,
  CanalEnvio,
} from '../ports';
class NotificarMudancaStatus implements NotificarMudancaStatusPorta {
  private readonly notificacaoRepositorio: NotificacaoRepositorio;
  private readonly canalEnvio: CanalEnvio;

  constructor({
    notificacaoRepositorio,
    canalEnvio,
  }: {
    notificacaoRepositorio: NotificacaoRepositorio;
    canalEnvio: CanalEnvio;
  }) {
    this.notificacaoRepositorio = notificacaoRepositorio;
    this.canalEnvio = canalEnvio;
  }
  async executar(dados: unknown) {
    const { evento, pedidoId, status, motivo } = registro(dados) ? dados : {};
    if (
      evento !== 'PedidoStatusAlterado' ||
      typeof pedidoId !== 'number' ||
      !Number.isInteger(pedidoId) ||
      pedidoId <= 0 ||
      pedidoId > 2147483647 ||
      typeof status !== 'string' ||
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
    const notificacao: Aviso = {
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
export = NotificarMudancaStatus;
