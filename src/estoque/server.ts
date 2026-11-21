// Bootstrap do servico.
import config = require('./infrastructure/config');
import { criarApp } from './infrastructure/container';

criarApp()
  .then((app) => {
    app.listen(config.porta, () => {
      console.log(`[estoque] escutando na porta ${config.porta}`);
    });
  })
  .catch((erro) => {
    console.error('[estoque] falha ao iniciar:', erro);
    process.exit(1);
  });
