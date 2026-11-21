# ADR-0001: Estilo arquitetural — SOA, com Arquitetura Hexagonal em cada serviço

- **Status:** Aceito
- **Data:** 2026-11-16
- **Revisado:** 2026-11-21 — a Clean Architecture foi removida; o estilo passa a ser SOA + Hexagonal
- **Decisores:** equipe do projeto

## Contexto

O README deixava o estilo arquitetural em aberto entre Hexagonal, SOA e Clean Architecture. Os requisitos que pesam na escolha:

- **RNF01:** o domínio não pode depender de framework, banco ou serviços externos.
- **RNF02:** pagamento e notificação devem ser substituíveis por simulações.
- **RNF03 / RF10:** nenhuma venda além do estoque, inclusive sob concorrência.
- O fluxo da demonstração (RF04 → RF05 → RF06 → RF08, com RF10 de suporte) atravessa carrinho, pedido, estoque, pagamento e notificação.

## Decisão

1. **A aplicação é SOA:** o sistema é dividido em serviços independentes, cada um dono de uma capacidade de negócio e do seu próprio dado, que se comunicam por contratos explícitos.
2. **Cada serviço é construído com Arquitetura Hexagonal:** o núcleo (domínio + casos de uso) é acessado por **portas de entrada** e acessa o mundo externo por **portas de saída**. HTTP, mensageria, banco, gateway de pagamento e notificação são **adaptadores**. As portas pertencem ao núcleo; as implementações ficam nos adaptadores.

Estrutura-base de cada serviço (convenção do projeto):

```
<servico>/
├── domain/            # entidade principal e regras de negócio (sem dependências externas)
├── application/       # caso de uso + portas (in: casos de uso; out: repositórios, gateways)
├── adapters/
│   ├── in/            # REST, consumidores de eventos
│   └── out/           # persistência, cliente de outros serviços, gateway de pagamento, notificação
└── infrastructure/    # configuração, composição (injeção de dependência), bootstrap
```

## Consequências

**Positivas**
- RNF01 e RNF02 são atendidos pelo desenho: o domínio de cada serviço é testável sem infraestrutura e os externos (gateway, notificação) entram por portas de saída, trocáveis por simulações.
- Cada serviço tem seu próprio diagrama de Componentes e Código no C4, com padrão repetido (portas e adaptadores), o que facilita a consistência exigida em RNF05.
- A comunicação entre serviços também é uma porta de saída, então o núcleo não conhece o transporte (REST ou eventos).
- Uma camada a menos que a combinação anterior (Clean + Hexagonal): menos cerimônia e mapeamentos para o prazo curto.

**Negativas / custos**
- Maior esforço de implementação e de infraestrutura (múltiplos serviços, contratos, execução conjunta) para um prazo curto.
- Consistência entre serviços deixa de ser transação local. Isso afeta diretamente RNF03/RF10 (estoque) e o fluxo RF05 → RF06 (pedido, reserva e pagamento), e torna as decisões de reserva de estoque e de retorno do gateway ainda mais importantes.
- Mapeamentos (DTO ↔ domínio) por serviço; risco de excesso de cerimônia em serviços simples.

## Alternativas consideradas

- **Hexagonal ou Clean em aplicação única (monólito):** menor esforço, mas o grupo decidiu por SOA.
- **SOA sem arquitetura interna definida:** deixaria o acoplamento do domínio com framework e banco em aberto, contrariando RNF01.
- **SOA + Clean + Hexagonal (versão anterior):** as duas juntas exigiam camadas duplicadas (as camadas do Clean sobre o núcleo hexagonal) sem ganho proporcional; a equipe optou por manter apenas o hexagonal, que já cobre RNF01 e RNF02.

## Pontos em aberto (viram ADRs próprios)

- ~~**Fronteiras dos serviços**~~ — resolvido no [ADR-0002](0002-fronteiras-dos-servicos.md).
- ~~**Forma de comunicação** entre serviços e API Gateway/BFF~~ — resolvido no [ADR-0003](0003-comunicacao-entre-servicos.md).
- ~~**Dados**~~ — banco único no MySQL com tabelas por serviço na demonstração (cada serviço só acessa as suas tabelas).
- ~~**Reserva de estoque**~~ — resolvida no [ADR-0004](0004-reserva-de-estoque.md).
- ~~**Retorno do gateway**~~ — resolvido no [ADR-0005](0005-retorno-do-gateway.md).
- **Autenticação** (própria ou delegada) — fora da demonstração; a demo usa um cliente fixo.
- **Stack** (linguagem e framework) — definida no [README](../../README.md): Node.js + Express, RabbitMQ e MySQL, tudo em Docker.
