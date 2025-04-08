# Aplica Variables Sweep - Plugin para Figma

Um plugin avançado para o Figma que simplifica a gestão de bibliotecas, variáveis e estilos entre arquivos. O Aplica Variables Sweep permite que designers mantenham a consistência ao migrar entre bibliotecas ou atualizar sistemas de design, identificando variáveis em elementos selecionados ou em toda a página e substituindo-as por variáveis correspondentes de uma biblioteca externa.

## Funcionalidades Principais

- **Atualização de Collections**: Atualiza coleções inteiras de variáveis entre bibliotecas
- **Substituição de Variáveis por Nó**: Identifica e substitui variáveis em elementos específicos
- **Lista de Bibliotecas**: Exibe todas as bibliotecas disponíveis no arquivo atual
- **Suporte para Idiomas**: Interface disponível em Inglês e Português (Brasil)

## Recursos Técnicos

- **Suporte para Variáveis de Cor**: Aplicação avançada em fills e strokes
- **Variáveis Numéricas**: Suporte para padding, spacing, border radius e outros valores
- **Detecção Automática**: Identifica automaticamente variáveis aplicadas aos elementos
- **Processamento Recursivo**: Processa todos os nós filhos com precisão
- **Correspondência Inteligente**: Encontra variáveis correspondentes entre bibliotecas diferentes

## Interface do Usuário

### Abas Principais

1. **Update Collections**: Para atualizar coleções inteiras de variáveis
2. **Update Variables**: Para substituir variáveis em elementos específicos
3. **List Libraries**: Para visualizar todas as bibliotecas disponíveis

### Configurações

Acesse as configurações através do ícone no rodapé do plugin para selecionar o idioma desejado.

## Como Usar

### Update Collections

1. Abra o plugin e selecione a aba "Update Collections"
2. Selecione a biblioteca externa de referência no primeiro dropdown
3. Escolha a coleção local que deseja atualizar no segundo dropdown
4. Visualize a prévia das correspondências encontradas
5. Clique em "Atualizar Collections" para aplicar as mudanças

### Update Variables

1. Selecione os elementos que deseja processar (ou nenhum para toda a página)
2. Abra o plugin e selecione a aba "Update Variables"
3. Selecione a biblioteca e coleção de referência
4. Escolha o escopo (seleção atual ou página inteira)
5. Clique em "Substituir Variáveis" para aplicar as mudanças

## Instalação

### Usuários

1. Baixe o arquivo do plugin (.fig)
2. Abra o Figma e vá para Plugins > Gerenciar plugins...
3. Clique em "Importar plugin do arquivo" e selecione o arquivo baixado

### Desenvolvedores

1. Clone o repositório
2. Instale as dependências: `npm install`
3. Para desenvolvimento: `npm run dev`
4. Para build: `npm run build`
5. No Figma, vá para Plugins > Desenvolvimento > Importar plugin do manifesto
6. Selecione o arquivo `manifest.json` do projeto

## Log de Alterações

### v0.5.0-beta
- Adicionada funcionalidade de atualização de collections
- Implementada interface com abas para diferentes funcionalidades
- Adicionado suporte para múltiplos idiomas (Inglês e Português)
- Adicionado suporte completo para variáveis de border radius
- Melhorado o tratamento de padding com propriedades individuais
- Implementada detecção automática de variáveis aplicadas
- Corrigidos problemas com substituição de cores
- Aprimorada recursividade para processar todos os nós filhos

### v0.4.0-beta
- Versão inicial com suporte básico para bibliotecas e variáveis
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