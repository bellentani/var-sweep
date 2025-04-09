# Exemplo de Implementação: Feature de Variáveis

Este documento apresenta um exemplo prático de como implementar a nova arquitetura proposta, usando a feature de manipulação de variáveis como exemplo. Este é um guia passo a passo que mostra como refatorar o código existente para a nova estrutura modular.

## Estrutura de Arquivos para a Feature

```
src/
└── features/
    └── variables/
        ├── model.ts       # Tipos e interfaces específicos de variáveis
        ├── controller.ts  # Lógica de negócio para manipulação de variáveis
        ├── view.ts        # Componentes de UI específicos para variáveis
        └── messages.ts    # Definições de mensagens para comunicação
```

## 1. Modelo (model.ts)

Primeiro, vamos definir os tipos e interfaces específicos para a feature de variáveis:

```typescript
// src/features/variables/model.ts
import { VariableInfo } from '../../core/types';

// Tipos de valores de variáveis
export type VariableValueType = 'VARIABLE_ALIAS' | 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';

// Constantes para os tipos
export const VAR_TYPE_ALIAS: VariableValueType = "VARIABLE_ALIAS";
export const VAR_TYPE_COLOR: VariableValueType = "COLOR";
export const VAR_TYPE_FLOAT: VariableValueType = "FLOAT";
export const VAR_TYPE_STRING: VariableValueType = "STRING";
export const VAR_TYPE_BOOLEAN: VariableValueType = "BOOLEAN";

// Interface para variáveis a serem substituídas
export interface VariableToReplace {
  id: string;
  name: string;
  type?: string;
  property?: string;
  nodeId?: string;
  hasMatch?: boolean;
}

// Interface para resultado de substituição
export interface SubstitutionResult {
  sucessos: number;
  falhas: number;
}

// Interface para correspondência de variáveis
export interface VariableMatch {
  localId: string;
  localName: string;
  libraryId: string;
  libraryName: string;
  valueType: string;
  modes?: Array<{
    modeId: string;
    name: string;
    value: string;
  }>;
}

// Outras interfaces específicas para variáveis
```

## 2. Controlador (controller.ts)

Em seguida, vamos implementar a lógica de negócio para manipulação de variáveis:

```typescript
// src/features/variables/controller.ts
import { VariableInfo, VariableToReplace, SubstitutionResult, VariableMatch, VariableValueType } from './model';
import { serializarSeguro } from '../../core/utils';

/**
 * Busca variáveis e estilos em nós selecionados ou na página
 * @param escopo Escopo da busca ('selection' ou 'page')
 * @returns Lista de informações de variáveis encontradas
 */
export async function buscarVariaveisEEstilos(escopo: 'selection' | 'page'): Promise<VariableInfo[]> {
  try {
    console.log(`[VARIABLES] Buscando variáveis e estilos no escopo: ${escopo}`);
    
    // Determinar os nós a serem analisados
    const nodes = escopo === 'selection' 
      ? figma.currentPage.selection 
      : figma.currentPage.children;
    
    if (!nodes || nodes.length === 0) {
      console.log(`[VARIABLES] Nenhum nó encontrado no escopo: ${escopo}`);
      return [];
    }
    
    console.log(`[VARIABLES] Analisando ${nodes.length} nós`);
    
    // Implementação da lógica de busca de variáveis (código existente refatorado)
    // ...

    // Retornar as variáveis encontradas
    return variaveisEncontradas;
  } catch (error) {
    console.error(`[VARIABLES] Erro ao buscar variáveis: ${error.message}`);
    return [];
  }
}

/**
 * Substitui variáveis em um escopo específico
 * @param nodes Nós onde as variáveis serão substituídas
 * @param variaveisParaSubstituir Variáveis a serem substituídas
 * @param libraryId ID da biblioteca
 * @param collectionId ID da coleção
 * @returns Resultado da substituição
 */
export async function substituirVariaveisNoEscopo(
  nodes: readonly SceneNode[],
  variaveisParaSubstituir: VariableToReplace[],
  libraryId: string,
  collectionId: string
): Promise<SubstitutionResult> {
  try {
    console.log(`[VARIABLES] Substituindo variáveis no escopo. Biblioteca: ${libraryId}, Coleção: ${collectionId}`);
    console.log(`[VARIABLES] Variáveis para substituir: ${variaveisParaSubstituir.length}`);
    
    // Implementação da lógica de substituição (código existente refatorado)
    // ...

    // Retornar resultado
    return { sucessos, falhas };
  } catch (error) {
    console.error(`[VARIABLES] Erro ao substituir variáveis: ${error.message}`);
    return { sucessos: 0, falhas: 0 };
  }
}

/**
 * Pré-visualiza correspondências entre biblioteca e coleção local
 * @param libraryId ID da biblioteca
 * @param localCollectionId ID da coleção local
 * @returns Lista de correspondências encontradas
 */
export async function preVisualizarCorrespondencias(
  libraryId: string, 
  localCollectionId: string
): Promise<VariableMatch[]> {
  try {
    console.log(`[VARIABLES] Pré-visualizando correspondências. Biblioteca: ${libraryId}, Coleção Local: ${localCollectionId}`);
    
    // Implementação da lógica de pré-visualização (código existente refatorado)
    // ...

    // Retornar correspondências
    return correspondencias;
  } catch (error) {
    console.error(`[VARIABLES] Erro ao pré-visualizar correspondências: ${error.message}`);
    return [];
  }
}

// Outras funções do controlador
```

