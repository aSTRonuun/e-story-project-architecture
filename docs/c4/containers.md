# C4 — Diagrama de Container (nível 2)

Abre a caixa "Loja Virtual" do [diagrama de Contexto](contexto.md): o front-end, o API Gateway, os seis serviços e o broker de mensagens, com as pessoas e os sistemas externos ao redor.

Base nas decisões:

- [ADR-0001](../adr/0001-estilo-arquitetural.md): SOA; cada serviço usa Clean + Hexagonal.
- [ADR-0002](../adr/0002-fronteiras-dos-servicos.md): Catálogo, Estoque, Pedidos (com carrinho), Pagamento, Notificação e Identidade.
- [ADR-0003](../adr/0003-comunicacao-entre-servicos.md): REST para comandos com resposta imediata, eventos para resultado do pagamento e notificações, API Gateway único.

## Versão C4 nativa do Mermaid

Usa a sintaxe `C4Container`, que o GitHub renderiza. O Mermaid to Excalidraw **não** converte esse tipo; para o Excalidraw use a versão em `flowchart` abaixo.

```mermaid
C4Container
    title Diagrama de Container - Loja Virtual

    Person(visitante, "Visitante", "Navega e busca produtos sem login")
    Person(cliente, "Cliente", "Visitante autenticado. Compra e acompanha pedidos")
    Person(admin, "Administrador", "Gerencia catálogo e estoque")

    System_Boundary(loja, "Loja Virtual") {
        Container(front, "Front-end Web", "A definir", "Interface de busca, carrinho, checkout, acompanhamento de pedidos e administração")
        Container(gateway, "API Gateway", "A definir", "Ponto único de entrada. Valida o token, roteia e compõe produto + disponibilidade (RF02)")

        Container(identidade, "Identidade", "A definir", "Cadastro, login e emissão de token (RF03). Fora da demonstração")
        Container(catalogo, "Catálogo", "A definir", "Produtos, categorias e busca (RF01, RF02, RF09). Mínimo na demonstração")
        Container(estoque, "Estoque", "A definir", "Saldo, reserva, baixa e liberação com controle de concorrência (RF10)")
        Container(pedidos, "Pedidos", "A definir", "Carrinho, checkout e ciclo de vida dos pedidos (RF04, RF05, RF07)")
        Container(pagamento, "Pagamento", "A definir", "Cobrança do pedido por porta de saída para o gateway (RF06)")
        Container(notificacao, "Notificação", "A definir", "Reage a mudanças de status e envia ao cliente (RF08)")

        ContainerQueue(broker, "Broker de mensagens", "A definir", "Eventos entre serviços")
    }

    System_Ext(pagamentoExt, "Gateway de Pagamento", "Sistema externo simulado. Autoriza ou recusa pagamentos")
    System_Ext(notificacaoExt, "Serviço de Notificação", "Sistema externo simulado. Envia e-mail ou push")

    Rel(visitante, front, "Usa", "HTTPS")
    Rel(cliente, front, "Usa", "HTTPS")
    Rel(admin, front, "Usa", "HTTPS")
    Rel(front, gateway, "Chama a API", "HTTPS/JSON")

    Rel(gateway, identidade, "Valida token e autentica", "REST")
    Rel(gateway, catalogo, "Busca produtos e detalhes", "REST")
    Rel(gateway, estoque, "Consulta disponibilidade e ajusta estoque", "REST")
    Rel(gateway, pedidos, "Carrinho, checkout e consulta de pedidos", "REST")

    Rel(pedidos, estoque, "Reserva estoque", "REST")
    Rel(pedidos, catalogo, "Lê nome e preço do produto", "REST")
    Rel(pedidos, pagamento, "Inicia a cobrança", "REST")

    Rel(pagamento, pagamentoExt, "Solicita a cobrança")
    Rel(notificacao, notificacaoExt, "Envia notificações")

    Rel(pagamento, broker, "Publica PagamentoAprovado e PagamentoRecusado", "Evento")
    Rel(pedidos, broker, "Publica PedidoStatusAlterado", "Evento")
    Rel(broker, pedidos, "Entrega resultado do pagamento", "Evento")
    Rel(broker, estoque, "Entrega resultado do pagamento (baixa ou libera reserva)", "Evento")
    Rel(broker, notificacao, "Entrega mudança de status", "Evento")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## Versão em flowchart (para o Excalidraw)

Mesmo conteúdo. Linha sólida é chamada REST e linha tracejada é evento via broker.

```mermaid
flowchart LR
    Visitante["Visitante"]
    Cliente["Cliente"]
    Admin["Administrador"]

    subgraph LV["Loja Virtual"]
        Front["Front-end Web"]
        GW["API Gateway"]

        subgraph SVC["Serviços (Clean + Hexagonal)"]
            Identidade["Identidade"]
            Catalogo["Catálogo"]
            Estoque["Estoque"]
            Pedidos["Pedidos (com carrinho)"]
            Pagamento["Pagamento"]
            Notificacao["Notificação"]
        end

        Broker(["Broker de mensagens"])
    end

    PagExt["Gateway de Pagamento (externo simulado)"]
    NotExt["Serviço de Notificação (externo simulado)"]

    Visitante -->|"HTTPS"| Front
    Cliente -->|"HTTPS"| Front
    Admin -->|"HTTPS"| Front
    Front -->|"HTTPS/JSON"| GW

    GW -->|"valida token"| Identidade
    GW -->|"busca produtos"| Catalogo
    GW -->|"disponibilidade e ajuste"| Estoque
    GW -->|"carrinho e pedidos"| Pedidos

    Pedidos -->|"reserva estoque"| Estoque
    Pedidos -->|"lê nome e preço"| Catalogo
    Pedidos -->|"inicia cobrança"| Pagamento

    Pagamento -->|"solicita cobrança"| PagExt
    Notificacao -->|"envia notificações"| NotExt

    Pagamento -.->|"PagamentoAprovado / Recusado"| Broker
    Pedidos -.->|"PedidoStatusAlterado"| Broker
    Broker -.->|"resultado do pagamento"| Pedidos
    Broker -.->|"baixa ou libera reserva"| Estoque
    Broker -.->|"mudança de status"| Notificacao
```

## Observações

- **Demonstração:** Pedidos, Estoque, Pagamento e Notificação são implementados. Catálogo é mínimo, com dados de exemplo, e Identidade fica só no diagrama (ADR-0002). Vale marcar isso na versão final do C4 para manter o código consistente com os diagramas (RNF05).
- **Dados:** cada serviço é dono dos seus dados (ADR-0002), mas o desenho físico (um banco por serviço ou compartilhado) ainda está em aberto e por isso não há bancos no diagrama.
- **Tecnologias:** front-end, gateway, serviços e broker estão como "A definir" até a escolha da stack.
- **Quem consome o resultado do pagamento:** o diagrama mostra Pedidos (atualiza o status) e Estoque (baixa ou libera a reserva) consumindo o evento. Isso depende da decisão de reserva de estoque e pode mudar.
- **Retorno do gateway externo:** a seta para o Gateway de Pagamento não mostra a volta da resposta, porque essa decisão ainda está em aberto.
