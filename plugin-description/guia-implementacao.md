# Guia de Implementação da Nova Arquitetura

## Introdução

Este guia apresenta os passos práticos para implementar a nova arquitetura proposta para o plugin Aplica Variables Sweep, mantendo todas as funcionalidades existentes e garantindo que não haja quebras durante a transição.

## Fase 1: Preparação e Estruturação

### Passo 1: Criar a Estrutura de Diretórios

```bash
mkdir -p src/core
mkdir -p src/features/libraries/
mkdir -p src/features/collections/
mkdir -p src/features/variables/
mkdir -p src/features/settings/
mkdir -p src/ui/components
mkdir -p src/ui/styles
mkdir -p src/ui/pages
mkdir -p src/i18n/translations
```

### Passo 2: Extrair Tipos e Interfaces

Criar o arquivo `src/core/types.ts` movendo as interfaces existentes:

```typescript
// src/core/types.ts
export interface BibliotecaInfo {
  id: string;
  name: string;
  library: string;
  type: string;
}

export interface ColecaoInfo {
  id: string;
  name: string;
  type?: string;
}

export interface VariableInfo {
  name: string;
  type: string;
  collection: string;
  nodeId: string;
  property: string;
  isRealVariable?: boolean;
  colorValue?: string;
  variableCollectionId?: string;
}

// Adicionar outras interfaces conforme necessário
```

### Passo 3: Extrair Funções Utilitárias

Criar o arquivo `src/core/utils.ts`:

```typescript
// src/core/utils.ts
export function serializarSeguro(obj: any): string {
  try {
    // Função helper para criar uma versão simplificada do objeto
    const getSimpleObject = (object: any, depth = 0) => {
      if (depth > 2) return "[objeto aninhado]"; // Limita profundidade
      if (!object || typeof object !== 'object') return object;
      
      const newObj: any = {};
      for (const key in object) {
        if (Object.prototype.hasOwnProperty.call(object, key)) {
          try {
            if (key === 'parent') {
              newObj[key] = '[circular]';
            } else if (Array.isArray(object[key])) {
              newObj[key] = `[Array(${object[key].length})]`;
            } else if (typeof object[key] === 'object' && object[key] !== null) {
              newObj[key] = getSimpleObject(object[key], depth + 1);
            } else {
              newObj[key] = object[key];
            }
          } catch (e) {
            newObj[key] = '[erro ao acessar]';
          }
        }
      }
      return newObj;
    };
    
    const simplifiedObj = getSimpleObject(obj);
    return JSON.stringify(simplifiedObj, null, 2);
  } catch (e) {
    return '[erro ao serializar]';
  }
}

// Adicionar outras funções utilitárias conforme necessário
```

## Fase 2: Modularização por Feature

### Passo 1: Feature de Bibliotecas

#### Modelo (`src/features/libraries/model.ts`):

```typescript
import { BibliotecaInfo } from '../../core/types';

// Tipos específicos para bibliotecas
export interface BibliotecaRequest {
  type: 'obterBibliotecas';
}

export interface BibliotecaResponse {
  type: 'libraries-data';
  libraries: BibliotecaInfo[];
  message?: string;
}

// Outros tipos específicos para bibliotecas
```

#### Controlador (`src/features/libraries/controller.ts`):

```typescript
import { BibliotecaInfo } from '../../core/types';
import { serializarSeguro } from '../../core/utils';

export async function carregarBibliotecas(): Promise<BibliotecaInfo[]> {
  try {
    figma.notify("Carregando bibliotecas...", {timeout: 2000});
    console.log("[BIBLIOTECA-SWEEP] Iniciando carregamento de bibliotecas ADICIONADAS...");
    
    // Código existente da função carregarBibliotecas
    // ...
    
    // Retornar bibliotecas encontradas
    return Array.from(bibliotecasMap.values());
  } catch (error) {
    console.error("Erro ao carregar bibliotecas:", error);
    return [];
  }
}

// Outras funções relacionadas a bibliotecas
```

### Passo 2: Feature de Coleções

Seguir o mesmo padrão para as outras features, extraindo a lógica específica para os arquivos correspondentes.

## Fase 3: Reorganização da UI

### Passo 1: Componentes Reutilizáveis

Extrair componentes como tabs, modais e notificações para arquivos separados em `src/ui/components/`.

### Passo 2: Estilos

Mover as definições de CSS para arquivos separados em `src/ui/styles/`.

### Passo 3: Páginas

Organizar o código de UI por páginas/abas em `src/ui/pages/`.

## Fase 4: Sistema de Internacionalização

### Passo 1: Extrair Traduções

