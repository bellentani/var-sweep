/// <reference types="@figma/plugin-typings" />

// Esta é a estrutura de uma biblioteca
interface BibliotecaInfo {
  id: string;
  name: string;
  type: string;
  isRemote: boolean; // Indicador se é uma biblioteca remota ou local
}

// Estrutura para coleções de variáveis
interface ColecaoVariaveis {
  id: string;
  name: string;
  variableIds?: string[];
}

// Extensão da interface VariableCollection para adicionar propriedades não documentadas
interface VariableCollectionExtended {
  id: string;
  name: string;
  hiddenFromPublishing: boolean;
  defaultModeId: string;
  modes: any[]; // Simplificado para any[]
  remote: boolean;
  libraryName?: string;
  libraryId?: string;
}

// Extensão da interface PaintStyle para adicionar propriedades não documentadas
interface PaintStyleExtended {
  id: string;
  name: string;
  type: string;
  paints: ReadonlyArray<Paint>;
  // @ts-ignore
  remote: boolean;
  libraryName?: string;
  libraryId?: string;
}

console.log("Plugin iniciado");

// Verifica acesso às APIs necessárias
if (!figma.currentPage) {
  figma.notify("Erro: Não foi possível acessar a página atual");
  figma.closePlugin();
}

// Função que serializa objetos de forma segura (evitando circular references)
function serializarComSeguranca(obj: any) {
  try {
    const visto = new WeakSet();
    
    return JSON.stringify(obj, (key, value) => {
      // Ignora fields com underscore (properties internas do Figma)
      if (key.startsWith('_')) {
        return undefined;
      }
      
      // Para objetos e arrays, verifica se já foi visto 
      if (typeof value === 'object' && value !== null) {
        if (visto.has(value)) {
          return '[Circular Reference]';
        }
        visto.add(value);
      }
      
      return value;
    });
  } catch (e) {
    console.error('Erro ao serializar objeto:', e);
    return JSON.stringify({ erro: 'Falha ao serializar' });
  }
}

