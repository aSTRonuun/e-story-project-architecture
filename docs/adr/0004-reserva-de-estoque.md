# ADR-0004: Reserva de estoque na criação do pedido

- **Status:** Aceito
- **Data:** 2026-11-21
- **Decisores:** equipe do projeto
- **Depende de:** [ADR-0001](0001-estilo-arquitetural.md), [ADR-0002](0002-fronteiras-dos-servicos.md), [ADR-0003](0003-comunicacao-entre-servicos.md)

## Contexto

O README deixava em aberto (RF05/RF06) **quando** o estoque é reservado: na criação do pedido ou após o pagamento. Com os serviços distribuídos (ADR-0002) e a comunicação mista (ADR-0003), essa decisão define quem reage a quais eventos e o que acontece em falha ou expiração.

## Decisão

A reserva acontece **na criação do pedido**, e o ciclo completo é:

1. **Criação (síncrono):** o serviço de Pedidos cria o pedido e chama o Estoque (`POST /reservas`) antes de cobrar. Sem reserva aceita, **o pedido não é criado** e o cliente recebe 409 (RF05).
2. **Pagamento aprovado (evento `pagamento.aprovado`):** o Estoque faz a **baixa definitiva** (saldo −, reservado −); o Pedidos muda o status para "Pago" (RF06).
3. **Pagamento recusado (evento `pagamento.recusado`):** o Estoque **libera** a reserva (reservado −); o pedido permanece "Aguardando pagamento" (RF06).
4. **Expiração:** como a demo não implementa expiração agendada, a reserva recusada é liberada pelo próprio evento; uma expiração por tempo fica fora do escopo da demonstração.

Quem guarda a reserva é o **Estoque** (dono do dado de saldo e reservas), vinculada ao `pedidoId`.

## Consequências

**Positivas**
- RF05 e RF06 ficam cobertos sem transação distribuída: a reserva é o registro que permite baixar ou liberar depois.
- RNF03/RF10 ficam concentrados no Estoque, que valida disponibilidade no ato da reserva.
- O fluxo usa o estilo certo para cada passo: resposta imediata na criação, eventos para o resultado (ADR-0003).

**Negativas / custos**
- Se o pagamento nunca responder (evento perdido), a reserva fica pendente até a expiração — em produção seria necessário um job de expiração (fora da demo).
- Janela entre a criação do pedido e o resultado do pagamento em que o estoque fica reservado para outros clientes.

## Alternativas consideradas

- **Reservar após o pagamento:** reserva exposta a condição de corrida no momento da baixa (dois pagamentos aprovados para o último item). Descartada por RNF03.
- **Reservar sem vincular ao pedido:** não permitiria liberar a reserva em caso de recusa. Descartada.
