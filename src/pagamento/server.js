// Bootstrap do servico.
const config = require('./infrastructure/config');
const { criarApp } = require('./infrastructure/container');

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