// Carrega as bibliotecas disponíveis
async function carregarBibliotecas(): Promise<BibliotecaInfo[]> {
  console.log("Iniciando carregamento de bibliotecas");
  
  const bibliotecasMap = new Map<string, BibliotecaInfo>();
  
  try {
    console.log("MÉTODO 1: Obtendo bibliotecas remotas de variáveis");
    try {
      // Primeiro tenta obter bibliotecas conectadas
      const variableCollections = await figma.variables.getLocalVariableCollectionsAsync();
      console.log(`Encontradas ${variableCollections.length} coleções de variáveis`);
      
      // Vamos fazer um log detalhado de cada coleção para depuração
      for (let i = 0; i < variableCollections.length; i++) {
        const collection = variableCollections[i];
        const extendedCollection = collection as unknown as VariableCollectionExtended;
        
        console.log(`Coleção ${i+1}: ${collection.name}`);
        console.log(`- ID: ${collection.id}`);
        console.log(`- Remote: ${extendedCollection.remote}`);
        console.log(`- LibraryName: ${extendedCollection.libraryName}`);
        console.log(`- LibraryId: ${extendedCollection.libraryId}`);
      }
      
      // Criar um mapa para agrupar coleções por biblioteca
      const bibliotecasRemotasMap = new Map<string, string[]>();
      
      // Primeiro identificar todas as bibliotecas remotas nas coleções
      for (const collection of variableCollections) {
        // Use type assertion para acessar propriedades não documentadas
        const extendedCollection = collection as unknown as VariableCollectionExtended;
        
        // Vamos relaxar a condição para considerar bibliotecas remotas
        // Antes checávamos: remote && libraryName && libraryId
        // Agora consideramos uma biblioteca remota se qualquer um desses critérios for atendido
        const isRemote = extendedCollection.remote === true;
        const hasLibraryName = typeof extendedCollection.libraryName === 'string' && extendedCollection.libraryName.trim().length > 0;
        const hasLibraryId = typeof extendedCollection.libraryId === 'string' && extendedCollection.libraryId.trim().length > 0;
        
        // Se tem qualquer indicação de ser uma biblioteca remota
        if (isRemote || hasLibraryName || hasLibraryId) {
          // Definir um ID para a biblioteca (preferindo libraryId, mas usando o que estiver disponível)
          const bibliotecaId = extendedCollection.libraryId || 
                              (extendedCollection.libraryName ? `name-${extendedCollection.libraryName}` : collection.id);
          
          // Definir o nome da biblioteca (preferindo libraryName, mas usando o que estiver disponível)
          const bibliotecaName = extendedCollection.libraryName || 
                               (collection.name.includes('/') ? collection.name.split('/')[0] : collection.name);
          
          console.log(`Detectada biblioteca potencialmente remota: ${bibliotecaName} (ID: ${bibliotecaId})`);
          console.log(`- Remote: ${isRemote}, hasLibraryName: ${hasLibraryName}, hasLibraryId: ${hasLibraryId}`);
          
          // Só adiciona se ainda não existir no Map
          if (!bibliotecasMap.has(bibliotecaId)) {
            console.log(`Adicionando biblioteca remota: ${bibliotecaName} (ID: ${bibliotecaId})`);
            
            bibliotecasMap.set(bibliotecaId, {
              id: bibliotecaId,
              name: bibliotecaName,
              type: 'Variáveis',
              isRemote: true
            });
            
            // Inicializa o array de coleções para esta biblioteca
            if (!bibliotecasRemotasMap.has(bibliotecaId)) {
              bibliotecasRemotasMap.set(bibliotecaId, []);
            }
          }
          
          // Adiciona a coleção à lista desta biblioteca
          const colecoes = bibliotecasRemotasMap.get(bibliotecaId) || [];
          colecoes.push(collection.id);
          bibliotecasRemotasMap.set(bibliotecaId, colecoes);
        }
      }
      
      // Log para depuração das bibliotecas remotas encontradas
      console.log(`Encontradas ${bibliotecasMap.size} bibliotecas remotas de variáveis`);
      bibliotecasRemotasMap.forEach((colecoes, bibliotecaId) => {
        console.log(`Biblioteca ${bibliotecaId} tem ${colecoes.length} coleções associadas`);
      });
      
    } catch (error) {
      console.error("Erro ao obter coleções de variáveis de bibliotecas remotas:", error);
    }
    
    console.log(`Total de bibliotecas remotas encontradas: ${bibliotecasMap.size}`);
    const bibliotecasArray = Array.from(bibliotecasMap.values());
    
    // Ordena as bibliotecas por nome para melhor usabilidade
    bibliotecasArray.sort((a, b) => a.name.localeCompare(b.name));
    
    return bibliotecasArray;
  } catch (error) {
    console.error("Erro ao carregar bibliotecas:", error);
    return [];
  }
}

