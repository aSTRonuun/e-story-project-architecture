// Configuracao do servico (infraestrutura). Vem toda do ambiente (docker compose).
const config = {
  porta: Number(process.env.PORT || 3003),
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'root',
    database: process.env.MYSQL_DATABASE || 'loja_virtual',
  },
  rabbitmq: {
    url: `amqp://${process.env.RABBITMQ_USER || 'loja'}:${process.env.RABBITMQ_PASSWORD || 'loja'}@${process.env.RABBITMQ_HOST || 'localhost'}:${process.env.RABBITMQ_PORT || 5672}`,
    exchange: 'loja.eventos',
  },
};

module.exports = config;
