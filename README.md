# Loja Virtual

Trabalho final de Arquitetura de Software. Sistema de e-commerce documentado com o modelo C4 (Structurizr) e implementado parcialmente.

> Status: em definição. Itens marcados com **[A DEFINIR]** dependem de decisão do grupo.

## Sumário

- [Escopo](#escopo)
- [Atores](#atores)
- [Requisitos funcionais](#requisitos-funcionais)
- [Requisitos não funcionais](#requisitos-não-funcionais)
- [Fluxo principal da demonstração](#fluxo-principal-da-demonstração)
- [Decisões arquiteturais pendentes](#decisões-arquiteturais-pendentes)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Como executar](#como-executar)
- [Equipe e divisão de atividades](#equipe-e-divisão-de-atividades)
- [Calendário](#calendário)

## Escopo

Loja virtual com catálogo, carrinho, pedidos e controle de estoque, com integração de pagamento e notificações. A inspiração em Amazon e Mercado Livre vem da busca, da página de produto, do checkout e do acompanhamento de pedido, mantendo interface minimalista e foco em objetividade.

**Premissa (a validar):** uma única loja, administrada por um perfil interno. Não é um marketplace com vários vendedores.

**Fora de escopo:** avaliações, recomendações, cupons, cálculo de frete real, devoluções e chat.

**Estilo arquitetural:** **[A DEFINIR]** (opções do domínio: Hexagonal, SOA, Clean Architecture).

## Atores

| Ator | Tipo | Descrição |
|---|---|---|
| Visitante | Primário | Navega e busca produtos sem login |
| Cliente | Primário | Visitante autenticado, que compra e acompanha pedidos |
| Administrador | Primário | Gerencia catálogo e estoque |
| Gateway de Pagamento | Externo (simulado) | Autoriza ou recusa pagamentos |
| Serviço de Notificação | Externo (simulado) | Envia e-mail ou push ao cliente |

## Requisitos funcionais

Escritos no padrão **3C** (Card, Conversa, Confirmação).

### RF01: Buscar produtos (Visitante)
- **Card:** Como visitante, quero buscar e filtrar produtos por nome, categoria e faixa de preço, para encontrar o que preciso rapidamente.
- **Conversa:** Busca textual simples ou com índice? Critérios de ordenação?
- **Confirmação:** Dado o termo "caneta", quando busco, então vejo só produtos cujo nome ou descrição o contêm. Dado um filtro de preço, então nenhum item fora da faixa aparece.

### RF02: Ver detalhes do produto (Visitante)
- **Card:** Como visitante, quero ver foto, descrição, preço e disponibilidade, para decidir a compra.
- **Conversa:** Quantas imagens por produto? Exibir a quantidade exata em estoque ou só "disponível/indisponível"?
- **Confirmação:** Dado um produto sem estoque, então a página mostra "indisponível" e desabilita "adicionar ao carrinho".

### RF03: Cadastro e login (Cliente)
- **Card:** Como cliente, quero criar conta e autenticar, para comprar e consultar meus pedidos.
- **Conversa:** Autenticação própria ou delegada (OAuth)? Endereço de entrega fica no cadastro ou no checkout?
- **Confirmação:** Dado um e-mail já cadastrado, então o cadastro é rejeitado. Dadas credenciais inválidas, então o acesso é negado.

### RF04: Gerenciar carrinho (Cliente)
- **Card:** Como cliente, quero adicionar, remover e alterar a quantidade de itens no carrinho, para montar minha compra.
- **Conversa:** O carrinho persiste entre sessões? Adicionar ao carrinho reserva estoque? (sugestão: não)
- **Confirmação:** Dado um item no carrinho, quando altero a quantidade, então o subtotal é recalculado. Dada uma quantidade acima do estoque, então a alteração é rejeitada.

### RF05: Finalizar compra (Cliente) — fluxo principal
- **Card:** Como cliente, quero transformar meu carrinho em um pedido, para efetivar a compra.
- **Conversa:** O estoque é reservado na criação do pedido ou só após o pagamento? Qual o prazo de expiração de pedidos não pagos?
- **Confirmação:** Dado um carrinho válido, quando finalizo, então um pedido com status "Aguardando pagamento" é criado e o estoque é reservado. Dado que um item esgotou nesse intervalo, então o pedido não é criado e o cliente é informado.

### RF06: Pagar pedido (Cliente, Gateway) — fluxo principal
- **Card:** Como cliente, quero pagar meu pedido por um meio de pagamento, para concluir a compra.
- **Conversa:** Quais meios simular (cartão, PIX, boleto)? O retorno do gateway é síncrono ou por evento?
- **Confirmação:** Dado pagamento aprovado, então o pedido passa a "Pago" e o estoque é baixado definitivamente. Dado pagamento recusado, então o pedido permanece pendente e a reserva é mantida até o prazo de expiração, quando é liberada.

### RF07: Acompanhar pedidos (Cliente)
- **Card:** Como cliente, quero ver a lista e o status dos meus pedidos, para saber em que etapa estão.
- **Conversa:** Quais status? (sugestão: Aguardando pagamento, Pago, Enviado, Entregue, Cancelado)
- **Confirmação:** Dado um cliente com pedidos, então ele vê apenas os seus, com o status atual.

### RF08: Receber notificações (Cliente, Serviço de Notificação) — fluxo principal
- **Card:** Como cliente, quero ser avisado quando o status do pedido mudar, para não precisar consultar o sistema.
- **Conversa:** Quais canais? A falha no envio deve bloquear o pedido? (sugestão: não)
- **Confirmação:** Dada uma mudança de status, então uma notificação é enviada. Dada falha no envio, então o pedido não é afetado e há nova tentativa ou registro do erro.

### RF09: Gerenciar catálogo (Administrador)
- **Card:** Como administrador, quero cadastrar, editar e desativar produtos, para manter o catálogo atualizado.
- **Conversa:** Exclusão física ou lógica? (sugestão: lógica, para preservar o histórico de pedidos)
- **Confirmação:** Dado um produto desativado, então ele some da busca, mas continua visível nos pedidos antigos.

### RF10: Controlar estoque (Administrador)
- **Card:** Como administrador, quero ajustar e consultar o estoque, para evitar venda de itens indisponíveis.
- **Conversa:** Como tratar concorrência (dois clientes comprando a última unidade)?
- **Confirmação:** Dado 1 unidade em estoque e dois pedidos simultâneos, então apenas um é aceito.

## Requisitos não funcionais

| ID | Requisito | Verificação |
|---|---|---|
| RNF01 | O domínio não pode depender de framework, banco ou serviços externos (gateway e notificação acessados por interfaces) | Revisão de dependências e testes de domínio sem infraestrutura |
| RNF02 | Pagamento e notificação devem ser substituíveis por simulações | Troca de adaptador sem alterar o domínio |
| RNF03 | Nenhuma venda além do estoque disponível | Teste de concorrência (RF10) |
| RNF04 | Senhas armazenadas com hash | Inspeção do banco |
| RNF05 | Código e diagramas C4 (Structurizr) consistentes | Revisão na entrega de 01/12 |

## Fluxo principal da demonstração

RF01 a RF10 formam o mínimo viável. Para a apresentação, será implementado o fluxo **RF04 → RF05 → RF06 → RF08**, com **RF10** como suporte. Ele exercita portas e adaptadores (pagamento, notificação, persistência) e a comunicação entre componentes.

## Decisões arquiteturais pendentes

Cada decisão deve virar um ADR em `docs/adr/`.

1. **Estilo arquitetural [A DEFINIR]:** Hexagonal, SOA ou Clean Architecture. RNF01 e RNF02 favorecem Hexagonal/Clean. SOA exigiria separar serviços (catálogo, pedidos, estoque, pagamento), aumentando o esforço de implementação.
2. **Reserva de estoque [A DEFINIR]:** na criação do pedido ou após o pagamento (RF05/RF06). É a decisão com maior impacto no desenho.
3. **Retorno do gateway [A DEFINIR]:** síncrono ou por evento (RF06).
4. **Autenticação [A DEFINIR]:** própria ou delegada (RF03).

## Estrutura do repositório

**[A DEFINIR]** Sugestão inicial:

```
.
├── README.md
├── docs/
│   ├── adr/            # registros de decisões arquiteturais
│   └── c4/             # workspace Structurizr (.dsl) e diagramas exportados
└── src/                # código-fonte
```

## Como executar

**[A DEFINIR]** Preencher após a escolha da stack.

## Equipe e divisão de atividades

**[A DEFINIR]**

| Integrante | Responsabilidades |
|---|---|
| | |

## Calendário

| Data | Entrega |
|---|---|
| 16/11 e 17/11 | Equipe alinhada, aplicação e funcionalidades documentadas, estilo arquitetural selecionado, repositório criado, diagramas de Contexto e Container |
| 23/11 e 24/11 | Diagramas de Componentes e Código |
| 01/12, 07/12 e 08/12 | Código rodando, conformidade com os diagramas e apresentação para a turma |