## 3. Mensagens (messages.ts)

Definir as mensagens para comunicação entre o plugin e a UI:

```typescript
// src/features/variables/messages.ts
import { VariableInfo, VariableMatch, VariableToReplace } from './model';

// Mensagens enviadas da UI para o plugin
export interface SearchVariablesRequest {
  type: 'procurarVariaveisEEstilos';
  options: {
    scope: 'selection' | 'page';
    libraryId?: string;
    collectionId?: string;
  };
}

export interface PreviewMatchesRequest {
  type: 'preVisualizarCorrespondencias';
  libraryId: string;
  localCollectionId: string;
}

export interface ReplaceVariablesRequest {
  type: 'substituirVariaveisEmColecao';
  matches: VariableMatch[];
}

// Mensagens enviadas do plugin para a UI
export interface SearchVariablesResponse {
  type: 'variables-found';
  variables: VariableInfo[];
}

export interface PreviewMatchesResponse {
  type: 'matches-preview';
  matches: VariableMatch[];
}

export interface ReplaceVariablesResponse {
  type: 'variables-replaced';
  result: {
    sucessos: number;
    falhas: number;
  };
}

// União de todos os tipos de mensagens
export type VariablesMessageToPlugin = 
  | SearchVariablesRequest
  | PreviewMatchesRequest
  | ReplaceVariablesRequest;

export type VariablesMessageFromPlugin = 
  | SearchVariablesResponse
  | PreviewMatchesResponse
  | ReplaceVariablesResponse;
```

## 4. View (view.ts)

Implementar componentes de UI específicos para a feature de variáveis:

