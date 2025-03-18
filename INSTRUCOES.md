# Instruções de Uso - Biblioteca Sweep

## Instalação do Plugin no Figma

### Modo Desenvolvimento

1. Abra o Figma Desktop
2. Vá para Plugins > Desenvolvimento > Importar plugin do manifesto
3. Selecione o arquivo `manifest.json` deste projeto

### Preparando o Ambiente de Desenvolvimento

1. Instale as dependências:
```bash
npm install
```

2. Inicie o modo de desenvolvimento:
```bash
npm run dev
```

3. Isso irá compilar os arquivos e ficar observando por mudanças

## Como Usar o Plugin

1. No Figma, acesse Plugins > Desenvolvimento > Biblioteca Sweep
2. Uma janela será exibida mostrando todas as bibliotecas disponíveis no seu arquivo atual
3. A lista inclui tanto bibliotecas de componentes quanto bibliotecas de variáveis

## Desenvolvimento

Se desejar modificar o plugin:

1. Os arquivos principais estão em `src/`:
   - `code.ts`: Lógica principal que interage com a API do Figma
   - `ui.html`: Interface visual do plugin
   - `ui.ts`: Lógica da interface do usuário

2. Após fazer alterações, execute:
```bash
npm run build
```

3. Para gerar uma versão de produção para distribuição.

## Resolução de Problemas

Se encontrar algum problema:

1. Verifique se instalou todas as dependências com `npm install`
2. Certifique-se de que o Figma está atualizado
3. Tente reiniciar o Figma Desktop e reimportar o plugin 