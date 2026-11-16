# Diagrama de casos de uso

Atores e funcionalidades da Loja Virtual (RF01 a RF10). O Mermaid não tem diagrama de casos de uso nativo, então foi escrito como `flowchart`: atores são retângulos e funcionalidades são elipses (formato estádio). Esse formato é aceito pelo Mermaid to Excalidraw.

```mermaid
flowchart LR
    Visitante["Visitante"]
    Cliente["Cliente"]
    Admin["Administrador"]
    Gateway["Gateway de Pagamento"]
    Notif["Serviço de Notificação"]

    UC01(["Buscar produtos"])
    UC02(["Ver detalhes do produto"])
    UC03(["Cadastrar e autenticar"])
    UC04(["Gerenciar carrinho"])
    UC05(["Finalizar compra"])
    UC06(["Pagar pedido"])
    UC07(["Acompanhar pedidos"])
    UC08(["Receber notificações"])
    UC09(["Gerenciar catálogo"])
    UC10(["Controlar estoque"])

    Visitante --- UC01
    Visitante --- UC02
    Visitante --- UC03

    Cliente --- UC01
    Cliente --- UC02
    Cliente --- UC04
    Cliente --- UC05
    Cliente --- UC06
    Cliente --- UC07
    Cliente --- UC08

    Admin --- UC09
    Admin --- UC10

    Gateway --- UC06
    Notif --- UC08
```

## Correspondência com os requisitos

| Funcionalidade | Requisito |
|---|---|
| Buscar produtos | RF01 |
| Ver detalhes do produto | RF02 |
| Cadastrar e autenticar | RF03 |
| Gerenciar carrinho | RF04 |
| Finalizar compra | RF05 |
| Pagar pedido | RF06 |
| Acompanhar pedidos | RF07 |
| Receber notificações | RF08 |
| Gerenciar catálogo | RF09 |
| Controlar estoque | RF10 |