```typescript
// src/features/variables/view.ts
import { VariableInfo, VariableMatch } from './model';

/**
 * Formata a lista de variáveis para exibição na UI
 * @param variables Lista de variáveis
 * @returns HTML formatado para exibição
 */
export function formatVariablesList(variables: VariableInfo[]): string {
  if (!variables || variables.length === 0) {
    return '<p class="no-variables">Nenhuma variável encontrada</p>';
  }

  // Agrupar variáveis por tipo
  const variablesByType: Record<string, VariableInfo[]> = {};
  
  variables.forEach(variable => {
    const type = variable.type || 'Desconhecido';
    if (!variablesByType[type]) {
      variablesByType[type] = [];
    }
    variablesByType[type].push(variable);
  });

  // Gerar HTML para cada grupo
  let html = '';
  
  Object.keys(variablesByType).forEach(type => {
    const typeVariables = variablesByType[type];
    
    html += `
      <div class="variable-group">
        <h3 class="variable-type">${type} (${typeVariables.length})</h3>
        <div class="variable-list">
    `;
    
    typeVariables.forEach(variable => {
      const colorPreview = variable.colorValue 
        ? `<span class="color-preview" style="background-color: ${variable.colorValue}"></span>` 
        : '';
      
      html += `
        <div class="variable-item" data-id="${variable.nodeId}" data-property="${variable.property}">
          ${colorPreview}
          <div class="variable-details">
            <div class="variable-name">${variable.name}</div>
            <div class="variable-collection">${variable.collection}</div>
          </div>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  });
  
  return html;
}

/**
 * Formata a lista de correspondências para exibição na UI
 * @param matches Lista de correspondências
 * @param page Página atual
 * @param itemsPerPage Itens por página
 * @returns HTML formatado para exibição
 */
export function formatMatchesList(
  matches: VariableMatch[], 
  page: number = 1, 
  itemsPerPage: number = 30
): string {
  if (!matches || matches.length === 0) {
    return '<p class="no-matches">Nenhuma correspondência encontrada</p>';
  }

  // Calcular índices para paginação
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, matches.length);
  const currentMatches = matches.slice(startIndex, endIndex);
  
  // Gerar HTML para as correspondências
  let html = '';
  
  currentMatches.forEach((match, index) => {
    html += `
      <div class="match-item" data-index="${startIndex + index}">
        <div class="match-details">
          <div class="match-local">
            <span class="match-label">Local:</span>
            <span class="match-value">${match.localName}</span>
          </div>
          <div class="match-library">
            <span class="match-label">Biblioteca:</span>
            <span class="match-value">${match.libraryName}</span>
          </div>
          <div class="match-type">
            <span class="match-label">Tipo:</span>
            <span class="match-value">${match.valueType}</span>
          </div>
        </div>
    `;
    
    // Adicionar modos se existirem
    if (match.modes && match.modes.length > 0) {
      html += `<div class="match-modes">`;
      
      match.modes.forEach(mode => {
        html += `
          <div class="match-mode">
            <span class="mode-name">${mode.name}:</span>
            <span class="mode-value">${mode.value}</span>
          </div>
        `;
      });
      
      html += `</div>`;
    }
    
    html += `</div>`;
  });
  
  // Adicionar controles de paginação
  const totalPages = Math.ceil(matches.length / itemsPerPage);
  
  if (totalPages > 1) {
    html += `
      <div class="pagination-controls">
        <button class="pagination-prev" ${page <= 1 ? 'disabled' : ''}>Anterior</button>
        <span class="pagination-info">Página ${page} de ${totalPages}</span>
        <button class="pagination-next" ${page >= totalPages ? 'disabled' : ''}>Próxima</button>
      </div>
    `;
  }
  
  return html;
}

// Outras funções de UI
```

## 5. Integração no Código Principal

### No arquivo `src/code.ts`:

```typescript
// Importar controladores
import * as VariablesController from './features/variables/controller';
import { VariablesMessageToPlugin } from './features/variables/messages';

