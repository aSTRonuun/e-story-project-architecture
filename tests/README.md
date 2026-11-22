# tests/ — Testes

## Locais (a partir da raiz, exigem `npm run build` antes)

```bash
npm test            # build + test:types + test:unit
npm run test:types  # contratos de tipos (tests/tipos/)
npm run test:unit   # unidade.cjs + migracao.cjs
```

- `unidade.cjs` — testes de domínio/casos de uso com `node:test`.
- `migracao.cjs` — verifica dependências hexagonais (domain/application sem
  `any`, sem importar infraestrutura) via AST do TypeScript.
- `tipos/tsconfig.json` + `tipos/contratos.ts` — compilam os contratos
  de tipos dos serviços.

## Integração (exige o stack no ar: `docker compose up -d --build`)

```bash
docker compose run --rm --no-deps -v "$PWD:/projeto:ro" pagamento node /projeto/tests/integracao.cjs
```

Usa MySQL e RabbitMQ dos contêineres e as APIs via nomes de serviço;
rode `npm run build` no host antes de montar o repositório.

## Recuperação (ambiente de demonstração — usa o broker do projeto)

```bash
docker cp tests/recuperacao.cjs loja-pagamento:/tmp/recuperacao.cjs
docker compose exec -T pagamento node /tmp/recuperacao.cjs preparar
docker compose restart estoque pagamento notificacao
# aguardar os servidores escutarem
docker compose exec -T pagamento node /tmp/recuperacao.cjs reinicio
docker compose stop rabbitmq
docker compose exec -T pagamento node /tmp/recuperacao.cjs offline
docker compose start rabbitmq
# aguardar RabbitMQ saudável e reconexão dos consumidores
docker compose exec -T pagamento node /tmp/recuperacao.cjs recuperado
docker compose restart pedidos
```
