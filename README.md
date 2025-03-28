# Biblioteca Sweep - Plugin para Figma

Um plugin avançado para o Figma que simplifica a gestão de bibliotecas, variáveis e estilos entre arquivos.

## Funcionalidades

- Lista todas as bibliotecas disponíveis no arquivo
- Detecta e substitui variáveis entre bibliotecas de design
- Suporte completo para variáveis de cor, padding e border radius
- Processamento recursivo para todos os nós, incluindo nós filhos
- Interface simples e fácil de usar

## Recursos Chave (v0.5.0)

- **Substituição Inteligente de Variáveis**: Identifica e substitui variáveis correspondentes entre bibliotecas
- **Suporte para Cor**: Aplicação avançada de variáveis de cor em fills e strokes
- **Propriedades de Layout**: Aplicação precisa de paddings (top, bottom, left, right)
- **Border Radius**: Aplicação completa de border radius (cornerRadius e radii específicos)
- **Detecção Automática**: Analisa automaticamente quais variáveis estão aplicadas aos nós
- **Processamento Recursivo**: Processa todos os nós filhos com precisão

## Como usar

1. Instale o plugin no Figma
2. Abra o arquivo do Figma onde deseja verificar as bibliotecas
3. Selecione os elementos que deseja processar
4. Execute o plugin através do menu Plugins > Biblioteca Sweep
5. Selecione a biblioteca e coleção de referência
6. O plugin substituirá automaticamente as variáveis com as correspondentes da biblioteca selecionada

## Log de Alterações

### v0.5.0
- Adicionado suporte completo para variáveis de border radius
- Melhorado o tratamento de padding com propriedades individuais
- Implementada detecção automática de variáveis aplicadas
- Corrigidos problemas com substituição de cores
- Aprimorada recursividade para processar todos os nós filhos

### v0.4.0-beta
- Versão inicial com suporte básico para bibliotecas e variáveis

## Desenvolvimento

### Pré-requisitos

- Node.js e npm instalados

### Instalação

```bash
npm install
```

### Desenvolvimento

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Licença

MIT 