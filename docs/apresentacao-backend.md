# Apresentação — Backend da Loja Virtual (demo 22/11)

> Trabalho final de Arquitetura de Software · SOA + Arquitetura Hexagonal · Node.js + Express + RabbitMQ + MySQL, tudo em Docker
> Equipe: **Josias** e **Rafael**

## 1. O que foi construído

Cinco APIs independentes (SOA), cada uma com **um único endpoint**, cada serviço desenhado em **Arquitetura Hexagonal** (ADR-0001): o domínio não depende de framework, banco nem de outros serviços — tudo entra e sai por **adaptadores**.

```
src/<servico>/
├── domain/           # entidade principal + regras de negócio (zero dependência externa)
├── application/      # caso de uso + portas (interfaces in/out)
├── adapters/
│   ├── in/           # rota Express (transport layer) + consumidor RabbitMQ
│   └── out/          # adaptadores: MySQL, RabbitMQ, demais APIs, gateway mock
└── infrastructure/   # configuração, composição (injeção de dependência), bootstrap
```

| API | Porta | Endpoint | RF |
|---|---|---|---|
| API Gateway | 3000 | `POST /checkout` | ponto de entrada (ADR-0003) |
| Pedidos | 3001 | `POST /pedidos` | RF04, RF05, RF07 |
| Estoque | 3002 | `POST /reservas` | RF10 (apoia RF05/RF06) |
| Pagamento | 3003 | `POST /cobrancas` | RF06 |
| Notificação | 3004 | `GET /notificacoes` | RF08 |

## 2. Comunicação (ADR-0003)

- **REST síncrono** para comandos com resposta imediata: gateway → pedidos → estoque e pagamento.
- **Eventos RabbitMQ** (exchange topic `loja.eventos`) para o resultado — consumidores idempotentes:

| Evento | Publica | Consome |
|---|---|---|
| `pagamento.aprovado` | Pagamento | Pedidos (status → **Pago**), Estoque (**baixa**) |
| `pagamento.recusado` | Pagamento | Pedidos (mantém pendente), Estoque (**libera** reserva) |
| `pedido.status.alterado` | Pedidos | Notificação (registra o envio) |

## 3. Decisões que a demo ilustra

- **Reserva de estoque na criação do pedido** ([ADR-0004](adr/0004-reserva-de-estoque.md)): sem reserva aceita, o pedido não é criado (RF05).
- **Retorno do gateway: síncrono + evento** ([ADR-0005](adr/0005-retorno-do-gateway.md)): a resposta síncrono diz que a cobrança foi disparada; o estado final muda só pelo evento.
- **Gateway externo simulado** (RNF02): `GatewayPagamentoMock` é uma classe adaptadora — trocá-la não toca no domínio.
- **Dados mockados:** seed de 5 produtos e saldos no MySQL; sem Catálogo e sem Identidade no escopo da demo.

## 4. Como rodar

```bash
docker compose up -d
```

- Painel RabbitMQ: http://localhost:15672 (login `loja` / `loja`)
- MySQL: `localhost:3307`, banco `loja_virtual`
- Dados: criados automaticamente pelo `src/mysql/init/` na primeira subida

## 5. Roteiro da demonstração (~10 min)

**Josias — arquitetura e fluxo (5 min)**

1. Estrutura hexagonal de um serviço (`domain`, `application`, `adapters`, `infrastructure`) — destacar que o domínio não importa nada de fora.
2. `docker compose up -d` — 7 containers subindo (MySQL, RabbitMQ e as 5 APIs) com healthcheck.
3. **Checkout completo** — uma chamada só:

```bash
curl -X POST http://localhost:3000/checkout \
  -H 'content-type: application/json' \
  -d '{"clienteId":"cliente-1","itens":[{"produtoId":1,"quantidade":2},{"produtoId":2,"quantidade":1}]}'
```

```json
{ "pedidoId": 3, "status": "Aguardando pagamento", "total": 650, "pagamentoSolicitado": "aprovado" }
```

4. Em seguida, mostrar no banco: o mesmo pedido passa a **`Pago`** e o estoque **baixa** (o evento fez o trabalho).

**Rafael — eventos, estoque, pagamento e notificação (5 min)**

5. **RabbitMQ**: painel mostrando as filas e os eventos `pagamento.aprovado` fluindo.
6. **Estoque**: `SELECT ... FROM estoque` — saldo reservado na reserva, baixado no pagamento aprovado.
7. **Caminhos de falha**:
   - produto sem saldo → `HTTP 409` e **o pedido não é criado** (RF05);
   - `"simularRecusa": true` → cobrança `recusada`, pedido segue "Aguardando pagamento" e a **reserva é liberada**.
8. **Notificação**: `GET http://localhost:3004/notificacoes` mostrando os avisos registrados (RF08).

## 6. Conclusões

- SOA + Hexagonal sem Clean: fronteiras claras, domínio testável sem infraestrutura, externos (banco, RabbitMQ, gateway, notificação) atrás de adaptadores.
- Dois estilos de integração (REST + eventos) cobrindo resposta imediata e desacoplamento — padrão do ADR-0003.
- Tudo orquestrado por um único `docker compose up -d`.
