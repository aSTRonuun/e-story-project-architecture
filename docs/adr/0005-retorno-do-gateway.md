# ADR-0005: Retorno do gateway de pagamento

- **Status:** Aceito
- **Data:** 2026-11-21
- **Decisores:** equipe do projeto
- **Depende de:** [ADR-0003](0003-comunicacao-entre-servicos.md), [ADR-0004](0004-reserva-de-estoque.md)

## Contexto

O README deixava em aberto (RF06) se o retorno do gateway de pagamento é **síncrono** ou **por evento**. O ADR-0003 já definia o padrão misto (REST para comandos com resposta imediata, eventos para fatos ocorridos) e previa que o evento `Pagamento*` seria publicado pelo serviço de Pagamento em qualquer caso.

## Decisão

**Híbrido: resposta síncrona + evento publicado.**

1. **Síncrono:** o serviço de Pedidos chama o Pagamento (`POST /cobrancas`) e recebe de volta o status imediato da cobrança (`aprovado` ou `recusado`) — é a resposta imediata de que a cobrança foi disparada.
2. **Assíncrono:** o serviço de Pagamento **sempre publica** o resultado como evento no broker (`pagamento.aprovado` ou `pagamento.recusado`), independentemente da resposta síncrona.
3. **O estado final do pedido e do estoque muda apenas pelo evento:** quem consome é quem aplica a mudança (Pedidos muda o status; Estoque baixa ou libera). A resposta síncrona não é usada para atualizar estado — evita dois caminhos concorrentes para a mesma mudança.

O gateway externo é **simulado** por um adaptador de saída (`GatewayPagamentoMock`), trocável sem tocar no domínio (RNF02). Na demo, `simularRecusa: true` força o caminho da recusa.

## Consequências

**Positivas**
- O checkout recebe resposta imediata (a cobrança foi aceita), atendendo à necessidade de resposta do RF05/RF06.
- Um único caminho de mudança de estado (o evento), o que simplifica idempotência e raciocínio sobre consistência.
- RNF02 preservado: o gateway continua atrás de uma porta de saída.

**Negativas / custos**
- O estado final é eventualmente consistente: há alguns milissegundos entre a resposta síncrona e o evento aplicado (visível na demo como status "Aguardando pagamento" antes de virar "Pago").
- Mensagens repetidas ou fora de ordem continuam possíveis; os consumidores são idempotentes (ADR-0003).

## Alternativas consideradas

- **Somente síncrono:** Pedidos atualizaria o estado pela resposta HTTP e o evento seria redundante; dois caminhos para a mesma mudança, com risco de divergência. Descartada.
- **Somente evento:** o checkout não saberia se a cobrança foi aceita imediatamente, contrariando a necessidade de resposta do RF06. Descartada.
