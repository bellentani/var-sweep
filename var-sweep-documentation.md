# Var Sweep - Plugin Figma para Substituição de Variáveis

## Visão Geral

O Var Sweep é um plugin para Figma projetado para facilitar a substituição de variáveis em designs, permitindo que designers mantenham a consistência ao migrar entre bibliotecas ou atualizar sistemas de design. O plugin identifica variáveis em elementos selecionados ou em toda a página e as substitui por variáveis correspondentes de uma biblioteca externa.

## Funcionalidades Principais

### 1. Update Variables (Substituição de Variáveis)

Esta funcionalidade permite substituir variáveis em elementos específicos do Figma por variáveis correspondentes de uma biblioteca externa.

#### Como funciona

1. **Seleção de Biblioteca**: O usuário seleciona a biblioteca externa que contém as variáveis de referência
2. **Seleção de Coleção**: O usuário escolhe a coleção específica de variáveis dentro da biblioteca selecionada
3. **Definição de Escopo**: O usuário determina se a substituição será aplicada apenas aos elementos selecionados ou a toda a página
4. **Pesquisa de Variáveis**: O plugin identifica todas as variáveis e estilos nos elementos do escopo escolhido
5. **Visualização**: O usuário pode visualizar todas as variáveis encontradas antes de aplicar a substituição
6. **Substituição**: O plugin substitui as variáveis encontradas pelas correspondentes da biblioteca selecionada

#### Tipos de Variáveis Suportadas

- **Variáveis de Cor (COLOR)**: Aplicadas a preenchimentos (fills) e contornos (strokes)
- **Variáveis Numéricas (FLOAT)**: Para valores como opacidade, tamanho, etc.
- **Variáveis de Texto (STRING)**: Para textos e conteúdos
- **Estilos**: Estilos de preenchimento, contorno, texto, efeito e grade

### 2. Update Collections (Atualização de Coleções)

Esta funcionalidade permite trabalhar com coleções inteiras de variáveis, facilitando a atualização em massa.

## Algoritmo de Correspondência

O plugin usa um sistema baseado em nome para fazer a correspondência entre as variáveis:

1. **Identificação**: O plugin identifica as variáveis nos elementos selecionados
2. **Busca por Correspondência**: O sistema procura na biblioteca externa por variáveis com nomes idênticos
3. **Mapeamento**: As variáveis correspondentes são mapeadas para substituição
4. **Aplicação**: As variáveis originais são substituídas pelas correspondentes da biblioteca

## Interface do Usuário

### Aba Update Variables

- **Seletor de Biblioteca**: Dropdown com todas as bibliotecas disponíveis
- **Seletor de Coleção**: Dropdown com as coleções de variáveis na biblioteca selecionada
- **Opções de Escopo**: Botões de rádio para escolher entre "Seleção atual" e "Página atual"
- **Botão de Pesquisa**: Para identificar variáveis nos elementos
- **Visualização de Variáveis**: Lista das variáveis encontradas com indicação de correspondência
- **Botão de Substituição**: Para iniciar o processo de substituição

## Processo de Execução

1. O plugin identifica variáveis nos elementos do escopo selecionado
2. As variáveis são mapeadas para as correspondentes na biblioteca externa
3. O sistema verifica a compatibilidade de tipo entre as variáveis
4. As variáveis são substituídas, mantendo as mesmas propriedades e aplicações
5. O plugin notifica o usuário sobre o resultado da substituição

## Casos de Uso

### Migração de Design System

Quando uma equipe migra de um sistema de design para outro, o plugin pode automatizar a substituição de variáveis antigas pelas novas, mantendo a consistência visual.

### Atualização de Componentes

Ao atualizar componentes para usar novas variáveis de design, o plugin facilita a substituição em massa.

### Padronização de Design

Para garantir que todos os arquivos de design usem as mesmas variáveis de uma biblioteca oficial, o plugin permite uma atualização rápida.

## Fluxo de Trabalho Recomendado

1. **Preparação**: Certifique-se de que a biblioteca externa está disponível e contém as variáveis necessárias
2. **Seleção**: Selecione os elementos que deseja atualizar
3. **Configuração**: Escolha a biblioteca e coleção de referência
4. **Verificação**: Analise as variáveis encontradas e suas correspondências
5. **Execução**: Aplique a substituição
6. **Revisão**: Verifique se todas as substituições foram aplicadas corretamente

## Limitações Conhecidas

- A correspondência é baseada exclusivamente no nome da variável
- Variáveis sem correspondência direta não são substituídas
- Algumas propriedades complexas podem exigir ajustes manuais após a substituição

## Exemplos Práticos

### Substituição de Cores

O plugin identifica variáveis de cor como `bg/button/secondary/pressed` e busca correspondência na biblioteca selecionada. Se encontrada, a variável original é substituída pela variável correspondente, mantendo a mesma aplicação (preenchimento, contorno, etc.).

### Substituição de Estilos de Texto

Para variáveis como `action/button/large` aplicadas a estilos de texto, o plugin busca o estilo correspondente na biblioteca e aplica ao elemento.

## Considerações Técnicas

- O plugin usa a API do Figma para acessar e modificar variáveis
- A correspondência é feita através do nome da variável, não de seu valor ou ID
- As variáveis são aplicadas respeitando o contexto e a propriedade original 