// Função para obter as coleções de variáveis de uma biblioteca específica
async function obterColecoesDeVariaveis(libraryId: string): Promise<ColecaoVariaveis[]> {
  console.log(`Obtendo coleções da biblioteca remota ${libraryId}`);
  const colecoes: ColecaoVariaveis[] = [];
  
  try {
    // Obter todas as coleções de variáveis locais
    const variableCollections = await figma.variables.getLocalVariableCollectionsAsync();
    console.log(`Total de coleções encontradas: ${variableCollections.length}`);
    
    // Filtrar apenas coleções que são dessa biblioteca remota
    for (const collection of variableCollections) {
      // Use type assertion para acessar propriedades não documentadas
      const extendedCollection = collection as unknown as VariableCollectionExtended;
      
      // Extrai IDs que podem identificar a biblioteca
      const collectionLibraryId = extendedCollection.libraryId || '';
      const nameBasedId = extendedCollection.libraryName ? `name-${extendedCollection.libraryName}` : '';
      
      // Log para depuração
      console.log(`Verificando coleção: ${collection.name}`);
      console.log(`- Biblioteca solicitada: ${libraryId}`);
      console.log(`- ID da biblioteca da coleção: ${collectionLibraryId}`);
      console.log(`- ID baseado em nome: ${nameBasedId}`);
      console.log(`- É remota: ${extendedCollection.remote}`);
      
      // Verifica se a coleção pertence à biblioteca solicitada (usando diferentes formas de identificação)
      const matchesLibraryId = collectionLibraryId === libraryId;
      const matchesNameBasedId = nameBasedId === libraryId;
      const isDirectMatch = collection.id === libraryId;
      
      // Se qualquer um dos critérios for verdadeiro, consideramos que esta coleção pertence à biblioteca
      if (matchesLibraryId || matchesNameBasedId || isDirectMatch) {
        console.log(`Encontrada coleção para a biblioteca: ${collection.name}`);
        
        try {
          // Obter as variáveis dessa coleção
          // @ts-ignore - O tipo correto é string
          const variables = await figma.variables.getLocalVariablesAsync(collection.id);
          
          colecoes.push({
            id: collection.id,
            name: collection.name,
            variableIds: variables.map(v => v.id)
          });
        } catch (variableError) {
          console.error(`Erro ao obter variáveis da coleção ${collection.name}:`, variableError);
          // Ainda adiciona a coleção, mesmo sem as variáveis
          colecoes.push({
            id: collection.id,
            name: collection.name,
            variableIds: []
          });
        }
      }
    }
    
    console.log(`Total de coleções encontradas para a biblioteca ${libraryId}: ${colecoes.length}`);
    
    // Ordenar coleções por nome
    colecoes.sort((a, b) => a.name.localeCompare(b.name));
    
    return colecoes;
  } catch (error: any) {
    console.error(`Erro ao obter coleções da biblioteca ${libraryId}:`, error);
    return [];
  }
}

// Mostra a interface do usuário
figma.showUI(__html__, { width: 450, height: 500 });
console.log("UI exibida");

// Manipula mensagens da UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'recarregar' || msg.type === 'ui-ready') {
    console.log("Solicitação para recarregar bibliotecas");
    
    try {
      const bibliotecas = await carregarBibliotecas();
      console.log(`Carregadas ${bibliotecas.length} bibliotecas remotas de variáveis`);
      
      // Envia as bibliotecas para a UI
      figma.ui.postMessage({
        type: 'libraries-data',
        libraries: bibliotecas,
        message: bibliotecas.length === 0 ? 
          "Não foram encontradas bibliotecas de variáveis conectadas a este documento." : 
          `Encontradas ${bibliotecas.length} bibliotecas de variáveis.`
      });
    } catch (error: any) {
      console.error("Erro ao recarregar bibliotecas:", error);
      figma.ui.postMessage({
        type: 'error',
        message: "Erro ao carregar bibliotecas: " + error.message
      });
    }
  }
  
  // Quando a UI solicita as coleções de uma biblioteca específica
  if (msg.type === 'obterColecoes') {
    console.log(`Solicitação para carregar coleções da biblioteca ${msg.libraryId}`);
    
    try {
      const colecoes = await obterColecoesDeVariaveis(msg.libraryId);
      
      // Envia as coleções para a UI
      figma.ui.postMessage({
        type: 'collections-data',
        collections: colecoes
      });
    } catch (error: any) {
      console.error(`Erro ao carregar coleções da biblioteca ${msg.libraryId}:`, error);
      figma.ui.postMessage({
        type: 'error',
        message: "Erro ao carregar coleções: " + error.message
      });
    }
  }
  
  // Quando é solicitado o fechamento do plugin
  if (msg.type === 'fechar') {
    console.log("Fechando plugin");
    figma.closePlugin();
  }
}; 