# Diagrama de casos de uso

Atores e casos de uso da Loja Virtual (RF01 a RF10). O Mermaid não tem diagrama de casos de uso nativo, então foi escrito como `flowchart`: atores são retângulos, casos de uso são elipses (formato estádio) e a fronteira do sistema é o `subgraph`. Esse formato é aceito pelo Mermaid to Excalidraw.

```mermaid
flowchart LR
    Visitante["Visitante"]
    Cliente["Cliente"]
    Admin["Administrador"]
    Gateway["Gateway de Pagamento"]
    Notif["Serviço de Notificação"]

    subgraph LV["Loja Virtual"]
        UC01(["RF01 - Buscar produtos"])
        UC02(["RF02 - Ver detalhes do produto"])
        UC03(["RF03 - Cadastrar e autenticar"])
        UC04(["RF04 - Gerenciar carrinho"])
        UC05(["RF05 - Finalizar compra"])
        UC06(["RF06 - Pagar pedido"])
        UC07(["RF07 - Acompanhar pedidos"])
        UC08(["RF08 - Receber notificações"])
        UC09(["RF09 - Gerenciar catálogo"])
        UC10(["RF10 - Controlar estoque"])
    end

    Cliente -. "é um" .-> Visitante

    Visitante --- UC01
    Visitante --- UC02
    Visitante --- UC03

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

## Observações

- **Cliente herda de Visitante:** o Cliente é um Visitante autenticado, então também pode buscar produtos e ver detalhes (RF01, RF02). A herança evita repetir essas ligações.
- **Fluxo principal da demonstração:** RF04, RF05, RF06 e RF08, com RF10 de suporte.
- **Atores externos:** Gateway de Pagamento e Serviço de Notificação são simulados e ficam ligados apenas aos casos de uso em que participam (RF06 e RF08).
