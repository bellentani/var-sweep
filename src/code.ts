/// <reference types="@figma/plugin-typings" />

// Esta é a estrutura de uma biblioteca
interface BibliotecaInfo {
  id: string;
  name: string;
  type: string;
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
    console.log("MÉTODO 1: Obtendo coleções de variáveis");
    try {
      // Primeiro tenta obter bibliotecas a partir de coleções de variáveis
      const variableCollections = await figma.variables.getLocalVariableCollectionsAsync();
      console.log(`Encontradas ${variableCollections.length} coleções de variáveis locais`);
      
      for (const collection of variableCollections) {
        // Use type assertion para acessar propriedades não documentadas
        const extendedCollection = collection as unknown as VariableCollectionExtended;
        const key = extendedCollection.libraryName || collection.name;
        
        if (extendedCollection.remote && extendedCollection.libraryName) {
          console.log(`Adicionando biblioteca remota: ${extendedCollection.libraryName}`);
          
          if (!bibliotecasMap.has(key)) {
            bibliotecasMap.set(key, {
              id: extendedCollection.libraryId || collection.id,
              name: extendedCollection.libraryName,
              type: 'Variáveis'
            });
          }
        } else {
          console.log(`Adicionando biblioteca local: ${collection.name}`);
          
          if (!bibliotecasMap.has(key)) {
            bibliotecasMap.set(key, {
              id: collection.id,
              name: collection.name,
              type: 'Variáveis'
            });
          }
        }
      }
    } catch (error) {
      console.error("Erro ao obter coleções de variáveis:", error);
    }
    
    // MÉTODO 1.5: Tentar usar getAvailableLibrariesAsync, com verificação de segurança
    try {
      console.log("MÉTODO 1.5: Verificando se getAvailableLibrariesAsync existe");
      
      if (figma.teamLibrary && 'getAvailableLibrariesAsync' in figma.teamLibrary) {
        console.log("Método getAvailableLibrariesAsync encontrado, tentando usar");
        // @ts-ignore - Esta API não está completamente tipada
        const librariesResult = await figma.teamLibrary.getAvailableLibrariesAsync();
        
        console.log(`Obtidas ${librariesResult.length} bibliotecas via getAvailableLibrariesAsync`);
        console.log("Estrutura da primeira biblioteca:", serializarComSeguranca(librariesResult[0]));
        
        for (const lib of librariesResult) {
          let libraryName = '';
          let libraryId = '';
          
          // Tenta extrair o nome da biblioteca de diferentes propriedades
          if (lib.name) {
            libraryName = lib.name;
          } else if (lib.libraryName) { 
            libraryName = lib.libraryName;
          } else if (lib.title) {
            libraryName = lib.title;
          } else {
            libraryName = 'Biblioteca ' + (lib.id || 'Desconhecida');
          }
          
          // Tenta extrair o ID da biblioteca
          libraryId = lib.id || lib.libraryId || '';
          
          // Só adiciona se ainda não existir uma biblioteca com este nome
          if (libraryId && !bibliotecasMap.has(libraryName)) {
            console.log(`Adicionando biblioteca de componentes: ${libraryName}`);
            bibliotecasMap.set(libraryName, {
              id: libraryId,
              name: libraryName,
              type: 'Componentes'
            });
          }
        }
      } else {
        console.log("Método getAvailableLibrariesAsync não encontrado");
      }
    } catch (error) {
      console.error("Erro ao usar getAvailableLibrariesAsync:", error);
    }
    
