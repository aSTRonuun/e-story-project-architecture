# src

Código-fonte da loja virtual em Docker: as 5 APIs da demonstração (gateway, pedidos, estoque, pagamento, notificação), cada uma com um único endpoint e estrutura hexagonal (ADR-0001), cobrindo o fluxo RF05 → RF06 → RF08 com RF10 de suporte. O init do MySQL fica em `src/mysql/init/`.
