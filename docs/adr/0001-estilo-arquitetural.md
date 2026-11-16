# ADR-0001: Estilo arquitetural — SOA, com Clean + Hexagonal em cada serviço

- **Status:** Aceito
- **Data:** 2026-11-16
- **Decisores:** equipe do projeto

## Contexto

O README deixava o estilo arquitetural em aberto entre Hexagonal, SOA e Clean Architecture. Os requisitos que pesam na escolha:

- **RNF01:** o domínio não pode depender de framework, banco ou serviços externos.
- **RNF02:** pagamento e notificação devem ser substituíveis por simulações.
- **RNF03 / RF10:** nenhuma venda além do estoque, inclusive sob concorrência.
- O fluxo da demonstração (RF04 → RF05 → RF06 → RF08, com RF10 de suporte) atravessa carrinho, pedido, estoque, pagamento e notificação.

## Decisão

1. **A aplicação é SOA:** o sistema é dividido em serviços independentes, cada um dono de uma capacidade de negócio e do seu próprio dado, que se comunicam por contratos explícitos.
2. **Cada serviço é construído com Clean Architecture + Arquitetura Hexagonal**, combinadas assim:
   - **Hexagonal** define a fronteira do serviço: o núcleo (domínio + casos de uso) é acessado por **portas de entrada** e acessa o mundo externo por **portas de saída**. HTTP, mensageria, banco, gateway de pagamento e notificação são **adaptadores**.
   - **Clean** define a organização interna do núcleo em camadas concêntricas (entidades de domínio → casos de uso → adaptadores → frameworks/infraestrutura) com a **regra de dependência**: dependências de código só apontam para dentro.
   - As portas (interfaces) pertencem ao núcleo; as implementações ficam nos adaptadores.

Estrutura-base de um serviço (convenção; os nomes finais seguem a stack escolhida):

```
<servico>/
├── domain/            # entidades, value objects, regras de negócio (sem dependências externas)
├── application/       # casos de uso + portas (in: casos de uso; out: repositórios, gateways)
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

**Negativas / custos**
- Maior esforço de implementação e de infraestrutura (múltiplos serviços, contratos, execução conjunta) para um prazo curto (código rodando em 01/12).
- Consistência entre serviços deixa de ser transação local. Isso afeta diretamente RNF03/RF10 (estoque) e o fluxo RF05 → RF06 (pedido, reserva e pagamento), e torna as decisões de reserva de estoque e de retorno do gateway ainda mais importantes.
- Mais camadas e mapeamentos (DTO ↔ domínio) por serviço; risco de excesso de cerimônia em serviços simples.

## Alternativas consideradas

- **Hexagonal ou Clean em aplicação única (monólito):** menor esforço, mas o grupo decidiu por SOA.
- **SOA sem arquitetura interna definida:** deixaria o acoplamento do domínio com framework e banco em aberto, contrariando RNF01.

## Pontos em aberto (viram ADRs próprios)

- ~~**Fronteiras dos serviços**~~ — resolvido no [ADR-0002](0002-fronteiras-dos-servicos.md).
- ~~**Forma de comunicação** entre serviços e API Gateway/BFF~~ — resolvido no [ADR-0003](0003-comunicacao-entre-servicos.md).
- **Dados:** banco por serviço ou compartilhado na demonstração.
- **Reserva de estoque**, **retorno do gateway** e **autenticação** (já listados no README), agora no contexto de serviços distribuídos.
- **Stack** (linguagem e framework) e como o diagrama C4 representa portas e adaptadores no nível de Componentes.
