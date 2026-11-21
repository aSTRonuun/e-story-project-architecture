// Bootstrap do servico.
const config = require('./infrastructure/config');
const { criarApp } = require('./infrastructure/container');

criarApp().listen(config.porta, () => {
  console.log(`[gateway] escutando na porta ${config.porta}`);
});
