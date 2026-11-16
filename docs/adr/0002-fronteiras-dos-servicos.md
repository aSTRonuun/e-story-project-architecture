# ADR-0002: Fronteiras dos serviços

- **Status:** Aceito
- **Data:** 2026-11-16
- **Decisores:** equipe do projeto
- **Depende de:** [ADR-0001](0001-estilo-arquitetural.md)

## Contexto

Com SOA decidido (ADR-0001), é preciso definir quais serviços existem, o que cada um possui e o que entra na demonstração. O critério de corte é **capacidade de negócio + dono do dado**: cada serviço é o único responsável pelos seus dados, e outros serviços só os acessam por contrato.

## Decisão

### Serviços

| Serviço | Responsabilidade | RFs | Dado próprio |
|---|---|---|---|
| **Catálogo** | Produtos, categorias, busca, ativar/desativar produto | RF01, RF02, RF09 | Produtos |
| **Estoque** | Saldo, reserva, baixa e liberação, com controle de concorrência | RF10 (apoia RF05, RF06) | Saldos e reservas |
| **Pedidos** | Carrinho, checkout, ciclo de vida e consulta de pedidos | RF04, RF05, RF07 | Carrinhos e pedidos |
| **Pagamento** | Cobrança, acessando o gateway por porta de saída | RF06 | Transações de pagamento |
| **Notificação** | Reação a mudanças de status e envio por porta de saída | RF08 | Registro de envios |
| **Identidade** | Cadastro, login e emissão de token | RF03 | Clientes e credenciais |

### Escolhas de desenho

- **Estoque é separado do Catálogo.** O estoque é o ponto de concorrência (RNF03, RF10) e muda em ritmo e com requisitos diferentes do cadastro de produtos. O Catálogo não guarda quantidade.
- **Carrinho fica dentro de Pedidos.** O checkout (RF05) transforma carrinho em pedido; mantê-los no mesmo serviço evita uma chamada distribuída no passo mais sensível do fluxo. O carrinho é um módulo/agregado distinto dentro de Pedidos e pode ser extraído depois sem mudar o contrato externo.
- **Pedidos guarda cópia dos dados do produto** (nome e preço) no momento da compra, preservando o histórico mesmo se o produto for desativado (RF09).
- **Identidade é um serviço no diagrama C4.** Se a autenticação será própria ou delegada fica para o ADR de autenticação.

### Escopo

- **Diagramas C4:** os 6 serviços aparecem em Contexto e Container.
- **Implementação na demonstração:** **Pedidos, Estoque, Pagamento e Notificação**, mais um **Catálogo mínimo** com dados de exemplo, cobrindo o fluxo RF04 → RF05 → RF06 → RF08 com RF10 de suporte.
- **Identidade:** apenas no diagrama; a demonstração usa um cliente fixo ou token simulado.

## Consequências

**Positivas**
- Cada serviço tem dono claro e dado próprio, o que facilita desenhar Componentes e Código.
- Estoque isolado concentra a solução do problema de concorrência (RNF03) em um único lugar.
- O fluxo principal exercita quatro serviços e portas de saída reais (persistência, gateway, notificação), sem implementar o que não é demonstrado.

**Negativas / custos**
- Exibir "disponível/indisponível" (RF02) e validar quantidade no carrinho (RF04) exigem consultar o Estoque, via Catálogo ou composição; a forma depende da decisão de comunicação entre serviços.
- O fluxo RF05 → RF06 cruza Pedidos, Estoque e Pagamento sem transação local; o tratamento de falhas e compensações depende das decisões de reserva de estoque e de comunicação.
- O C4 documenta mais serviços do que o código implementa (Catálogo parcial, Identidade ausente); isso deve estar sinalizado nos diagramas para manter a consistência exigida em RNF05.

## Alternativas consideradas

- **Carrinho como serviço próprio:** separação mais pura, mas o checkout passaria a depender de comunicação entre dois serviços. Descartada pelo custo e pelo prazo.
- **Estoque dentro do Catálogo:** menos um serviço, mas mistura cadastro com controle de concorrência. Descartada.
- **Identidade como sistema externo:** simplifica o desenho, mas foi preferido mostrá-la como serviço; a decisão própria vs delegada continua aberta.
- **Implementar os 6 serviços:** maior fidelidade ao C4, com risco para o prazo de 01/12.

## Pontos em aberto

- Comunicação entre serviços e API Gateway/BFF.
- Reserva de estoque e retorno do gateway.
- Autenticação (própria ou delegada).
- Quem compõe a visão "produto + disponibilidade" (RF02).
