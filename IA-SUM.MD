# Documento de Requisitos Funcionais - Plugin Var-Sweep para Figma

## 1. Visão Geral

O Var-Sweep é um plugin avançado para o Figma que simplifica a gestão de bibliotecas, variáveis e estilos entre arquivos. Ele permite identificar e substituir variáveis em designs, facilitando a migração entre bibliotecas ou a atualização de sistemas de design. O plugin mantém a consistência visual ao fazer a correspondência entre variáveis de diferentes bibliotecas.

## 2. Requisitos Funcionais

### 2.1 Gerenciamento de Bibliotecas

- **RF001:** O plugin deve listar todas as bibliotecas disponíveis conectadas ao arquivo do Figma.
- **RF002:** O plugin deve ser capaz de identificar bibliotecas de variáveis e componentes.
- **RF003:** O sistema deve apresentar bibliotecas de forma única, evitando duplicações.

### 2.2 Gerenciamento de Coleções

- **RF004:** O plugin deve listar todas as coleções de variáveis disponíveis em uma biblioteca selecionada.
- **RF005:** O plugin deve permitir a seleção de uma coleção específica para trabalhar.
- **RF006:** O sistema deve carregar as coleções locais existentes no arquivo atual.

### 2.3 Identificação de Variáveis

- **RF007:** O plugin deve identificar todas as variáveis aplicadas nos elementos selecionados ou na página inteira.
- **RF008:** O sistema deve suportar a identificação de variáveis de cor (COLOR).
- **RF009:** O sistema deve suportar a identificação de variáveis numéricas (FLOAT).
- **RF010:** O sistema deve suportar a identificação de variáveis de texto (STRING).
- **RF011:** O sistema deve identificar variáveis aplicadas a propriedades específicas (fills, strokes, etc).

### 2.4 Correspondência de Variáveis

- **RF012:** O plugin deve encontrar correspondências entre variáveis locais e variáveis de bibliotecas externas.
- **RF013:** O sistema deve utilizar o nome da variável como critério principal para correspondência.
- **RF014:** O plugin deve suportar correspondência de modos entre bibliotecas (Light/Dark, Claro/Escuro).
- **RF015:** O sistema deve apresentar uma pré-visualização das correspondências encontradas.

### 2.5 Substituição de Variáveis

- **RF016:** O plugin deve substituir variáveis locais pelas correspondentes de uma biblioteca externa.
- **RF017:** O sistema deve suportar substituição de variáveis em elementos específicos (seleção).
- **RF018:** O sistema deve suportar substituição de variáveis em toda a página.
- **RF019:** O plugin deve manter as propriedades e aplicações originais das variáveis ao substituí-las.
- **RF020:** O sistema deve tratar diferentes tipos de nós e propriedades específicas do Figma.

### 2.6 Processamento Recursivo

- **RF021:** O plugin deve processar recursivamente todos os nós filhos dos elementos selecionados.
- **RF022:** O sistema deve identificar e substituir variáveis em componentes aninhados.

### 2.7 Interface de Usuário

- **RF023:** O plugin deve fornecer uma interface para selecionar bibliotecas e coleções.
- **RF024:** O sistema deve oferecer opções para definir o escopo da operação (seleção ou página).
- **RF025:** O plugin deve apresentar visualização das variáveis encontradas e suas correspondências.
- **RF026:** O sistema deve mostrar estatísticas de substituição (sucessos e falhas).

## 3. Arquitetura Funcional

### 3.1 Componentes Principais

#### 3.1.1 Gerenciador de Bibliotecas
- **Função:** `carregarBibliotecas()` - Lista todas as bibliotecas conectadas ao arquivo
- **Função:** `obterTodasBibliotecas()` - Obtém um mapa com todas as bibliotecas únicas

#### 3.1.2 Gerenciador de Coleções
- **Função:** `carregarColecoesDaBiblioteca()` - Carrega coleções de uma biblioteca específica
- **Função:** `carregarColecoesLocais()` - Carrega coleções locais do arquivo atual

#### 3.1.3 Detector de Variáveis
- **Função:** `buscarVariaveisEEstilos()` - Identifica variáveis nos elementos
- **Função:** `procurarVariaveisEEstilos()` - Processa a busca de variáveis no escopo definido

#### 3.1.4 Correspondência de Variáveis
- **Função:** `preVisualizarCorrespondencias()` - Encontra correspondências entre variáveis
- **Função:** `encontrarModoCorrespondente()` - Identifica modos equivalentes entre coleções

#### 3.1.5 Substituição de Variáveis
- **Função:** `substituirVariaveisEmColecao()` - Substitui variáveis em uma coleção
- **Função:** `substituirVariaveisNoEscopo()` - Substitui variáveis nos elementos do escopo
- **Função:** `aplicarVariaveisAoNo()` - Aplica variáveis a um nó específico

#### 3.1.6 Manipulação de Propriedades Específicas
- **Função:** `aplicarVariavelColor()` - Aplica variáveis de cor
- **Função:** `aplicarVariavelFloat()` - Aplica variáveis numéricas
- **Função:** `aplicarStrokeWeightDiretamente()` - Aplica variáveis a pesos de contorno

### 3.2 Fluxos de Trabalho

#### 3.2.1 Fluxo de Substituição de Variáveis
1. O usuário seleciona elementos ou define o escopo como página inteira
2. O sistema identifica variáveis nos elementos (`buscarVariaveisEEstilos()`)
3. O usuário seleciona biblioteca e coleção de referência
4. O sistema encontra correspondências (`preVisualizarCorrespondencias()`)
5. O usuário confirma a substituição
6. O sistema substitui as variáveis (`substituirVariaveisNoEscopo()`)
7. O sistema exibe estatísticas de substituição

#### 3.2.2 Fluxo de Atualização de Coleções
1. O usuário seleciona uma coleção local
2. O usuário seleciona biblioteca e coleção de referência
3. O sistema encontra correspondências entre variáveis das coleções
4. O usuário confirma a atualização
5. O sistema substitui variáveis na coleção local (`substituirVariaveisEmColecao()`)

## 4. Limitações e Comportamentos Esperados

### 4.1 Limitações Conhecidas
- A correspondência é baseada exclusivamente no nome da variável
- Variáveis sem correspondência direta não são substituídas
- Alguns tipos de propriedades complexas podem exigir ajustes manuais

### 4.2 Comportamentos Esperados
- O plugin deve preservar os valores específicos para cada modo (Light/Dark)
- A correspondência de modos deve considerar equivalências como Light/Claro, Dark/Escuro
- As substituições devem preservar o contexto de aplicação da variável

## 5. Requisitos Técnicos

### 5.1 Dependências
- Figma Plugin API
- TypeScript
- Webpack para empacotamento

### 5.2 Compatibilidade
- Suporte para todos os tipos de variáveis do Figma (COLOR, FLOAT, STRING)
- Suporte para múltiplos modos e coleções
- Compatibilidade com versões recentes da API do Figma

## 6. Considerações de Desenvolvimento

### 6.1 Boas Práticas
- Tratamento adequado de erros para evitar falhas durante a substituição
- Backup de valores originais antes de alterações
- Processamento recursivo cuidadoso para evitar loops infinitos
- Serialização segura de objetos para logging

### 6.2 Melhorias Futuras
- Algoritmos de correspondência mais avançados (além do nome)
- Suporte para lotes de substituição em múltiplos arquivos
- Interface de usuário para personalização de regras de correspondência
- Relatórios detalhados de substituição para auditoria de alterações 