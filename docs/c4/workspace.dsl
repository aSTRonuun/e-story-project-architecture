workspace "Loja Virtual" "Diagramas C4 da Loja Virtual: Contexto, Container, Componentes (Pagamento e Pedidos) e Código (Pagamento)" {

    model {
        visitante = person "Visitante" "Navega e busca produtos sem login"
        cliente = person "Cliente" "Visitante autenticado. Compra e acompanha pedidos"
        admin = person "Administrador" "Gerencia catálogo e estoque"

        loja = softwareSystem "Loja Virtual" "Sistema de e-commerce em arquitetura SOA. Cada serviço segue Clean Architecture + Hexagonal e o acesso externo entra por um API Gateway" {
            front = container "Front-end Web" "Interface de busca, carrinho, checkout, acompanhamento de pedidos e administração" "React" "Front-end"
            gateway = container "API Gateway" "Ponto único de entrada. Valida o token, roteia e compõe produto + disponibilidade (RF02)" "Node.js, TypeScript"

            identidade = container "Identidade" "Cadastro, login e emissão de token (RF03). Fora da demonstração" "Node.js, TypeScript" "Serviço"
            catalogo = container "Catálogo" "Produtos, categorias e busca (RF01, RF02, RF09). Mínimo na demonstração" "Node.js, TypeScript" "Serviço"
            estoque = container "Estoque" "Saldo, reserva, baixa e liberação com controle de concorrência (RF10)" "Node.js, TypeScript" "Serviço"
            pedidos = container "Pedidos" "Carrinho, checkout e ciclo de vida dos pedidos (RF04, RF05, RF07)" "Node.js, TypeScript" "Serviço" {
                pedRest = component "API REST de Pedidos" "Expõe carrinho, checkout e consulta de pedidos" "Adaptador de entrada" "Entrada"
                pedConsumidor = component "Consumidor de eventos de pagamento" "Recebe PagamentoAprovado e PagamentoRecusado. Idempotente" "Adaptador de entrada" "Entrada"

                pedUcCarrinho = component "Gerenciar carrinho" "Adiciona, remove e altera itens. Valida a quantidade e obtém o preço (RF04)" "Caso de uso" "CasoDeUso"
                pedUcFinalizar = component "Finalizar compra" "Valida o carrinho, reserva estoque, cria o pedido e inicia a cobrança (RF05)" "Caso de uso" "CasoDeUso"
                pedUcConsultar = component "Consultar pedidos" "Lista os pedidos do cliente com o status atual (RF07)" "Caso de uso" "CasoDeUso"
                pedUcStatus = component "Atualizar status do pedido" "Aplica o resultado do pagamento ao pedido (RF06)" "Caso de uso" "CasoDeUso"

                pedCarrinho = component "Carrinho" "Agregado com itens, quantidades e subtotal" "Domínio" "Dominio"
                pedPedido = component "Pedido" "Agregado com itens (nome e preço copiados), status e regras de transição" "Domínio" "Dominio"

                pedPortaRepo = component "Repositórios de Carrinho e Pedido" "Salvar e buscar carrinhos e pedidos" "Porta de saída" "Porta"
                pedPortaEstoque = component "Porta de Estoque" "Consultar disponibilidade e reservar" "Porta de saída" "Porta"
                pedPortaCatalogo = component "Porta de Catálogo" "Obter nome e preço do produto" "Porta de saída" "Porta"
                pedPortaPagamento = component "Porta de Pagamento" "Iniciar a cobrança" "Porta de saída" "Porta"
                pedPortaEventos = component "Porta de publicação de eventos" "Publicar PedidoStatusAlterado" "Porta de saída" "Porta"

                pedAdRepo = component "Adaptador de persistência" "Implementa os repositórios" "Adaptador de saída" "Saida"
                pedAdEstoque = component "Cliente REST de Estoque" "Implementa a Porta de Estoque" "Adaptador de saída" "Saida"
                pedAdCatalogo = component "Cliente REST de Catálogo" "Implementa a Porta de Catálogo" "Adaptador de saída" "Saida"
                pedAdPagamento = component "Cliente REST de Pagamento" "Implementa a Porta de Pagamento" "Adaptador de saída" "Saida"
                pedAdEventos = component "Publicador de eventos" "Implementa a Porta de eventos" "Adaptador de saída" "Saida"
            }
            pagamento = container "Pagamento" "Cobrança do pedido por porta de saída para o gateway (RF06)" "Node.js, TypeScript" "Serviço" {
                rest = component "API REST de Pagamento" "Recebe o pedido de cobrança vindo de Pedidos" "Adaptador de entrada" "Entrada"

                ucCobrar = component "Iniciar cobrança" "Registra a transação, solicita a cobrança ao gateway, atualiza o resultado e o publica (RF06)" "Caso de uso" "CasoDeUso"

                pgto = component "Pagamento (agregado)" "Agregado da transação com valor, meio de pagamento e status (pendente, aprovado, recusado)" "Domínio" "Dominio"

                portaRepo = component "Repositório de pagamentos" "Salvar e buscar transações" "Porta de saída" "Porta"
                portaGateway = component "Porta do Gateway de pagamento" "Solicitar a cobrança e receber aprovação ou recusa" "Porta de saída" "Porta"
                portaEventos = component "Porta de publicação de eventos" "Publicar PagamentoAprovado e PagamentoRecusado" "Porta de saída" "Porta"

                adRepo = component "Adaptador de persistência" "Implementa o repositório" "Adaptador de saída" "Saida"
                adGateway = component "Adaptador do gateway simulado" "Implementa a Porta do gateway. Substituível (RNF02)" "Adaptador de saída" "Saida"
                adEventos = component "Publicador de eventos" "Implementa a Porta de eventos" "Adaptador de saída" "Saida"
            }
            notificacao = container "Notificação" "Reage a mudanças de status e envia ao cliente (RF08)" "Node.js, TypeScript" "Serviço"

            broker = container "Broker de mensagens" "Eventos entre serviços" "RabbitMQ" "Broker"

            banco = container "Banco de dados" "Armazena os dados dos serviços" "MySQL" "Banco"
            bucket = container "Bucket de arquivos" "Armazena as imagens dos produtos" "Amazon S3" "Bucket"
        }

        pagamentoExt = softwareSystem "Gateway de Pagamento" "Sistema externo simulado. Autoriza ou recusa pagamentos" "Externo"
        notificacaoExt = softwareSystem "Serviço de Notificação" "Sistema externo simulado. Envia e-mail ou push ao cliente" "Externo"

        # Relações de contexto (nível 1)
        visitante -> loja "Busca produtos, vê detalhes e cria conta" "HTTPS"
        cliente -> loja "Gerencia carrinho, finaliza compra, paga e acompanha pedidos" "HTTPS"
        admin -> loja "Gerencia catálogo e controla estoque" "HTTPS"

        loja -> pagamentoExt "Solicita a cobrança do pedido" "HTTPS (simulado)"
        loja -> notificacaoExt "Envia notificações de mudança de status do pedido" "HTTPS (simulado)"

        # Relações de container (nível 2)
        visitante -> front "Usa" "HTTPS"
        cliente -> front "Usa" "HTTPS"
        admin -> front "Usa" "HTTPS"
        front -> gateway "Chama a API" "HTTPS/JSON"

        gateway -> identidade "Valida token e autentica" "REST"
        gateway -> catalogo "Busca produtos e detalhes" "REST"
        gateway -> estoque "Consulta disponibilidade e ajusta estoque" "REST"
        gateway -> pedidos "Carrinho, checkout e consulta de pedidos" "REST"
        gateway -> notificacao "Consulta notificações do pedido após validar o cliente em Pedidos" "REST"

        pedidos -> estoque "Consulta disponibilidade e reserva estoque" "REST"
        pedidos -> catalogo "Lê nome e preço do produto" "REST"
        pedidos -> pagamento "Inicia a cobrança" "REST"

        pagamento -> pagamentoExt "Solicita a cobrança" "HTTPS (simulado)"
        notificacao -> notificacaoExt "Envia notificações" "HTTPS (simulado)"

        pagamento -> broker "Publica PagamentoAprovado e PagamentoRecusado" "AMQP" "Evento"
        pedidos -> broker "Publica PedidoStatusAlterado" "AMQP" "Evento"
        broker -> pedidos "Entrega resultado do pagamento" "AMQP" "Evento"
        broker -> estoque "Entrega resultado do pagamento (baixa ou libera reserva)" "AMQP" "Evento"
        broker -> notificacao "Entrega mudança de status" "AMQP" "Evento"

        identidade -> banco "Lê e grava usuários" "SQL"
        catalogo -> banco "Lê e grava produtos e categorias" "SQL"
        estoque -> banco "Lê e grava saldo e reservas" "SQL"
        pedidos -> banco "Lê e grava carrinhos e pedidos" "SQL"
        pagamento -> banco "Lê e grava cobranças" "SQL"

        catalogo -> bucket "Grava e lê imagens dos produtos" "HTTPS"

        # Relações de componente: serviço de Pagamento (nível 3)
        pedidos -> rest "Inicia a cobrança" "REST"
        rest -> ucCobrar "Chama"

        ucCobrar -> pgto "Cria e atualiza"
        ucCobrar -> portaRepo "Persiste"
        ucCobrar -> portaGateway "Solicita cobrança"
        ucCobrar -> portaEventos "Publica resultado"

        adRepo -> portaRepo "Implementa" "" "Implementa"
        adGateway -> portaGateway "Implementa" "" "Implementa"
        adEventos -> portaEventos "Implementa" "" "Implementa"

        adRepo -> banco "Lê e grava cobranças" "SQL"
        adGateway -> pagamentoExt "Solicita a cobrança" "HTTPS (simulado)"
        adEventos -> broker "Publica PagamentoAprovado e PagamentoRecusado" "AMQP" "Evento"

        # Relações de componente: serviço de Pedidos (nível 3)
        gateway -> pedRest "Carrinho, checkout e consulta de pedidos" "REST"
        broker -> pedConsumidor "Entrega resultado do pagamento" "AMQP" "Evento"

        pedRest -> pedUcCarrinho "Chama"
        pedRest -> pedUcFinalizar "Chama"
        pedRest -> pedUcConsultar "Chama"
        pedConsumidor -> pedUcStatus "Chama"

        pedUcCarrinho -> pedCarrinho "Usa"
        pedUcFinalizar -> pedCarrinho "Usa"
        pedUcFinalizar -> pedPedido "Cria"
        pedUcStatus -> pedPedido "Atualiza"
        pedUcConsultar -> pedPedido "Lê"

        pedUcCarrinho -> pedPortaCatalogo "Obtém preço"
        pedUcCarrinho -> pedPortaEstoque "Consulta disponibilidade"
        pedUcCarrinho -> pedPortaRepo "Persiste"
        pedUcFinalizar -> pedPortaEstoque "Reserva estoque"
        pedUcFinalizar -> pedPortaCatalogo "Confirma nome e preço"
        pedUcFinalizar -> pedPortaPagamento "Inicia cobrança"
        pedUcFinalizar -> pedPortaRepo "Persiste"
        pedUcFinalizar -> pedPortaEventos "Publica status"
        pedUcConsultar -> pedPortaRepo "Busca"
        pedUcStatus -> pedPortaRepo "Persiste"
        pedUcStatus -> pedPortaEventos "Publica status"

        pedAdRepo -> pedPortaRepo "Implementa" "" "Implementa"
        pedAdEstoque -> pedPortaEstoque "Implementa" "" "Implementa"
        pedAdCatalogo -> pedPortaCatalogo "Implementa" "" "Implementa"
        pedAdPagamento -> pedPortaPagamento "Implementa" "" "Implementa"
        pedAdEventos -> pedPortaEventos "Implementa" "" "Implementa"

        pedAdRepo -> banco "Lê e grava carrinhos e pedidos" "SQL"
        pedAdEstoque -> estoque "Consulta disponibilidade e reserva estoque" "REST"
        pedAdCatalogo -> catalogo "Lê nome e preço do produto" "REST"
        pedAdPagamento -> pagamento "Inicia a cobrança" "REST"
        pedAdEventos -> broker "Publica PedidoStatusAlterado" "AMQP" "Evento"

        # Código: serviço de Pagamento (nível 4)
        # O Structurizr não tem view de código. As classes são modeladas como elementos customizados
        # (element) e exibidas em views custom. Os nomes seguem codigo-pagamento.md, em português.
        # A propriedade "componente" liga cada classe ao componente do nível 3 que ela detalha.

        # Domínio
        cPagamento = element "Pagamento" "Entidade" "- id, pedidoId, valor, meio, status\n+ criar(pedidoId, valor, meio): Pagamento\n+ aprovar()\n+ recusar(motivo)\n+ estaPendente(): boolean" "Dominio" {
            properties {
                "componente" "Pagamento (agregado)"
            }
        }
        cStatus = element "StatusPagamento" "Enum" "PENDENTE, APROVADO, RECUSADO" "Dominio" {
            properties {
                "componente" "Pagamento (agregado)"
            }
        }
        cMeio = element "MeioDePagamento" "Enum" "CARTAO, PIX, BOLETO" "Dominio" {
            properties {
                "componente" "Pagamento (agregado)"
            }
        }
        cDinheiro = element "Dinheiro" "Value Object" "- quantia, moeda" "Dominio" {
            properties {
                "componente" "Pagamento (agregado)"
            }
        }
        cPagamentoId = element "PagamentoId" "Value Object" "- valor" "Dominio" {
            properties {
                "componente" "Pagamento (agregado)"
            }
        }
        cPedidoId = element "PedidoId" "Value Object" "- valor" "Dominio" {
            properties {
                "componente" "Pagamento (agregado)"
            }
        }
        cEvento = element "EventoDePagamento" "Classe abstrata" "- pagamentoId, pedidoId, ocorridoEm" "Dominio" {
            properties {
                "componente" "Pagamento (agregado)"
            }
        }
        cAprovado = element "PagamentoAprovado" "Evento" "- valor" "Dominio" {
            properties {
                "componente" "Pagamento (agregado)"
            }
        }
        cRecusado = element "PagamentoRecusado" "Evento" "- motivo" "Dominio" {
            properties {
                "componente" "Pagamento (agregado)"
            }
        }

        # Aplicação: caso de uso
        cIniciarCobranca = element "IniciarCobranca" "Interface" "+ executar(comando): ResultadoCobranca" "CasoDeUso" {
            properties {
                "componente" "Iniciar cobrança"
            }
        }
        cIniciarCobrancaService = element "IniciarCobrancaService" "Classe" "- repositorio, gateway, publicador\n+ executar(comando): ResultadoCobranca" "CasoDeUso" {
            properties {
                "componente" "Iniciar cobrança"
            }
        }
        cComando = element "IniciarCobrancaComando" "DTO" "- pedidoId, valor, meio" "CasoDeUso" {
            properties {
                "componente" "Iniciar cobrança"
            }
        }
        cResultado = element "ResultadoCobranca" "DTO" "- pagamentoId, status" "CasoDeUso" {
            properties {
                "componente" "Iniciar cobrança"
            }
        }

        # Aplicação: portas de saída
        cRepositorio = element "PagamentoRepositorio" "Interface (porta)" "+ salvar(pagamento)\n+ buscarPorPedido(pedidoId): Pagamento" "Porta" {
            properties {
                "componente" "Repositório de pagamentos"
            }
        }
        cGateway = element "GatewayDePagamento" "Interface (porta)" "+ cobrar(solicitacao): RespostaDoGateway" "Porta" {
            properties {
                "componente" "Porta do Gateway de pagamento"
            }
        }
        cPublicador = element "PublicadorDeEventos" "Interface (porta)" "+ publicar(evento)" "Porta" {
            properties {
                "componente" "Porta de publicação de eventos"
            }
        }
        cSolicitacao = element "SolicitacaoDeCobranca" "DTO" "- pagamentoId, valor, meio" "Porta" {
            properties {
                "componente" "Porta do Gateway de pagamento"
            }
        }
        cResposta = element "RespostaDoGateway" "DTO" "- aprovado, motivoRecusa" "Porta" {
            properties {
                "componente" "Porta do Gateway de pagamento"
            }
        }

        # Adaptador de entrada
        cController = element "PagamentoController" "Classe" "- iniciarCobranca\n+ iniciarCobranca(requisicao): CobrancaResponse" "Entrada" {
            properties {
                "componente" "API REST de Pagamento"
            }
        }
        cRequest = element "CobrancaRequest" "DTO" "- pedidoId, valor, moeda, meio" "Entrada" {
            properties {
                "componente" "API REST de Pagamento"
            }
        }
        cResponse = element "CobrancaResponse" "DTO" "- pagamentoId, status" "Entrada" {
            properties {
                "componente" "API REST de Pagamento"
            }
        }

        # Adaptadores de saída
        cRepoBanco = element "PagamentoRepositorioBanco" "Classe" "- mapper\n+ salvar(pagamento)\n+ buscarPorPedido(pedidoId): Pagamento" "Saida" {
            properties {
                "componente" "Adaptador de persistência"
            }
        }
        cRegistro = element "PagamentoRegistro" "Registro de persistência" "- id, pedidoId, valor, moeda, meio, status" "Saida" {
            properties {
                "componente" "Adaptador de persistência"
            }
        }
        cMapper = element "PagamentoMapper" "Classe" "+ paraRegistro(pagamento): PagamentoRegistro\n+ paraDominio(registro): Pagamento" "Saida" {
            properties {
                "componente" "Adaptador de persistência"
            }
        }
        cGatewaySimulado = element "GatewayDePagamentoSimulado" "Classe" "+ cobrar(solicitacao): RespostaDoGateway" "Saida" {
            properties {
                "componente" "Adaptador do gateway simulado"
            }
        }
        cPublicadorBroker = element "PublicadorDeEventosBroker" "Classe" "- mapper\n+ publicar(evento)" "Saida" {
            properties {
                "componente" "Publicador de eventos"
            }
        }
        cMensagemMapper = element "MensagemMapper" "Classe" "+ paraMensagem(evento): MensagemDePagamento" "Saida" {
            properties {
                "componente" "Publicador de eventos"
            }
        }
        cMensagem = element "MensagemDePagamento" "Contrato do evento" "- tipo, versao, pagamentoId, pedidoId, detalhe" "Saida" {
            properties {
                "componente" "Publicador de eventos"
            }
        }

        # Composição (infrastructure/, sem componente no nível 3)
        cConfig = element "PagamentoConfig" "Classe (infrastructure/)" "+ montar(): IniciarCobranca" "Composicao" {
            properties {
                "componente" "Nenhum (composição)"
            }
        }

        # Relações: núcleo
        cPagamento -> cPagamentoId "Tem"
        cPagamento -> cPedidoId "Tem"
        cPagamento -> cDinheiro "Tem"
        cPagamento -> cMeio "Tem"
        cPagamento -> cStatus "Tem"

        cAprovado -> cEvento "Herda"
        cRecusado -> cEvento "Herda"

        cIniciarCobrancaService -> cIniciarCobranca "Implementa" "" "Implementa"
        cIniciarCobranca -> cComando "Recebe"
        cIniciarCobranca -> cResultado "Devolve"

        cIniciarCobrancaService -> cRepositorio "Usa"
        cIniciarCobrancaService -> cGateway "Usa"
        cIniciarCobrancaService -> cPublicador "Usa"
        cIniciarCobrancaService -> cPagamento "Cria e atualiza"
        cIniciarCobrancaService -> cAprovado "Publica"
        cIniciarCobrancaService -> cRecusado "Publica"

        cRepositorio -> cPagamento "Persiste"
        cGateway -> cSolicitacao "Recebe"
        cGateway -> cResposta "Devolve"
        cPublicador -> cEvento "Publica"

        # Relações: adaptadores e composição
        cController -> cIniciarCobranca "Chama"
        cController -> cRequest "Recebe"
        cController -> cResponse "Devolve"

        cRepoBanco -> cRepositorio "Implementa" "" "Implementa"
        cRepoBanco -> cMapper "Usa"
        cMapper -> cRegistro "Converte"
        cMapper -> cPagamento "Converte"

        cGatewaySimulado -> cGateway "Implementa" "" "Implementa"

        cPublicadorBroker -> cPublicador "Implementa" "" "Implementa"
        cPublicadorBroker -> cMensagemMapper "Usa"
        cMensagemMapper -> cEvento "Converte"
        cMensagemMapper -> cMensagem "Converte"
        cPublicadorBroker -> cMensagem "Publica"

        cConfig -> cRepoBanco "Cria"
        cConfig -> cGatewaySimulado "Cria"
        cConfig -> cPublicadorBroker "Cria"
        cConfig -> cIniciarCobrancaService "Cria com repositório, gateway e publicador"
        cConfig -> cController "Cria e injeta IniciarCobranca"
    }

    views {
        systemContext loja "Contexto" "Diagrama de Contexto - Loja Virtual" {
            include *
            autolayout tb
        }

        container loja "Containers" "Diagrama de Container - Loja Virtual" {
            include *
            autolayout lr
        }

        component pagamento "Componentes-Pagamento" "Diagrama de Componentes - Serviço de Pagamento" {
            include *
            autolayout tb
        }

        component pedidos "Componentes-Pedidos" "Diagrama de Componentes - Serviço de Pedidos" {
            include *
            autolayout tb
        }

        custom "Codigo-Pagamento-Nucleo" "Diagrama de Código - Serviço de Pagamento (núcleo: domínio, caso de uso e portas)" {
            include cPagamento cStatus cMeio cDinheiro cPagamentoId cPedidoId cEvento cAprovado cRecusado
            include cIniciarCobranca cIniciarCobrancaService cComando cResultado
            include cRepositorio cGateway cPublicador cSolicitacao cResposta
            autolayout tb
        }

        custom "Codigo-Pagamento-Adaptadores" "Diagrama de Código - Serviço de Pagamento (adaptadores e composição)" {
            include cIniciarCobranca cIniciarCobrancaService cRepositorio cGateway cPublicador cPagamento cEvento
            include cController cRequest cResponse
            include cRepoBanco cRegistro cMapper cGatewaySimulado cPublicadorBroker cMensagemMapper cMensagem
            include cConfig
            autolayout tb
        }

        styles {
            element "Person" {
                shape Person
                background #08427b
                color #ffffff
            }
            element "Software System" {
                background #1168bd
                color #ffffff
            }
            element "Externo" {
                background #999999
                color #ffffff
            }
            element "Container" {
                background #438dd5
                color #ffffff
            }
            element "Serviço" {
                shape Hexagon
            }
            element "Front-end" {
                shape WebBrowser
            }
            element "Broker" {
                shape Pipe
            }
            element "Banco" {
                shape Cylinder
            }
            element "Bucket" {
                shape Folder
                background #e8a33d
                color #000000
            }
            element "Component" {
                background #85bbf0
                color #000000
            }
            element "Entrada" {
                background #7fb069
            }
            element "CasoDeUso" {
                background #f2c14e
            }
            element "Dominio" {
                background #e07a5f
            }
            element "Porta" {
                background #b8b8d1
            }
            element "Saida" {
                background #9ad1d4
            }
            element "Composicao" {
                background #c9b1ff
                color #000000
            }
            element "Element" {
                color #000000
            }
            relationship "Implementa" {
                style dashed
                color #555555
            }
            relationship "Relationship" {
                thickness 2
            }
            relationship "Evento" {
                style dashed
            }
        }
    }

}