// No manipulador de mensagens
figma.ui.onmessage = async (msg) => {
  // Roteamento para a feature de variáveis
  switch (msg.type) {
    case 'procurarVariaveisEEstilos':
      try {
        const variables = await VariablesController.buscarVariaveisEEstilos(msg.options.scope);
        figma.ui.postMessage({ 
          type: 'variables-found', 
          variables 
        });
      } catch (error) {
        figma.ui.postMessage({ 
          type: 'error', 
          message: `Erro ao buscar variáveis: ${error.message}` 
        });
      }
      break;
      
    case 'preVisualizarCorrespondencias':
      try {
        const matches = await VariablesController.preVisualizarCorrespondencias(
          msg.libraryId, 
          msg.localCollectionId
        );
        figma.ui.postMessage({ 
          type: 'matches-preview', 
          matches 
        });
      } catch (error) {
        figma.ui.postMessage({ 
          type: 'error', 
          message: `Erro ao pré-visualizar correspondências: ${error.message}` 
        });
      }
      break;
      
    case 'substituirVariaveisEmColecao':
      try {
        const result = await VariablesController.substituirVariaveisEmColecao(msg.matches);
        figma.ui.postMessage({ 
          type: 'variables-replaced', 
          result 
        });
      } catch (error) {
        figma.ui.postMessage({ 
          type: 'error', 
          message: `Erro ao substituir variáveis: ${error.message}` 
        });
      }
      break;
      
    // Outros casos
  }
};
```

### No arquivo `src/ui.ts`:

```typescript
// Importar componentes de UI
import { formatVariablesList, formatMatchesList } from './features/variables/view';
import { VariablesMessageFromPlugin } from './features/variables/messages';

// No manipulador de mensagens
window.onmessage = (event) => {
  const message = event.data.pluginMessage;
  
  if (!message) return;
  
  // Roteamento para a feature de variáveis
  switch (message.type) {
    case 'variables-found':
      // Atualizar a UI com as variáveis encontradas
      const variablesContainer = document.getElementById('variables-container');
      if (variablesContainer) {
        variablesContainer.innerHTML = formatVariablesList(message.variables);
      }
      hideLoadingOverlay();
      break;
      
    case 'matches-preview':
      // Atualizar a UI com as correspondências
      const matchesContainer = document.getElementById('matches-container');
      if (matchesContainer) {
        // Armazenar as correspondências no estado global para paginação
        window.paginationState.matches = message.matches;
        window.paginationState.currentPage = 1;
        
        // Formatar e exibir
        matchesContainer.innerHTML = formatMatchesList(
          message.matches,
          window.paginationState.currentPage,
          window.paginationState.itemsPerPage
        );
        
        // Configurar eventos de paginação
        setupPaginationEvents();
      }
      hideLoadingOverlay();
      break;
      
    case 'variables-replaced':
      // Mostrar resultado da substituição
      const { sucessos, falhas } = message.result;
      showInfoVar(`Substituição concluída: ${sucessos} variáveis substituídas com sucesso, ${falhas} falhas.`);
      hideLoadingOverlay();
      break;
      
    // Outros casos
  }
};

// Eventos de UI
document.getElementById('search-variables-button')?.addEventListener('click', () => {
  const scope = (document.getElementById('scope-select') as HTMLSelectElement).value as 'selection' | 'page';
  
  showLoadingOverlay("Buscando variáveis...");
  
  // Enviar mensagem para o plugin
  parent.postMessage({
    pluginMessage: {
      type: 'procurarVariaveisEEstilos',
      options: { scope }
    }
  }, '*');
});

// Outros eventos de UI
```

## 6. Benefícios desta Implementação

1. **Separação de Responsabilidades**: Cada arquivo tem uma responsabilidade clara
2. **Manutenibilidade**: Código mais organizado e fácil de manter
3. **Testabilidade**: Funções isoladas são mais fáceis de testar
4. **Reutilização**: Componentes de UI podem ser reutilizados em diferentes partes do plugin
5. **Escalabilidade**: Facilidade para adicionar novas funcionalidades à feature

## 7. Próximos Passos

Após implementar esta feature, seguir o mesmo padrão para as outras features do plugin:

1. **Libraries**: Gerenciamento de bibliotecas
2. **Collections**: Gerenciamento de coleções
3. **Settings**: Configurações do plugin

Cada feature deve seguir a mesma estrutura modular, com clara separação entre modelo, controlador e visualização.
