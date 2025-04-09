# Arquitetura Proposta para o Plugin Aplica Variables Sweep

## Visão Geral

Após análise do código atual do plugin, proponho uma arquitetura mais modular e escalável que separa claramente a lógica de negócio da interface do usuário, mantendo todas as funcionalidades existentes. Esta nova estrutura facilitará a manutenção, permitirá a adição de novas features e melhorará a organização do código.

## Princípios da Nova Arquitetura

1. **Separação de Responsabilidades**: Clara divisão entre UI e lógica de negócio
2. **Modularização por Feature**: Organização do código por funcionalidade
3. **Padrão MVC Adaptado**: Model (dados), View (UI), Controller (lógica de negócio)
4. **Centralização de Estado**: Gerenciamento consistente do estado da aplicação
5. **Internacionalização Estruturada**: Sistema de traduções mais organizado

## Estrutura de Diretórios Proposta

```
src/
├── core/                      # Núcleo do plugin
│   ├── api.ts                 # Comunicação com a API do Figma
│   ├── types.ts               # Tipos e interfaces comuns
│   ├── state.ts               # Gerenciamento de estado centralizado
│   └── utils.ts               # Funções utilitárias
│
├── features/                  # Módulos de funcionalidades
│   ├── libraries/             # Feature: Gerenciamento de bibliotecas
│   │   ├── model.ts           # Dados e tipos específicos
│   │   ├── controller.ts      # Lógica de negócio
│   │   └── view.ts            # Componentes de UI específicos
│   │
│   ├── collections/           # Feature: Gerenciamento de coleções
│   │   ├── model.ts
│   │   ├── controller.ts
│   │   └── view.ts
│   │
│   ├── variables/             # Feature: Manipulação de variáveis
│   │   ├── model.ts
│   │   ├── controller.ts
│   │   └── view.ts
│   │
│   └── settings/              # Feature: Configurações do plugin
│       ├── model.ts
│       ├── controller.ts
│       └── view.ts
│
├── ui/                        # Interface do usuário
│   ├── components/            # Componentes reutilizáveis
│   │   ├── tabs.ts            # Sistema de abas
│   │   ├── modal.ts           # Sistema de modais
│   │   ├── loading.ts         # Indicadores de carregamento
│   │   └── notifications.ts   # Sistema de notificações
│   │
│   ├── styles/                # Estilos e temas
│   │   ├── themes.css         # Definições de temas (claro/escuro)
│   │   ├── variables.css      # Variáveis CSS
│   │   └── components.css     # Estilos de componentes
│   │
│   └── pages/                 # Páginas da UI
│       ├── libraries-page.ts  # Página de bibliotecas
│       ├── collections-page.ts # Página de coleções
│       └── settings-page.ts   # Página de configurações
│
├── i18n/                      # Internacionalização
│   ├── translations/          # Arquivos de tradução
│   │   ├── en.ts              # Inglês
│   │   └── pt-br.ts           # Português
│   │
│   └── i18n.ts                # Sistema de internacionalização
│
├── code.ts                    # Ponto de entrada principal (plugin)
├── ui.ts                      # Ponto de entrada da UI
└── ui.html                    # Template HTML da UI
```

## Fluxo de Comunicação

1. **Plugin → UI**: Mensagens enviadas do código principal para a interface
   - Utilizando o padrão de mensagens já existente, mas com estrutura mais organizada
   - Implementação de um sistema de eventos para comunicação entre módulos

2. **UI → Plugin**: Mensagens enviadas da interface para o código principal
   - Padronização das mensagens por feature
   - Centralização do processamento de mensagens

## Detalhamento das Camadas

### 1. Core (Núcleo)

- **api.ts**: Encapsula todas as chamadas à API do Figma, facilitando testes e manutenção
- **types.ts**: Definição centralizada de tipos e interfaces comuns
- **state.ts**: Gerenciamento de estado global do plugin
- **utils.ts**: Funções utilitárias reutilizáveis

### 2. Features (Funcionalidades)

Cada feature segue o padrão MVC adaptado:

- **Model**: Definição de tipos, interfaces e estruturas de dados específicas da feature
- **Controller**: Lógica de negócio, processamento de dados e regras específicas
- **View**: Componentes de UI específicos da feature (quando necessário)

#### Features Identificadas

1. **Libraries**: Gerenciamento de bibliotecas
   - Listar bibliotecas disponíveis
   - Carregar detalhes de bibliotecas
   - Filtrar bibliotecas por tipo

2. **Collections**: Gerenciamento de coleções
   - Listar coleções de uma biblioteca
   - Carregar detalhes de coleções
   - Operações com coleções locais

3. **Variables**: Manipulação de variáveis
   - Buscar variáveis em nós
   - Substituir variáveis
   - Pré-visualizar substituições
   - Aplicar variáveis a nós específicos

4. **Settings**: Configurações do plugin
   - Gerenciamento de temas (claro/escuro)
   - Configurações de idioma
   - Preferências do usuário

### 3. UI (Interface do Usuário)

- **Components**: Componentes reutilizáveis da interface
- **Styles**: Estilos CSS organizados e tematizáveis
- **Pages**: Páginas específicas da interface, organizadas por funcionalidade

### 4. I18n (Internacionalização)

- Sistema de traduções organizado por idioma
- Funções auxiliares para tradução
- Suporte a múltiplos idiomas

## Implementação da Arquitetura

A implementação desta arquitetura pode ser feita gradualmente, seguindo estas etapas:

1. **Reorganização dos arquivos**: Criar a estrutura de diretórios e mover o código existente
2. **Refatoração por módulos**: Refatorar o código em módulos independentes
3. **Implementação do gerenciamento de estado**: Centralizar o estado da aplicação
4. **Padronização da comunicação**: Padronizar as mensagens entre plugin e UI
5. **Refatoração da UI**: Separar componentes e estilos

## Benefícios da Nova Arquitetura

1. **Manutenibilidade**: Código mais organizado e fácil de manter
2. **Escalabilidade**: Facilidade para adicionar novas features
3. **Testabilidade**: Estrutura que facilita a implementação de testes
4. **Reutilização**: Componentes e lógica reutilizáveis
5. **Colaboração**: Múltiplos desenvolvedores podem trabalhar em diferentes módulos

## Considerações para Implementação

- A refatoração deve ser feita de forma incremental para evitar quebras
- Testes manuais devem ser realizados após cada etapa de refatoração
- A documentação deve ser atualizada conforme a nova arquitetura
- As funcionalidades existentes devem ser mantidas sem alterações visíveis para o usuário

## Próximos Passos Recomendados

1. Criar a estrutura de diretórios proposta
2. Mover os tipos e interfaces para o arquivo `core/types.ts`
3. Extrair as funções utilitárias para `core/utils.ts`
4. Implementar o gerenciamento de estado em `core/state.ts`
5. Refatorar a lógica de negócio em módulos de features
6. Reorganizar os componentes de UI
7. Implementar o sistema de internacionalização estruturado