    console.log("MÉTODO 2: Verificando estilos locais para detectar bibliotecas");
    try {
      // Verifica estilos locais
      for (const styleType of ['PAINT', 'TEXT', 'EFFECT', 'GRID']) {
        // @ts-ignore - styleType é válido
        const styles = await figma.getLocalPaintStylesAsync();
        
        for (const style of styles) {
          // Use type assertion para acessar propriedades não documentadas
          const extendedStyle = style as unknown as PaintStyleExtended;
          
          if (extendedStyle.remote && extendedStyle.libraryName) {
            const key = extendedStyle.libraryName;
            
            if (!bibliotecasMap.has(key)) {
              console.log(`Adicionando biblioteca de estilos: ${extendedStyle.libraryName}`);
              bibliotecasMap.set(key, {
                id: extendedStyle.libraryId || '',
                name: extendedStyle.libraryName,
                type: 'Estilos'
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Erro ao verificar estilos locais:", error);
    }
    
    console.log("MÉTODO 3: Procurando por instâncias de componentes");
    try {
      // Procura por instâncias de componentes
      for (const page of figma.root.children) {
        console.log(`Verificando página: ${page.name}`);
        
        const instanceNodes = page.findAll(node => node.type === 'INSTANCE');
        console.log(`Encontradas ${instanceNodes.length} instâncias de componentes`);
        
        for (const instance of instanceNodes) {
          // @ts-ignore
          if (instance.mainComponent && instance.mainComponent.remote) {
            // @ts-ignore
            const libraryName = instance.mainComponent.libraryName;
            // @ts-ignore
            const libraryId = instance.mainComponent.libraryId;
            
            if (libraryName && !bibliotecasMap.has(libraryName)) {
              console.log(`Adicionando biblioteca de componentes: ${libraryName}`);
              bibliotecasMap.set(libraryName, {
                id: libraryId || '',
                name: libraryName,
                type: 'Componentes'
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Erro ao procurar por instâncias de componentes:", error);
    }
    
    console.log(`Total de bibliotecas encontradas: ${bibliotecasMap.size}`);
    const bibliotecasArray = Array.from(bibliotecasMap.values());
    
    return bibliotecasArray;
  } catch (error) {
    console.error("Erro ao carregar bibliotecas:", error);
    return [];
  }
}

// Função para obter as coleções de variáveis de uma biblioteca específica
async function obterColecoesDeVariaveis(libraryId: string): Promise<ColecaoVariaveis[]> {
  console.log(`Obtendo coleções da biblioteca ${libraryId}`);
  const colecoes: ColecaoVariaveis[] = [];
  
  try {
    // Obter todas as coleções de variáveis e filtrar pelo libraryId
    const variableCollections = await figma.variables.getLocalVariableCollectionsAsync();
    
    for (const collection of variableCollections) {
      // Verifica se a coleção pertence à biblioteca solicitada
      // Use type assertion para acessar propriedades não documentadas
      const extendedCollection = collection as unknown as VariableCollectionExtended;
      const collectionLibraryId = extendedCollection.libraryId || collection.id;
      
      if (collectionLibraryId === libraryId) {
        console.log(`Encontrada coleção: ${collection.name}`);
        
        // Obter as variáveis dessa coleção
        // @ts-ignore - O tipo correto é string
        const variables = await figma.variables.getLocalVariablesAsync(collection.id);
        
        colecoes.push({
          id: collection.id,
          name: collection.name,
          variableIds: variables.map(v => v.id)
        });
      }
    }
    
    console.log(`Total de coleções encontradas: ${colecoes.length}`);
    return colecoes;
  } catch (error: any) {
    console.error(`Erro ao obter coleções da biblioteca ${libraryId}:`, error);
    return [];
  }
}

// Mostra a interface do usuário
figma.showUI(__html__, { width: 450, height: 500 });
console.log("UI exibida");

// Esta é a função principal executada quando o plugin inicia
figma.showUI(__html__, { width: 400, height: 500 });

// Manipula mensagens da UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'recarregar' || msg.type === 'ui-ready') {
    console.log("Solicitação para recarregar bibliotecas");
    
    try {
      const bibliotecas = await carregarBibliotecas();
      console.log(`Carregadas ${bibliotecas.length} bibliotecas`);
      
      // Envia as bibliotecas para a UI
      figma.ui.postMessage({
        type: 'libraries-data',
        libraries: bibliotecas,
        message: bibliotecas.length === 0 ? 
          "Não foram encontradas bibliotecas conectadas a este documento." : 
          `Encontradas ${bibliotecas.length} bibliotecas conectadas.`
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