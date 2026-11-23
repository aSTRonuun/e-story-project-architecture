# src/ — Backend

Cinco APIs Node.js + TypeScript (`strict: true`, CommonJS, Node 20), cada uma
com `tsconfig.json`, `package.json` e lockfile próprios. Padrão hexagonal:
`domain/`, `application/` (casos de uso + portas), `adapters/in` e
`adapters/out`, `infrastructure/` (config e composição).

| Pasta | Serviço | Porta | Endpoint |
|---|---|---|---|
| `gateway/` | API Gateway | 3000 | `POST /checkout`, `GET /pedidos/:id`, `GET /notificacoes` |
| `pedidos/` | Pedidos | 3001 | `POST /pedidos`, `GET /pedidos/:id?clienteId=...` |
| `estoque/` | Estoque | 3002 | `POST /reservas` |
| `pagamento/` | Pagamento | 3003 | `POST /cobrancas` |
| `notificacao/` | Notificação | 3004 | `GET /notificacoes?pedidoId=...` |
| `mysql/init/` | schema + seed (executados na 1ª subida do MySQL) | — | — |

## Rodar tudo (Docker, a partir da raiz do repositório)

```bash
docker compose up -d --build   # compila TS e sobe MySQL, RabbitMQ e as 5 APIs
docker compose down            # para preservando o volume MySQL
```

## Rodar um serviço fora do Docker

```bash
npm --prefix src/<servico> ci
npm --prefix src/<servico> run build
MYSQL_HOST=127.0.0.1 MYSQL_PORT=3307 npm --prefix src/<servico> start
```

Desenvolvimento: `npm --prefix src/<servico> run dev` (recompila) em um
terminal e `npm --prefix src/<servico> run dev:serve` em outro (reinicia).
O primeiro `build` deve existir antes do `dev:serve`. Não rode a versão
local e a do Docker na mesma porta ao mesmo tempo.

Variáveis de ambiente (valores padrão em `infrastructure/config.ts`):
`PORT`, `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`,
`MYSQL_DATABASE`, `RABBITMQ_HOST`, `RABBITMQ_PORT`, `RABBITMQ_USER`,
`RABBITMQ_PASSWORD`, `PEDIDOS_URL`, `ESTOQUE_URL`, `PAGAMENTO_URL`,
`NOTIFICACAO_URL`. No Docker elas já vêm do `docker-compose.yml`
(MySQL exposto na host na porta 3307).
