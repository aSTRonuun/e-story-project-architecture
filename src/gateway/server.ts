// Bootstrap do servico.
import config = require('./infrastructure/config');
import { criarApp } from './infrastructure/container';

criarApp().listen(config.porta, () => {
  console.log(`[gateway] escutando na porta ${config.porta}`);
});
