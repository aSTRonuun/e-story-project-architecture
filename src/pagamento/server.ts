// Bootstrap do servico.
import config = require('./infrastructure/config');
import { criarApp } from './infrastructure/container';

criarApp()
  .then((app) => {
    app.listen(config.porta, () => {
      console.log(`[pagamento] escutando na porta ${config.porta}`);
    });
  })
  .catch((erro) => {
    console.error('[pagamento] falha ao iniciar:', erro);
    process.exit(1);
  });
