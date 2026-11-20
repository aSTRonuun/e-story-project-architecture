// Configuracao do servico (infraestrutura). Vem toda do ambiente (docker compose).
const config = {
  porta: Number(process.env.PORT || 3000),
  urls: {
    pedidos: process.env.PEDIDOS_URL || 'http://localhost:3001',
  },
};

module.exports = config;
