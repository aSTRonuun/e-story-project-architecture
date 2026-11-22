# scripts/ — Orquestração do backend

`backend.cjs` roda uma tarefa nos cinco serviços (`gateway`, `pedidos`,
`estoque`, `pagamento`, `notificacao`), um por vez, e aborta no primeiro
erro. É o motor dos scripts do `package.json` da raiz:

```bash
npm run install:services   # npm ci em cada serviço
npm run build              # gera src/<servico>/dist
npm run typecheck          # tsc --noEmit nos cinco serviços
```

Uso direto (mesmo resultado):

```bash
node scripts/backend.cjs install    # ou: build | typecheck
```

Qualquer outro argumento lança erro: `Use install, build ou typecheck`.
