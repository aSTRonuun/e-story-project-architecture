# ADR-0003: Comunicação entre serviços e ponto de entrada

- **Status:** Aceito
- **Data:** 2026-11-16
- **Decisores:** equipe do projeto
- **Depende de:** [ADR-0001](0001-estilo-arquitetural.md), [ADR-0002](0002-fronteiras-dos-servicos.md)

## Contexto

Com os serviços definidos (ADR-0002), é preciso decidir como eles conversam entre si e como o cliente (front-end) chega até eles. O fluxo da demonstração (RF04 → RF05 → RF06 → RF08, com RF10 de suporte) mistura passos que exigem resposta imediata (o checkout precisa saber se a reserva de estoque foi aceita) e passos que são reações a algo que já aconteceu (resultado do pagamento, notificação).

Pelo ADR-0001, a comunicação entre serviços é uma **porta de saída** do núcleo de cada serviço: o domínio não conhece o transporte.

## Decisão

### 1. Padrão misto: REST síncrono + eventos assíncronos

| Interação | Estilo | Motivo |
|---|---|---|
| Pedidos → Estoque (reservar) | Síncrono (REST) | O checkout (RF05) precisa da resposta imediata: reserva aceita ou item esgotado |
| Pedidos → Catálogo (nome e preço do produto) | Síncrono (REST) | Dado lido no momento de montar o pedido, que Pedidos copia (ADR-0002) |
| Pedidos → Pagamento (iniciar cobrança) | Síncrono (REST) | A cobrança é disparada pelo checkout |
| Pagamento → resultado (aprovado ou recusado) | Evento | Pedidos atualiza o status e o Estoque baixa ou libera a reserva, sem acoplar os serviços |
| Pedidos → mudança de status | Evento | Notificação reage ao evento; falha no envio não afeta o pedido (RF08) |

Regras:
- **Comandos que precisam de resposta imediata** usam REST. **Fatos que já ocorreram** são publicados como eventos.
- Eventos são nomeados no passado (por exemplo, `PagamentoAprovado`, `PagamentoRecusado`, `PedidoStatusAlterado`) e seus contratos são versionados.
- Consumidores de eventos devem ser **idempotentes**, pois a entrega pode ser repetida.
- Cada serviço acessa os outros apenas por contrato (REST ou evento), nunca pelo banco do outro.
- No código, cada chamada REST de saída e cada publicação ou consumo de evento é uma **porta** com seu adaptador (ADR-0001). Para o consumidor de eventos, o adaptador de entrada traduz a mensagem em chamada a um caso de uso.

### 2. API Gateway único como ponto de entrada

- O front-end fala apenas com o **API Gateway**, que valida o token emitido por Identidade, roteia para os serviços e **compõe a visão "produto + disponibilidade" (RF02)**, juntando dados do Catálogo e do Estoque.
- Assim o Catálogo não depende do Estoque e a validação de token não se repete em cada serviço.
- O Gateway não contém regra de negócio; só roteamento, autenticação e composição de leitura.

## Consequências

**Positivas**
- Cada interação usa o estilo que combina com o seu requisito: resposta imediata no checkout, desacoplamento onde há reação (pagamento e notificação).
- RNF02 é reforçado: Pagamento e Notificação continuam substituíveis por simulações sem mudar os demais serviços.
- RF02 é resolvido sem acoplar Catálogo e Estoque.

**Negativas / custos**
- A demonstração precisa de um **broker de mensagens** e de um API Gateway, componentes além dos quatro serviços.
- Dois estilos de integração aumentam a quantidade de contratos e de adaptadores a implementar e testar.
- O estado do pedido passa a ser **eventualmente consistente** com o resultado do pagamento e o estoque confirmado; é preciso tratar mensagens repetidas, perdidas ou fora de ordem.
- O API Gateway é um ponto único de falha e de entrada; na demonstração isso é aceito.

## Alternativas consideradas

- **Tudo síncrono (REST):** mais simples e sem broker, mas Pedidos chamaria Notificação diretamente e a falha de envio teria de ser tratada para não afetar o pedido.
- **Tudo por eventos:** menor acoplamento, mas o checkout perderia a resposta imediata sobre a reserva e a complexidade aumentaria para o prazo.
- **Front-end acessando cada serviço:** sem componente extra, mas o front conheceria todos os serviços e a validação de token se repetiria.
- **Catálogo compondo a disponibilidade:** sem gateway, mas cria dependência direta entre Catálogo e Estoque.

## Pontos em aberto

- ~~**Reserva de estoque**~~ e ~~**Retorno do gateway de pagamento**~~ — resolvidos nos [ADR-0004](0004-reserva-de-estoque.md) e [ADR-0005](0005-retorno-do-gateway.md).
- **Autenticação** (própria ou delegada) — continua aberta; fora da demonstração.
- ~~**Stack, escolha do broker e formato dos contratos**~~ — stack decidida no [README](../../README.md): Node.js + Express, RabbitMQ (exchange topic `loja.eventos`), MySQL e JSON nos contratos REST e nos eventos.
