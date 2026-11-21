// Erros e guardas puros; sem dependência do transporte HTTP ou de bibliotecas.
export function erro(
  status: number,
  mensagem: string
): Error & { status: number } {
  return Object.assign(new Error(mensagem), { status });
}
export function registro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}
export function mensagemErro(valor: unknown): string {
  return valor instanceof Error ? valor.message : String(valor);
}
export function statusErro(valor: unknown): number {
  return registro(valor) && typeof valor.status === 'number'
    ? valor.status
    : 500;
}
