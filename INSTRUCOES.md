# Documentação Técnica - Aplica Variables Sweep

## 1. Visão Geral

O Aplica Variables Sweep é um plugin avançado para o Figma que simplifica a gestão de bibliotecas, variáveis e estilos entre arquivos. Ele permite identificar e substituir variáveis em designs, facilitando a migração entre bibliotecas ou a atualização de sistemas de design. O plugin mantém a consistência visual ao fazer a correspondência entre variáveis de diferentes bibliotecas.

## 2. Funcionalidades Detalhadas

### 2.1 Update Collections (Atualizar Collections)

Esta funcionalidade permite atualizar coleções inteiras de variáveis, facilitando a atualização em massa de variáveis entre bibliotecas.

#### Fluxo de Trabalho

1. O usuário seleciona a aba "Update Collections"
2. O usuário seleciona biblioteca externa e coleção local
3. O sistema encontra correspondências entre as variáveis
4. O usuário confirma a atualização clicando em "Atualizar Collections"
5. O sistema substitui as variáveis da coleção local pelas correspondentes da biblioteca

### 2.2 Update Variables (Substituição de Variáveis por Nó)

Esta funcionalidade permite substituir variáveis em elementos específicos do Figma por variáveis correspondentes de uma biblioteca externa.

#### Fluxo de Trabalho

1. O usuário seleciona elementos ou define o escopo como página inteira
2. O usuário seleciona a aba "Update Variables"
3. O sistema identifica variáveis nos elementos
4. O usuário seleciona biblioteca e coleção de referência
5. O sistema encontra correspondências
6. O usuário confirma a substituição
7. O sistema substitui as variáveis e exibe estatísticas de substituição

### 2.3 List Libraries (Listar Bibliotecas)

Esta funcionalidade permite visualizar todas as bibliotecas disponíveis no arquivo atual, incluindo bibliotecas de componentes e variáveis.

## 3. Tipos de Variáveis Suportadas

- **Variáveis de Cor (COLOR)**: Aplicadas a preenchimentos (fills) e contornos (strokes)
- **Variáveis Numéricas (FLOAT)**: Para valores como opacidade, tamanho, padding, border radius, etc.
- **Variáveis de Texto (STRING)**: Para textos e conteúdos
- **Estilos**: Estilos de preenchimento, contorno, texto, efeito e grade

## 4. Algoritmo de Correspondência

O plugin usa um sistema baseado em nome para fazer a correspondência entre as variáveis:

1. **Identificação**: O plugin identifica as variáveis nos elementos selecionados
2. **Busca por Correspondência**: O sistema procura na biblioteca externa por variáveis com nomes idênticos
3. **Mapeamento**: As variáveis correspondentes são mapeadas para substituição
4. **Aplicação**: As variáveis originais são substituídas pelas correspondentes da biblioteca

### 4.1 Correspondência de Modos

O plugin suporta correspondência entre diferentes modos (como Light/Dark, Claro/Escuro) seguindo estas etapas:

1. Para cada variável local:
   - Encontrar sua correspondência na biblioteca
   - Importar a variável correspondente da biblioteca
   - Para cada modo da variável local:
     - Encontrar o modo correspondente na biblioteca
     - Se encontrar, usar o valor específico desse modo
     - Se não encontrar, usar referência à variável

## 5. Interface do Usuário

### 5.1 Estrutura da Interface

- **Abas de Navegação**: Permite alternar entre as funcionalidades principais
- **Formulários**: Campos para seleção de bibliotecas e coleções
- **Pré-visualização**: Área para mostrar as correspondências encontradas
- **Botões de Ação**: Para iniciar os processos de substituição
- **Rodapé**: Exibe a versão do plugin e acesso às configurações

### 5.2 Configurações

- **Seleção de Idioma**: Permite escolher entre Inglês e Português (Brasil)

## 6. Instalação e Desenvolvimento

### 6.1 Instalação para Usuários

1. Baixe o arquivo do plugin (.fig)
2. Abra o Figma e vá para Plugins > Gerenciar plugins...
3. Clique em "Importar plugin do arquivo" e selecione o arquivo baixado

### 6.2 Instalação para Desenvolvimento

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```

3. Inicie o modo de desenvolvimento:
```bash
npm run dev
```

4. No Figma, acesse Plugins > Desenvolvimento > Importar plugin do manifesto
5. Selecione o arquivo `manifest.json` deste projeto

### 6.3 Estrutura do Código

Os arquivos principais estão em `src/`:

- **code.ts**: Lógica principal que interage com a API do Figma
  - Contém funções para carregar bibliotecas e coleções
  - Implementa a lógica de substituição de variáveis
  - Gerencia a comunicação com a interface do usuário

- **ui.html**: Interface visual do plugin
  - Define a estrutura HTML e estilos CSS
  - Implementa a interface com abas e formulários
  - Contém os elementos visuais e controles

- **ui.ts**: Lógica da interface do usuário
  - Gerencia eventos e interações
  - Processa dados para exibição
  - Comunica-se com o código principal

### 6.4 Compilação

Para gerar uma versão de produção para distribuição:

```bash
npm run build
```

## 7. Casos de Uso

### 7.1 Migração de Design System

Quando uma equipe migra de um sistema de design para outro, o plugin pode automatizar a substituição de variáveis antigas pelas novas, mantendo a consistência visual.

### 7.2 Atualização de Componentes

Ao atualizar componentes para usar novas variáveis de design, o plugin facilita a substituição em massa.

### 7.3 Padronização de Design

Para garantir que todos os arquivos de design usem as mesmas variáveis de uma biblioteca oficial, o plugin permite uma atualização rápida.

## 8. Limitações Conhecidas

- A correspondência é baseada exclusivamente no nome da variável
- Variáveis sem correspondência direta não são substituídas
- Algumas propriedades complexas podem exigir ajustes manuais após a substituição

## 9. Resolução de Problemas

- **Erro ao carregar bibliotecas**: Verifique se as bibliotecas estão corretamente vinculadas ao arquivo
- **Variáveis não encontradas**: Confirme se os nomes das variáveis correspondem entre as bibliotecas
- **Falha na substituição**: Verifique se os tipos de variáveis são compatíveis
- **Plugin não carrega**: Certifique-se de que o Figma está atualizado para a versão mais recente

Se encontrar outros problemas:

1. Verifique se instalou todas as dependências com `npm install`
2. Consulte os logs do console para mensagens de erro
3. Reinicie o Figma e tente novamente