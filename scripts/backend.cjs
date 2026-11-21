const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const tarefas = {
  install: ['ci'],
  build: ['run', 'build'],
  typecheck: ['run', 'typecheck'],
};
const argumentos = tarefas[process.argv[2]];
if (!argumentos) throw new Error('Use install, build ou typecheck');
for (const servico of [
  'gateway',
  'pedidos',
  'estoque',
  'pagamento',
  'notificacao',
]) {
  console.log(`\n[${servico}]`);
  const resultado = spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    argumentos,
    {
      cwd: resolve(__dirname, '..', 'src', servico),
      stdio: 'inherit',
    }
  );
  if (resultado.error) throw resultado.error;
  if (resultado.status !== 0) process.exit(resultado.status ?? 1);
}