Mover as traduções para arquivos separados:

```typescript
// src/i18n/translations/en.ts
export default {
  // General
  'language_code': 'EN',
  'language_name': 'English',
  
  // ... outras traduções em inglês
};

// src/i18n/translations/pt-br.ts
export default {
  // General
  'language_code': 'PT-BR',
  'language_name': 'Português',
  
  // ... outras traduções em português
};
```

### Passo 2: Sistema de Internacionalização

Criar um sistema centralizado:

```typescript
// src/i18n/i18n.ts
import en from './translations/en';
import ptBr from './translations/pt-br';

const translations = {
  'en': en,
  'pt-br': ptBr
};

export type Language = 'en' | 'pt-br';

export function t(key: string, params: Record<string, string> = {}, language: Language = 'en'): string {
  const translationSet = translations[language] || translations['en'];
  let text = translationSet[key] || key;
  
  // Substituir parâmetros
  Object.keys(params).forEach(param => {
    text = text.replace(`{${param}}`, params[param]);
  });
  
  return text;
}
```

## Fase 5: Gerenciamento de Estado

### Passo 1: Criar Sistema de Estado

```typescript
// src/core/state.ts
export interface PluginState {
  libraries: BibliotecaInfo[];
  collections: ColecaoInfo[];
  selectedLibraryId: string | null;
  selectedCollectionId: string | null;
  theme: 'light' | 'dark';
  language: 'en' | 'pt-br';
  // Outros estados necessários
}

// Estado inicial
const initialState: PluginState = {
  libraries: [],
  collections: [],
  selectedLibraryId: null,
  selectedCollectionId: null,
  theme: 'light',
  language: 'pt-br',
};

// Estado atual
let state = { ...initialState };

// Getters e setters
export function getState(): PluginState {
  return { ...state };
}

export function updateState(newState: Partial<PluginState>): void {
  state = { ...state, ...newState };
  notifyStateChange();
}

// Listeners para mudanças de estado
const listeners: Array<(state: PluginState) => void> = [];

export function subscribeToState(listener: (state: PluginState) => void): () => void {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
}

function notifyStateChange(): void {
  listeners.forEach(listener => listener(getState()));
}
```

## Fase 6: Integração e Pontos de Entrada

### Passo 1: Refatorar `code.ts`

```typescript
/// <reference types="@figma/plugin-typings" />

// Importações dos módulos
import { getState, updateState } from './core/state';
import * as LibrariesController from './features/libraries/controller';
import * as CollectionsController from './features/collections/controller';
import * as VariablesController from './features/variables/controller';
import * as SettingsController from './features/settings/controller';

console.log("Plugin Aplica Variables Sweep iniciando...");
console.log("Versão: 0.6.0-beta");

// Verifica acesso às APIs necessárias
if (!figma.currentPage) {
  figma.notify("Erro: Não foi possível acessar a página atual");
  figma.closePlugin();
}

// Mostra a interface do usuário
figma.showUI(__html__, { width: 450, height: 600 });
console.log("UI exibida");

// Configurar o manipulador de mensagens
figma.ui.onmessage = async (msg) => {
  // Roteamento de mensagens para os controladores apropriados
  switch (msg.type) {
    // Bibliotecas
    case 'obterBibliotecas':
      try {
        const libraries = await LibrariesController.carregarBibliotecas();
        updateState({ libraries });
        figma.ui.postMessage({ 
          type: 'libraries-data', 
          libraries,
          message: `Encontradas ${libraries.length} bibliotecas` 
        });
      } catch (error) {
        figma.ui.postMessage({ 
          type: 'error', 
          message: `Erro ao carregar bibliotecas: ${error.message}` 
        });
      }
      break;
      
    // Outros casos para diferentes features
    // ...
  }
};

// Carregar dados iniciais
async function inicializar() {
  try {
    // Inicialização necessária
  } catch (error) {
    console.error("Erro na inicialização:", error);
  }
}

inicializar();
```

### Passo 2: Refatorar `ui.ts`

Seguir um padrão semelhante para o arquivo de UI, organizando-o por módulos.

## Considerações Finais

1. **Implementação Incremental**: Refatore um módulo por vez, testando após cada mudança.
2. **Compatibilidade**: Mantenha a compatibilidade com o código existente durante a transição.
3. **Testes**: Realize testes manuais para garantir que as funcionalidades continuem funcionando.
4. **Documentação**: Atualize a documentação conforme a nova estrutura é implementada.

Esta abordagem permite uma transição gradual para a nova arquitetura, minimizando o risco de quebras e mantendo o plugin funcional durante todo o processo de refatoração.
