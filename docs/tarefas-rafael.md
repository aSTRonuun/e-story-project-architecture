# Tarefas do Rafael — Backend da Loja Virtual

> **Prazo:** domingo 22/11 até 14h · **Stack:** Node.js + Express + RabbitMQ + MySQL, tudo no Docker
> **Estilo:** SOA + Arquitetura Hexagonal (**sem Clean Architecture**) · **1 endpoint por API**
> Repo: `e-story-project-architecture` · pasta do backend: `src/`

---

## 1. Suas 3 APIs

| # | API | Pasta | Endpoint (só 1) | RF |
|---|---|---|---|---|
| 1 | Estoque | `src/estoque` | `POST /reservas` | RF10 (apoia RF05/RF06) |
| 2 | Pagamento | `src/pagamento` | `POST /cobrancas` | RF06 |
| 3 | Notificação | `src/notificacao` | `GET /notificacoes` | RF08 |

> O Josias cria o `docker-compose.yml`, os Dockerfiles e o **esqueleto hexagonal** dos 5 serviços.
> Você implementa o conteúdo das suas 3 pastas.

---

## 2. Padrão de pastas (igual na imagem / ADR-0001)

```
<servico>/
├── domain/                 # entidade principal + regras (zero dependência externa)
│   └── reserva.js | cobranca.js | notificacao.js
├── application/            # caso de uso + portas (interfaces)
│   ├── usecases/           # reservar.js | cobrar.js | registrarEnvio.js
│   └── ports/              # interfaces (Repository, PublicadorEventos, ConsumidorEventos, Gateway...)
├── adapters/
│   ├── in/                 # rota Express (transport layer) + consumidor RabbitMQ
│   └── out/                # MysqlRepository, PublicadorRabbit, HttpCliente (demais APIs)
├── infrastructure/         # config (env), composição (injeção de dependência), bootstrap
└── server.js               # sobe o Express
```

**Regra:** `domain` não importa nada de fora. `application` não importa banco, Rabbit nem Express.
Quem conhece infraestrutura são só os `adapters` (classe adapter para banco, Rabbit e demais APIs).

---

## 3. Contratos

### REST (só 1 endpoint por sua API)

**Estoque — `POST /reservas`**
```json
// requisição
{ "pedidoId": 1, "itens": [ { "produtoId": 1, "quantidade": 2 } ] }

// sucesso
{ "ok": true }

// falha (estoque insuficiente)
{ "ok": false, "motivo": "estoque_insuficiente" }
```
- Reserva com **controle de concorrência**: `UPDATE estoque SET reservado = reservado + ? WHERE produto_id = ? AND (saldo - reservado) >= ?` — se 0 linhas afetadas, recusa (RNF03/RF10).
- **Baixa** e **liberação** da reserva acontecem **via eventos** (abaixo), não via HTTP.

**Pagamento — `POST /cobrancas`**
```json
// requisição
{ "pedidoId": 1, "valor": 199.90, "simularRecusa": false }

// resposta
{ "status": "aprovado" }   // ou { "status": "recusado" }
```
- Cria a cobrança no banco, "fala" com o gateway externo por uma **classe adapter mockada** (RNF02: trocável sem mudar o domínio).
- `simularRecusa: true` → publica `pagamento.recusado` (para demonstrar o caminho da recusa).
- Publica o evento **e** responde síncrono (contrato do ADR-0003 + ADR-0005).

**Notificação — `GET /notificacoes`**
```json
// resposta
{ "notificacoes": [ { "id": 1, "pedidoId": 1, "canal": "email", "mensagem": "...", "enviadoEm": "..." } ] }
```

### RabbitMQ (exchange topic `loja.eventos` — criada pelo Josias no compose)

| Evento | Routing key | Quem publica | Quem consome |
|---|---|---|---|
| Pagamento aprovado | `pagamento.aprovado` | **Pagamento (você)** | Pedidos (Josias), **Estoque (você)** → baixa a reserva |
| Pagamento recusado | `pagamento.recusado` | **Pagamento (você)** | Pedidos (Josias), **Estoque (você)** → libera a reserva |
| Status do pedido mudou | `pedido.status.alterado` | Pedidos (Josias) | **Notificação (você)** → registra o envio mock |

Formato da mensagem (combinar com o Josias):
```json
{ "evento": "PagamentoAprovado", "pedidoId": 1, "valor": 199.90, "data": "2026-11-22T..." }
```
- Filas **durable**, consumo **idempotente** (pode chegar mensagem repetida) — regra do ADR-0003.
- Use `amqplib`.

---

## 4. Banco MySQL (database único `loja_virtual`)

Você cria **3 arquivos** em `src/mysql/init/` (o Josias cria o `001_pedidos.sql`):

- `002_estoque.sql` → tabelas `produtos` e `estoque` + **seed mock** (~5 produtos com saldos)
- `003_pagamento.sql` → tabela `cobrancas`
- `004_notificacao.sql` → tabela `notificacoes`

Cada serviço só acessa as **suas tabelas** (dado lógico por serviço, ADR-0002).

---

## 5. Docker

O Josias monta o compose com: `mysql:8`, `rabbitmq:3-management` (painel em `localhost:15672`) e as 5 APIs nas portas **3000–3004** (a sua: pagamento 3003, notificação 3004, estoque 3002 — confirmar com ele).
Tudo sobe com `docker compose up -d`.

---

## 6. Linha do tempo

| Dia | Tarefa |
|---|---|
| **Sex 20/11** | Seus 3 arquivos de `init.sql` + alinhar contratos REST e eventos com o Josias |
| **Sáb 21/11** | Implementar Estoque, Pagamento e Notificação (hexagonal completo) |
| **Dom 22/11 manhã** | Integração com o fluxo do Josias, `docker compose up`, teste ponta a ponta |
| **Dom 22/11 14h** | Apresentação |

---

## 7. O que você apresenta no domingo

1. **Suas 3 APIs hexagonais** — estrutura domain / application / adapters de cada uma
2. **Eventos no RabbitMQ** — painel `localhost:15672` mostrando `pagamento.aprovado` / `recusado` fluindo
3. **Controle de estoque (RF10/RNF03)** — reserva, baixa e liberação com concorrência
4. **Gateway de pagamento mockado (RNF02)** — adaptador de saída trocável, incluindo o caminho da recusa
5. **Notificação (RF08)** — reagindo ao evento, com `GET /notificacoes` mostrando os envios
6. **Dados mockados** — seed de produtos e estoque rodando no MySQL no Docker

### Roteiro da demo (dividido com o Josias)
| Momento | Quem | O quê |
|---|---|---|
| 1 | Josias | Arquitetura, estrutura de pastas, `docker compose up -d` |
| 2 | Josias | `curl` no `POST /checkout` → pedido de *Aguardando pagamento* → *Pago* |
| 3 | Rafael | Eventos fluindo no painel do RabbitMQ |
| 4 | Rafael | Estoque (reserva → baixa), pagamento mock (aprovado e recusado) e notificação no `GET /notificacoes` |
| 5 | Ambos | Dados mockados no MySQL e conclusão (SOA + hexagonal sem Clean) |

---

## 8. Referências no repo

- `docs/adr/0001-estilo-arquitetural.md` — estrutura hexagonal de cada serviço
- `docs/adr/0002-fronteiras-dos-servicos.md` — o que cada serviço é dono
- `docs/adr/0003-comunicacao-entre-servicos.md` — REST para comandos, eventos para resultados
- `README.md` — RF04 a RF10 e o fluxo da demonstração
