/// <reference types="@figma/plugin-typings" />

// Definição dos tipos necessários
interface BibliotecaInfo {
  id: string;
  name: string;
  library: string;
  type: string;
}

interface ColecaoInfo {
  id: string;
  name: string;
  type?: string;
}

// Interface para armazenar o estado do plugin
interface PluginState {
  activeTab?: string;
  libraryId?: string;
}

// Estado global do plugin
const pluginState: PluginState = {
  activeTab: '',
  libraryId: ''
};

console.log("Plugin iniciado");

// Verifica acesso às APIs necessárias
if (!figma.currentPage) {
  figma.notify("Erro: Não foi possível acessar a página atual");
  figma.closePlugin();
}

// Mostra a interface do usuário
figma.showUI(__html__, { width: 450, height: 600 });
console.log("UI exibida");

// Armazenar a aba ativa e bibliotecas 
let activeTab = 'update-collections'; // valor padrão
let selectedLibraryId = '';

// Adicionar listener para mudanças na seleção
figma.on('selectionchange', () => {
  console.log('Seleção mudou. Aba ativa:', activeTab);
  
  // Se a aba ativa for 'update-variables', atualizar a prévia
  if (activeTab === 'update-variables' && selectedLibraryId) {
    console.log('Atualizando prévia após mudança na seleção com biblioteca:', selectedLibraryId);
    // Enviar mensagem para a UI indicando que o processo começou
    figma.ui.postMessage({ type: 'loading-preview-start' });
    preVisualizarSubstituicaoNos(selectedLibraryId, 'selection');
  }
});

// Função para serializar objetos de forma segura
function serializarSeguro(obj: any): string {
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

// Função para listar bibliotecas únicas conectadas ao arquivo
async function carregarBibliotecas(): Promise<void> {
  try {
    console.log("Iniciando carregamento de bibliotecas...");
    
    // Usamos um Map para garantir que cada biblioteca apareça apenas uma vez
    // A chave é o nome da biblioteca, o valor é a informação da biblioteca
    const bibliotecasMap = new Map<string, BibliotecaInfo>();

    // MÉTODO 1: Obter bibliotecas de variáveis
    try {
      console.log("1. Buscando bibliotecas de variáveis...");
      // @ts-ignore - API pode não estar nas tipagens
      const variableCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
      
      if (variableCollections && Array.isArray(variableCollections)) {
        console.log(`Encontradas ${variableCollections.length} coleções de variáveis`);
        console.log("Estrutura:", serializarSeguro(variableCollections));
        
        // Percorre as coleções para extrair bibliotecas únicas
        for (let i = 0; i < variableCollections.length; i++) {
          try {
            const collection = variableCollections[i] as any;
            
            // A propriedade importante é libraryName, que contém o nome da biblioteca real
            if (collection && typeof collection.libraryName === 'string') {
              const bibliotecaName = collection.libraryName;
              
              // Só adiciona se ainda não existir no Map
              if (!bibliotecasMap.has(bibliotecaName)) {
                const bibliotecaId = collection.key || `lib-var-${Date.now()}-${i}`;
                
                bibliotecasMap.set(bibliotecaName, {
                  id: bibliotecaId,
                  name: bibliotecaName,
                  library: "Biblioteca de Variáveis",
                  type: "Variáveis"
                });
                
                console.log(`Adicionada biblioteca única: ${bibliotecaName} (Variáveis)`);
              }
            }
          } catch (err) {
            console.warn("Erro ao processar coleção:", err);
          }
        }
      }
    } catch (err) {
      console.warn("Erro ao buscar bibliotecas de variáveis:", err);
    }
    
    // MÉTODO 1.5: Nova tentativa com getAvailableLibrariesAsync (pode não existir em todas versões da API)
    try {
      console.log("1.5. Tentando novamente com getAvailableLibrariesAsync...");
      
      // Verificar se a função existe antes de tentar chamá-la
      // @ts-ignore
      const hasGetLibraries = typeof figma.teamLibrary?.getAvailableLibrariesAsync === 'function';
      
      if (hasGetLibraries) {
        console.log("Função getAvailableLibrariesAsync disponível, tentando usar...");
        try {
          // @ts-ignore
          const libraries = await figma.teamLibrary.getAvailableLibrariesAsync();
          
          if (libraries && Array.isArray(libraries)) {
            console.log(`Encontradas ${libraries.length} bibliotecas via getAvailableLibrariesAsync`);
            console.log("Estrutura:", serializarSeguro(libraries));
            
            // Percorre as bibliotecas
            for (let i = 0; i < libraries.length; i++) {
              try {
                const lib = libraries[i] as any;
                
                if (typeof lib === 'object' && lib !== null) {
                  // Tenta extrair o nome da forma mais segura possível
                  let bibliotecaName = "";
                  
                  // Tenta várias propriedades para encontrar o nome
                  if (typeof lib.name === 'string') {
                    bibliotecaName = lib.name.trim();
                  } else if (lib.library && typeof lib.library.name === 'string') {
                    bibliotecaName = lib.library.name.trim();
                  } else if (typeof lib.id === 'string' || typeof lib.key === 'string') {
                    bibliotecaName = (lib.id || lib.key).trim();
                  }
                  
                  // Se encontramos um nome, adicionamos à lista
                  if (bibliotecaName && !bibliotecasMap.has(bibliotecaName)) {
                    const bibliotecaId = lib.id || lib.key || `lib-comp-${Date.now()}-${i}`;
                    
                    bibliotecasMap.set(bibliotecaName, {
                      id: bibliotecaId,
                      name: bibliotecaName,
                      library: "Biblioteca de Componentes",
                      type: "Componentes"
                    });
                    
                    console.log(`Adicionada biblioteca via getAvailableLibrariesAsync: ${bibliotecaName}`);
                  }
                }
              } catch (itemErr) {
                console.warn(`Erro ao processar biblioteca ${i}:`, itemErr);
              }
            }
          }
        } catch (funcErr) {
          console.warn("Erro ao chamar getAvailableLibrariesAsync:", funcErr);
        }
      } else {
        console.log("Função getAvailableLibrariesAsync não está disponível na API");
        
        // Tentar outras abordagens
        // @ts-ignore
        if (typeof figma.libraries === 'object' && figma.libraries) {
          console.log("Objeto figma.libraries disponível, tentando acessar...");
          
          try {
            // @ts-ignore
            console.log("Conteúdo de figma.libraries:", serializarSeguro(figma.libraries));
            
            // @ts-ignore
            const libs = figma.libraries;
            if (Array.isArray(libs)) {
              for (let i = 0; i < libs.length; i++) {
                const lib = libs[i];
                if (lib && typeof lib.name === 'string') {
                  const bibliotecaName = lib.name.trim();
                  
                  if (bibliotecaName && !bibliotecasMap.has(bibliotecaName)) {
                    const bibliotecaId = lib.id || `lib-direct-${Date.now()}-${i}`;
                    
                    bibliotecasMap.set(bibliotecaName, {
                      id: bibliotecaId,
                      name: bibliotecaName,
                      library: "Biblioteca",
                      type: "Componentes"
                    });
                    
                    console.log(`Adicionada biblioteca diretamente: ${bibliotecaName}`);
                  }
                }
              }
            } else if (typeof libs === 'object') {
              // Talvez seja um objeto com propriedades
              Object.keys(libs).forEach(key => {
                if (!bibliotecasMap.has(key) && key.length > 0) {
                  bibliotecasMap.set(key, {
                    id: `lib-key-${Date.now()}-${key}`,
                    name: key,
                    library: "Biblioteca",
                    type: "Componentes"
                  });
                  
                  console.log(`Adicionada biblioteca via chave: ${key}`);
                }
              });
            }
          } catch (libsErr) {
            console.warn("Erro ao acessar figma.libraries:", libsErr);
          }
        }
      }
    } catch (methodErr) {
      console.warn("Erro ao tentar método alternativo para bibliotecas:", methodErr);
    }
    
    // MÉTODO 2: Tentar detectar bibliotecas usando métodos alternativos
    try {
      console.log("2. Tentando métodos alternativos para detectar bibliotecas de componentes...");
      
      // Verificar todos os estilos disponíveis que podem ser de bibliotecas
      const paintStyles = figma.getLocalPaintStyles();
      const textStyles = figma.getLocalTextStyles();
      const effectStyles = figma.getLocalEffectStyles();
      const gridStyles = figma.getLocalGridStyles();
      
      console.log(`Encontrados: ${paintStyles.length} estilos de cor, ${textStyles.length} estilos de texto, ${effectStyles.length} estilos de efeito, ${gridStyles.length} estilos de grid`);
      
      // Função para processar estilos e obter nomes de bibliotecas
      const processarEstilos = (estilos: BaseStyle[]) => {
        for (const estilo of estilos) {
          try {
            // Verifica se o estilo é de uma biblioteca remota
            if (estilo.remote === true) {
              // Tenta obter o nome da biblioteca
              let bibliotecaName = "";
              
              // Tenta extrair do nome do estilo
              if (typeof estilo.name === 'string' && estilo.name.includes('/')) {
                bibliotecaName = estilo.name.split('/')[0].trim();
              }
              
              // Se não encontrou, tenta extrair da key
              if (!bibliotecaName && typeof estilo.key === 'string' && estilo.key.includes(';')) {
                // Tenta pegar a primeira parte da key
                const keyParts = estilo.key.split(';');
                if (keyParts.length > 0) {
                  bibliotecaName = keyParts[0].trim();
                }
              }
              
              // Se encontramos um nome, adicionamos à lista
              if (bibliotecaName && !bibliotecasMap.has(bibliotecaName)) {
                const bibliotecaId = `lib-style-${Date.now()}-${bibliotecaName.replace(/\s+/g, '-')}`;
                
                bibliotecasMap.set(bibliotecaName, {
                  id: bibliotecaId,
                  name: bibliotecaName,
                  library: "Biblioteca de Estilos",
                  type: "Estilos"
                });
                
                console.log(`Adicionada biblioteca de estilos: ${bibliotecaName}`);
              }
            }
          } catch (err) {
            console.warn("Erro ao processar estilo:", err);
          }
        }
      };
      
      // Processa todos os tipos de estilos
      processarEstilos(paintStyles);
      processarEstilos(textStyles);
      processarEstilos(effectStyles);
      processarEstilos(gridStyles);
      
    } catch (err) {
      console.warn("Erro ao buscar estilos:", err);
    }
    
    // MÉTODO 3: Buscar bibliotecas diretamente nas instâncias de componentes (mais confiável)
    try {
      console.log("3. Buscando bibliotecas nos componentes do documento...");
      
      // Busca em todas as páginas do documento, não apenas na página atual
      for (const page of figma.root.children) {
        try {
          console.log(`Buscando componentes na página: ${page.name}`);
          const instances = page.findAllWithCriteria({types: ['INSTANCE']});
          
          if (instances && instances.length > 0) {
            console.log(`Encontradas ${instances.length} instâncias de componentes na página ${page.name}`);
            
            // Percorre as instâncias
            for (let i = 0; i < instances.length; i++) {
              try {
                const instance = instances[i] as InstanceNode;
                
                // Verifica se o componente é de uma biblioteca
                if (instance.mainComponent && instance.mainComponent.remote === true) {
                  // Tenta obter o nome da biblioteca
                  let bibliotecaName = "";
                  
                  // Tenta extrair o nome da biblioteca do nome do componente
                  if (typeof instance.mainComponent.name === 'string' && instance.mainComponent.name.includes('/')) {
                    bibliotecaName = instance.mainComponent.name.split('/')[0].trim();
                  }
                  
                  // Se não conseguiu um nome válido, tenta extrair de outras propriedades
                  if (!bibliotecaName && instance.mainComponent.key) {
                    const keyParts = instance.mainComponent.key.split(';');
                    if (keyParts.length > 0) {
                      bibliotecaName = keyParts[0].trim();
                    }
                  }
                  
                  // Se ainda não tem um nome válido, usa um genérico
                  if (!bibliotecaName) {
                    continue; // Pula essa instância
                  }
                  
                  // Só adiciona se ainda não existir e tiver um nome válido
                  if (!bibliotecasMap.has(bibliotecaName) && bibliotecaName.length > 0) {
                    const bibliotecaId = `lib-comp-${Date.now()}-${bibliotecaName.replace(/\s+/g, '-')}`;
                    
                    bibliotecasMap.set(bibliotecaName, {
                      id: bibliotecaId,
                      name: bibliotecaName,
                      library: "Biblioteca de Componentes",
                      type: "Componentes"
                    });
                    
                    console.log(`Adicionada biblioteca de componente: ${bibliotecaName}`);
                  }
                }
              } catch (err) {
                console.warn(`Erro ao processar instância ${i}:`, err);
              }
            }
          }
        } catch (pageErr) {
          console.warn(`Erro ao processar página ${page.name}:`, pageErr);
        }
      }
    } catch (err) {
      console.warn("Erro ao buscar componentes no documento:", err);
    }
    
    // MÉTODO 4: Tentar listar todas as páginas da biblioteca (como fallback)
    try {
      if (bibliotecasMap.size === 0) {
        console.log("4. Tentando listar todas as bibliotecas via importable libraries...");
        // @ts-ignore
        const importableLibraries = figma.importableLibraryItems;
        
        if (importableLibraries) {
          console.log("Bibliotecas importáveis:", serializarSeguro(importableLibraries));
          
          // Se for um objeto, tenta extrair propriedades
          if (typeof importableLibraries === 'object' && importableLibraries !== null) {
            const keys = Object.keys(importableLibraries);
            for (const key of keys) {
              try {
                if (!bibliotecasMap.has(key) && key.length > 0) {
                  bibliotecasMap.set(key, {
                    id: `lib-import-${Date.now()}-${key.replace(/\s+/g, '-')}`,
                    name: key,
                    library: "Biblioteca Importável",
                    type: "Mista"
                  });
                  console.log(`Adicionada biblioteca importável: ${key}`);
                }
              } catch (err) {
                console.warn(`Erro ao processar biblioteca importável ${key}:`, err);
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("Erro ao listar bibliotecas importáveis:", err);
    }
    
    // Converter o Map para array para enviar à UI
    const bibliotecas = Array.from(bibliotecasMap.values());
    
    // Se não encontramos nenhuma biblioteca, mostramos uma mensagem
    if (bibliotecas.length === 0) {
      console.log("Nenhuma biblioteca encontrada");
      figma.ui.postMessage({
        type: 'libraries-data',
        message: "Não foi possível encontrar bibliotecas conectadas a este documento. Tente usar bibliotecas para que elas apareçam aqui.",
        libraries: []
      });
      return;
    }
    
    // Exibimos as bibliotecas encontradas
    console.log(`Encontradas ${bibliotecas.length} bibliotecas únicas no total`);
    figma.ui.postMessage({
      type: 'libraries-data',
      message: `Encontradas ${bibliotecas.length} bibliotecas`,
      libraries: bibliotecas
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Erro no processamento principal:", errorMessage);
    figma.ui.postMessage({
      type: 'error',
      message: "Ocorreu um erro ao tentar listar as bibliotecas: " + errorMessage
    });
  }
}

// Função para carregar as coleções de uma biblioteca específica
async function carregarColecoesDaBiblioteca(libraryId: string): Promise<void> {
  try {
    console.log(`Carregando coleções da biblioteca com ID: ${libraryId}`);
    const colecoes: ColecaoInfo[] = [];
    
    // Primeiro, vamos buscar a biblioteca pelo ID para ter o nome dela
    const bibliotecasMap = await obterTodasBibliotecas();
    const bibliotecas = Array.from(bibliotecasMap.values());
    const bibliotecaSelecionada = bibliotecas.find(bib => bib.id === libraryId) as BibliotecaInfo | undefined;
    
    if (!bibliotecaSelecionada) {
      console.warn(`Biblioteca com ID ${libraryId} não encontrada`);
      figma.ui.postMessage({
        type: 'collections-data',
        collections: []
      });
      return;
    }
    
    const nomeBiblioteca = bibliotecaSelecionada.name;
    console.log(`Nome da biblioteca selecionada: ${nomeBiblioteca}`);
    
    // MÉTODO 1: Tentar obter coleções de variáveis da biblioteca
    try {
      // @ts-ignore - API pode não estar nas tipagens
      const variableCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
      
      if (variableCollections && Array.isArray(variableCollections)) {
        console.log(`Procurando em ${variableCollections.length} coleções de variáveis`);
        
        // Filtramos apenas as coleções da biblioteca selecionada
        for (let i = 0; i < variableCollections.length; i++) {
          try {
            const collection = variableCollections[i] as any;
            
            // Verificamos se a coleção pertence à biblioteca que queremos
            // usando o nome da biblioteca como principal referência
            let belongsToSelectedLibrary = false;
            
            if (collection.libraryName === nomeBiblioteca) {
              belongsToSelectedLibrary = true;
            } else if (collection.key === libraryId || collection.id === libraryId) {
              belongsToSelectedLibrary = true;
            } else if (collection.libraryId === libraryId) {
              belongsToSelectedLibrary = true;
            }
            
            if (belongsToSelectedLibrary) {
              // Adicionamos essa coleção à lista
              colecoes.push({
                id: collection.key || collection.id || `collection-${Date.now()}-${i}`,
                name: collection.name || `Coleção ${i + 1}`,
                type: "Variáveis"
              });
              
              console.log(`Adicionada coleção de variáveis: ${collection.name}`);
            }
          } catch (err) {
            console.warn(`Erro ao processar coleção ${i}:`, err);
          }
        }
      }
    } catch (err) {
      console.warn("Erro ao buscar coleções de variáveis:", err);
    }
    
    // MÉTODO 2: Tentar obter coleções de componentes da biblioteca
    try {
      // Buscar componentes em todas as páginas
      let componentSets: any[] = [];
      
      // Adicionamos os componentes locais primeiro
      for (const page of figma.root.children) {
        const localSets = page.findAllWithCriteria({types: ['COMPONENT_SET']});
        if (localSets && localSets.length > 0) {
          componentSets = [...componentSets, ...localSets];
        }
      }
      
      // Tentar também obter via API, se disponível
      try {
        // @ts-ignore
        if (typeof figma.teamLibrary?.getComponentSetsAsync === 'function') {
          // @ts-ignore
          const remoteSets = await figma.teamLibrary.getComponentSetsAsync();
          if (remoteSets && Array.isArray(remoteSets)) {
            componentSets = [...componentSets, ...remoteSets];
          }
        }
      } catch (apiErr) {
        console.warn("Erro ao buscar via API:", apiErr);
      }
      
      console.log(`Procurando em ${componentSets.length} conjuntos de componentes`);
      
      // Filtramos apenas os conjuntos da biblioteca selecionada
      for (let i = 0; i < componentSets.length; i++) {
        try {
          const set = componentSets[i] as any;
          let setName = set.name || "";
          
          // Verificamos se o conjunto pertence à biblioteca que queremos
          let belongsToSelectedLibrary = false;
          
          // Se for um componente remoto, verificamos o nome da biblioteca
          if (set.remote === true) {
            // Tenta extrair o nome da biblioteca do nome do componente
            if (typeof setName === 'string' && setName.includes('/')) {
              const libName = setName.split('/')[0].trim();
              if (libName === nomeBiblioteca) {
                belongsToSelectedLibrary = true;
              }
            }
          }
          
          // Verificações adicionais
          if (set.libraryName === nomeBiblioteca) {
            belongsToSelectedLibrary = true;
          } else if (set.libraryId === libraryId) {
            belongsToSelectedLibrary = true;
          } else if (set.key && typeof set.key === 'string') {
            // Tenta extrair o nome da biblioteca da chave
            const keyParts = set.key.split(';');
            if (keyParts.length > 0 && keyParts[0].trim() === nomeBiblioteca) {
              belongsToSelectedLibrary = true;
            }
          }
          
          if (belongsToSelectedLibrary) {
            // Obtém o nome mais limpo possível
            let cleanName = setName;
            if (cleanName.includes('/')) {
              // Remove o prefixo da biblioteca
              cleanName = cleanName.split('/').slice(1).join('/');
            }
            
            // Adicionamos esse conjunto à lista
            colecoes.push({
              id: set.key || set.id || `set-${Date.now()}-${i}`,
              name: cleanName || `Conjunto ${i + 1}`,
              type: "Componentes"
            });
            
            console.log(`Adicionado conjunto de componentes: ${cleanName}`);
          }
        } catch (err) {
          console.warn(`Erro ao processar conjunto ${i}:`, err);
        }
      }
    } catch (err) {
      console.warn("Erro ao buscar conjuntos de componentes:", err);
    }
    
    // MÉTODO 3: Buscar estilos da biblioteca
    try {
      // Tentamos identificar coleções de estilos que pertencem à biblioteca
      const allStyles = [
        ...figma.getLocalPaintStyles(),
        ...figma.getLocalTextStyles(),
        ...figma.getLocalEffectStyles(),
        ...figma.getLocalGridStyles()
      ];
      
      console.log(`Analisando ${allStyles.length} estilos para encontrar coleções`);
      
      // Mapa para agrupar estilos por coleção
      const styleCollections = new Map<string, { count: number, type: string }>();
      
      // Processa cada estilo
      for (const style of allStyles) {
        try {
          // Verifica se o estilo é de uma biblioteca remota
          if (style.remote === true) {
            // Tenta identificar a biblioteca e a coleção
            if (typeof style.name === 'string' && style.name.includes('/')) {
              const parts = style.name.split('/');
              const bibliotecaName = parts[0].trim();
              
              // Verifica se pertence à biblioteca selecionada
              if (bibliotecaName === nomeBiblioteca) {
                // Se tiver mais partes, pode indicar uma coleção
                if (parts.length > 1) {
                  // A coleção pode ser formada por um ou mais níveis após o nome da biblioteca
                  const collectionName = parts[1].trim();
                  
                  // Incrementa a contagem para essa coleção
                  const existing = styleCollections.get(collectionName);
                  if (existing) {
                    existing.count++;
                  } else {
                    // Determina o tipo de estilo
                    let styleType = "Estilo";
                    if (style.type === 'PAINT') styleType = "Cores";
                    else if (style.type === 'TEXT') styleType = "Textos";
                    else if (style.type === 'EFFECT') styleType = "Efeitos";
                    else if (style.type === 'GRID') styleType = "Grids";
                    
                    styleCollections.set(collectionName, { count: 1, type: styleType });
                  }
                }
              }
            }
          }
        } catch (err) {
          console.warn("Erro ao processar estilo:", err);
        }
      }
      
      // Adiciona as coleções de estilos encontradas
      styleCollections.forEach((info, name) => {
        // Adiciona todas as coleções, mesmo com apenas 1 estilo
        colecoes.push({
          id: `style-collection-${Date.now()}-${name.replace(/\W+/g, '-')}`,
          name: name,
          type: `${info.type} (${info.count})`
        });
        
        console.log(`Adicionada coleção de estilos: ${name} com ${info.count} estilos`);
      });
    } catch (err) {
      console.warn("Erro ao buscar coleções de estilos:", err);
    }
    
    // Enviar as coleções para a UI
    if (colecoes.length === 0) {
      console.log("Nenhuma coleção encontrada na biblioteca");
      figma.ui.postMessage({
        type: 'collections-data',
        collections: []
      });
    } else {
      console.log(`Encontradas ${colecoes.length} coleções na biblioteca`);
      figma.ui.postMessage({
        type: 'collections-data',
        collections: colecoes
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Erro ao carregar coleções:", errorMessage);
    figma.ui.postMessage({
      type: 'error',
      message: "Ocorreu um erro ao tentar listar as coleções: " + errorMessage
    });
  }
}

// Função para obter todas as bibliotecas (reuso da lógica de carregarBibliotecas)
async function obterTodasBibliotecas(): Promise<Map<string, BibliotecaInfo>> {
  const bibliotecasMap = new Map<string, BibliotecaInfo>();

  try {
    // MÉTODO 1: Obter bibliotecas de variáveis
    try {
      // @ts-ignore - API pode não estar nas tipagens
      const variableCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
      
      if (variableCollections && Array.isArray(variableCollections)) {
        // Percorre as coleções para extrair bibliotecas únicas
        for (let i = 0; i < variableCollections.length; i++) {
          try {
            const collection = variableCollections[i] as any;
            
            // A propriedade importante é libraryName, que contém o nome da biblioteca real
            if (collection && typeof collection.libraryName === 'string') {
              const bibliotecaName = collection.libraryName;
              
              // Só adiciona se ainda não existir no Map
              if (!bibliotecasMap.has(bibliotecaName)) {
                const bibliotecaId = collection.key || `lib-var-${Date.now()}-${i}`;
                
                bibliotecasMap.set(bibliotecaName, {
                  id: bibliotecaId,
                  name: bibliotecaName,
                  library: "Biblioteca de Variáveis",
                  type: "Variáveis"
                });
              }
            }
          } catch (err) {
            console.warn("Erro ao processar coleção:", err);
          }
        }
      }
    } catch (err) {
      console.warn("Erro ao buscar bibliotecas de variáveis:", err);
    }
    
    // Adicionar os outros métodos se necessário...
    
  } catch (error) {
    console.error("Erro ao obter bibliotecas:", error);
  }

  return bibliotecasMap;
}

// Função para atualizar os prefixos das variáveis em uma coleção
async function atualizarVariaveis(
  libraryId: string,
  collectionId: string,
  oldPrefixes: string[],
  newPrefix: string
): Promise<void> {
  try {
    console.log(`Iniciando atualização de variáveis na coleção ${collectionId}`);
    console.log(`Prefixos antigos: ${oldPrefixes.join(', ')}`);
    console.log(`Novo prefixo: ${newPrefix}`);
    
    // Verificações iniciais
    if (!oldPrefixes.length || !newPrefix) {
      throw new Error("Prefixos inválidos");
    }
    
    // Buscar a biblioteca e coleção
    const bibliotecasMap = await obterTodasBibliotecas();
    const bibliotecas = Array.from(bibliotecasMap.values());
    const bibliotecaSelecionada = bibliotecas.find(bib => bib.id === libraryId) as BibliotecaInfo | undefined;
    
    if (!bibliotecaSelecionada) {
      throw new Error(`Biblioteca com ID ${libraryId} não encontrada`);
    }
    
    // Buscar as coleções de variáveis da biblioteca
    try {
      // @ts-ignore - API pode não estar nas tipagens
      const variableCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
      
      if (!variableCollections || !Array.isArray(variableCollections)) {
        throw new Error("Não foi possível obter as coleções de variáveis");
      }
      
      // Encontrar a coleção específica
      const collection = variableCollections.find((collection: any) => {
        return collection.key === collectionId || collection.id === collectionId;
      }) as any;
      
      if (!collection) {
        throw new Error(`Coleção com ID ${collectionId} não encontrada`);
      }
      
      console.log(`Coleção encontrada: ${collection.name}`);
      
      // Obter variáveis da coleção
      // @ts-ignore
      const variables = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(collection.key);
      
      if (!variables || !Array.isArray(variables)) {
        throw new Error("Não foi possível obter as variáveis da coleção");
      }
      
      console.log(`Encontradas ${variables.length} variáveis na coleção`);
      
      // Contar variáveis que serão alteradas
      let variaveis_alteradas = 0;
      let variaveis_processadas = 0;
      
      // Iterar sobre as variáveis e atualizar os nomes
      for (const variable of variables) {
        try {
          variaveis_processadas++;
          
          // Verificar se a variável tem um nome que começa com algum dos prefixos antigos
          const oldName = variable.name;
          let newName = oldName;
          let prefixEncontrado = false;
          
          for (const prefix of oldPrefixes) {
            if (oldName.startsWith(prefix)) {
              // Substitui apenas o prefixo, mantendo o resto do nome
              newName = newPrefix + oldName.substring(prefix.length);
              prefixEncontrado = true;
              break;
            }
          }
          
          // Se encontrou um prefixo para substituir
          if (prefixEncontrado && newName !== oldName) {
            console.log(`Renomeando variável: ${oldName} -> ${newName}`);
            
            // Tentar atualizar a variável
            // @ts-ignore
            await figma.teamLibrary.updateVariableAsync(variable.key, {
              name: newName
            });
            
            variaveis_alteradas++;
          }
        } catch (varError) {
          console.warn(`Erro ao processar variável: ${varError}`);
        }
      }
      
      console.log(`Processamento concluído. ${variaveis_alteradas} de ${variaveis_processadas} variáveis foram atualizadas.`);
      
      // Enviar resultado para a UI
      figma.ui.postMessage({
        type: 'update-result',
        success: true,
        message: `Processamento concluído! ${variaveis_alteradas} de ${variaveis_processadas} variáveis foram atualizadas.`
      });
      
    } catch (collectionError) {
      console.error("Erro ao processar coleção:", collectionError);
      throw new Error(`Erro ao processar coleção: ${String(collectionError)}`);
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Erro ao atualizar variáveis:", errorMessage);
    figma.ui.postMessage({
      type: 'update-result',
      success: false,
      message: "Erro ao atualizar variáveis: " + errorMessage
    });
  }
}

// Função para carregar coleções locais de variáveis
async function carregarColecoesLocais(): Promise<void> {
  try {
    console.log("Carregando coleções locais de variáveis...");
    const colecoes: ColecaoInfo[] = [];
    
    // Obter todas as coleções de variáveis locais
    const localCollections = figma.variables.getLocalVariableCollections();
    
    if (localCollections && localCollections.length > 0) {
      console.log(`Encontradas ${localCollections.length} coleções locais de variáveis`);
      
      // Processar cada coleção
      localCollections.forEach((collection, index) => {
        try {
          colecoes.push({
            id: collection.id,
            name: collection.name,
            type: "Variáveis Locais"
          });
          
          console.log(`Adicionada coleção local: ${collection.name}`);
        } catch (err) {
          console.warn(`Erro ao processar coleção local ${index}:`, err);
        }
      });
    }
    
    // Enviar coleções para a UI
    figma.ui.postMessage({
      type: 'local-collections-data',
      collections: colecoes
    });
    
  } catch (error) {
    console.error("Erro ao carregar coleções locais:", error);
    figma.ui.postMessage({
      type: 'error',
      message: "Ocorreu um erro ao carregar coleções locais: " + String(error)
    });
  }
}

// Interface para estender o tipo Variable do Figma para incluir propriedades adicionais 
interface ExtendedVariable extends Variable {
  libraryId?: string;
  libraryName?: string;
}

// Função para gerar prévia da substituição de variáveis
async function preVisualizarSubstituicao(
  libraryId: string,
  localCollectionId: string
): Promise<void> {
  try {
    console.log(`Gerando prévia de substituição - Biblioteca: ${libraryId}, Coleção Local: ${localCollectionId}`);
    
    // Buscar a biblioteca selecionada
    const bibliotecasMap = await obterTodasBibliotecas();
    const bibliotecas = Array.from(bibliotecasMap.values());
    const bibliotecaSelecionada = bibliotecas.find(bib => bib.id === libraryId) as BibliotecaInfo | undefined;
    
    if (!bibliotecaSelecionada) {
      throw new Error(`Biblioteca com ID ${libraryId} não encontrada`);
    }
    
    // Buscar a coleção local
    const localCollection = figma.variables.getVariableCollectionById(localCollectionId);
    
    if (!localCollection) {
      throw new Error(`Coleção local com ID ${localCollectionId} não encontrada`);
    }
    
    console.log(`Biblioteca: ${bibliotecaSelecionada.name}, Coleção Local: ${localCollection.name}`);
    
    // Obter variáveis da biblioteca selecionada
    // @ts-ignore
    const variableCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
    
    if (!variableCollections || !Array.isArray(variableCollections)) {
      throw new Error("Não foi possível obter as coleções de variáveis da biblioteca");
    }
    
    // Encontrar coleções da biblioteca selecionada
    const libraryCollections = variableCollections.filter((collection: any) => {
      return collection.libraryName === bibliotecaSelecionada.name;
    });
    
    if (!libraryCollections.length) {
      throw new Error(`Não foram encontradas coleções de variáveis na biblioteca ${bibliotecaSelecionada.name}`);
    }
    
    console.log(`Encontradas ${libraryCollections.length} coleções na biblioteca`);
    
    // Obter todas as variáveis da biblioteca
    const libraryVariables: any[] = [];
    
    for (const collection of libraryCollections) {
      try {
        // @ts-ignore
        const variables = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(collection.key);
        if (variables && Array.isArray(variables)) {
          libraryVariables.push(...variables);
        }
      } catch (err) {
        console.warn(`Erro ao obter variáveis da coleção ${collection.name}:`, err);
      }
    }
    
    console.log(`Obtidas ${libraryVariables.length} variáveis da biblioteca`);
    
    // Obter variáveis da coleção local
    const localVariables = localCollection.variableIds.map((id: string) => 
      figma.variables.getVariableById(id)
    ).filter((v: any) => v !== null);
    
    console.log(`Encontradas ${localVariables.length} variáveis na coleção local`);
    
    // Mapear correspondências baseadas nos valores, não nos nomes
    const matches: Array<{
      localId: string, 
      localName: string, 
      libraryId: string, 
      libraryName: string,
      mode: string,
      valueType: string
    }> = [];
    
    // Para cada variável local
    for (const localVar of localVariables) {
      if (!localVar) continue;
      
      // Para cada modo na coleção local
      for (const modeId of localCollection.modes) {
        const modeName = localCollection.modes.find(m => m.modeId === modeId.modeId)?.name || 'Modo';
        
        try {
          // Obter o valor da variável local neste modo
          const localValue = localVar.valuesByMode[modeId.modeId];
          
          if (!localValue) continue;
          
          // Verificar o tipo do valor
          if (typeof localValue === 'object' && 'type' in localValue) {
            const valueType = localValue.type as string;
            
            // Caso seja uma referência a outra variável
            if (valueType === "VARIABLE_ALIAS" && 'id' in localValue) {
              const referencedVarId = localValue.id as string;
              
              // Buscar a variável referenciada
              const referencedVar = figma.variables.getVariableById(referencedVarId);
              
              if (referencedVar) {
                // Procurar variáveis na biblioteca com o mesmo nome da variável referenciada
                const matchingLibraryVars = libraryVariables.filter(v => 
                  v.name === referencedVar.name
                );
                
                if (matchingLibraryVars.length > 0) {
                  for (const libVar of matchingLibraryVars) {
                    matches.push({
                      localId: localVar.id,
                      localName: localVar.name,
                      libraryId: libVar.key,
                      libraryName: libVar.name,
                      mode: modeName,
                      valueType: 'Referência a Variável'
                    });
                    
                    // Uma vez que encontramos um match, não precisamos verificar os outros
                    break;
                  }
                }
              }
            }
            // Caso seja um valor de cor
            else if (valueType === "COLOR" &&
                    'r' in localValue && 
                    'g' in localValue && 
                    'b' in localValue) {
              // Buscar variáveis de cor na biblioteca que tenham o mesmo valor RGB
              const localRgb = `${localValue.r},${localValue.g},${localValue.b}`;
              
              for (const libVar of libraryVariables) {
                // Para cada modo disponível na variável da biblioteca
                for (const libModeId in libVar.valuesByMode) {
                  const libValue = libVar.valuesByMode[libModeId];
                  
                  // Se for uma cor, compara os valores RGB
                  if (libValue && 
                      typeof libValue === 'object' && 
                      'type' in libValue && 
                      libValue.type === "COLOR" && 
                      'r' in libValue && 
                      'g' in libValue && 
                      'b' in libValue) {
                    const libRgb = `${libValue.r},${libValue.g},${libValue.b}`;
                    
                    // Se os valores RGB forem iguais
                    if (localRgb === libRgb) {
                      matches.push({
                        localId: localVar.id,
                        localName: localVar.name,
                        libraryId: libVar.key,
                        libraryName: libVar.name,
                        mode: modeName,
                        valueType: 'Cor RGB'
                      });
                      
                      // Uma vez que encontramos um match para este modo, podemos pular para o próximo
                      break;
                    }
                  }
                }
              }
            }
            // Caso seja um valor de número
            else if (valueType === "FLOAT" && 'value' in localValue) {
              const localFloat = localValue.value;
              
              for (const libVar of libraryVariables) {
                // Para cada modo disponível na variável da biblioteca
                for (const libModeId in libVar.valuesByMode) {
                  const libValue = libVar.valuesByMode[libModeId];
                  
                  // Se for um número, compara os valores
                  if (libValue && 
                      typeof libValue === 'object' && 
                      'type' in libValue && 
                      libValue.type === "FLOAT" && 
                      'value' in libValue && 
                      libValue.value === localFloat) {
                    matches.push({
                      localId: localVar.id,
                      localName: localVar.name,
                      libraryId: libVar.key,
                      libraryName: libVar.name,
                      mode: modeName,
                      valueType: 'Número'
                    });
                    
                    // Uma vez que encontramos um match para este modo, podemos pular para o próximo
                    break;
                  }
                }
              }
            }
            // Caso seja um valor de string
            else if (valueType === "STRING" && 'value' in localValue) {
              const localString = localValue.value;
              
              for (const libVar of libraryVariables) {
                // Para cada modo disponível na variável da biblioteca
                for (const libModeId in libVar.valuesByMode) {
                  const libValue = libVar.valuesByMode[libModeId];
                  
                  // Se for uma string, compara os valores
                  if (libValue && 
                      typeof libValue === 'object' && 
                      'type' in libValue && 
                      libValue.type === "STRING" && 
                      'value' in libValue && 
                      libValue.value === localString) {
                    matches.push({
                      localId: localVar.id,
                      localName: localVar.name,
                      libraryId: libVar.key,
                      libraryName: libVar.name,
                      mode: modeName,
                      valueType: 'Texto'
                    });
                    
                    // Uma vez que encontramos um match para este modo, podemos pular para o próximo
                    break;
                  }
                }
              }
            }
            // Outros tipos podem ser adicionados conforme necessário
          }
        } catch (modeError) {
          console.warn(`Erro ao processar modo ${modeName} para variável ${localVar.name}:`, modeError);
        }
      }
    }
    
    console.log(`Encontradas ${matches.length} correspondências entre variáveis locais e da biblioteca`);
    
    // Enviar resultado para a UI
    figma.ui.postMessage({
      type: 'preview-substituicao',
      hasMatches: matches.length > 0,
      matches: matches,
      totalMatches: matches.length
    });
    
  } catch (error) {
    console.error("Erro ao gerar prévia:", error);
    figma.ui.postMessage({
      type: 'preview-substituicao',
      hasMatches: false,
      error: String(error)
    });
  }
}

// Função para substituir variáveis locais por variáveis da biblioteca
async function substituirVariaveis(
  libraryId: string,
  localCollectionId: string
): Promise<void> {
  try {
    console.log(`Iniciando substituição de variáveis - Biblioteca: ${libraryId}, Coleção Local: ${localCollectionId}`);
    
    // Buscar a biblioteca selecionada
    const bibliotecasMap = await obterTodasBibliotecas();
    const bibliotecas = Array.from(bibliotecasMap.values());
    const bibliotecaSelecionada = bibliotecas.find(bib => bib.id === libraryId) as BibliotecaInfo | undefined;
    
    if (!bibliotecaSelecionada) {
      throw new Error(`Biblioteca com ID ${libraryId} não encontrada`);
    }
    
    // Buscar a coleção local
    const localCollection = figma.variables.getVariableCollectionById(localCollectionId);
    
    if (!localCollection) {
      throw new Error(`Coleção local com ID ${localCollectionId} não encontrada`);
    }
    
    console.log(`Biblioteca: ${bibliotecaSelecionada.name}, Coleção Local: ${localCollection.name}`);
    
    // Obter variáveis da biblioteca selecionada
    // @ts-ignore
    const variableCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
    
    if (!variableCollections || !Array.isArray(variableCollections)) {
      throw new Error("Não foi possível obter as coleções de variáveis da biblioteca");
    }
    
    // Encontrar coleções da biblioteca selecionada
    const libraryCollections = variableCollections.filter((collection: any) => {
      return collection.libraryName === bibliotecaSelecionada.name;
    });
    
    if (!libraryCollections.length) {
      throw new Error(`Não foram encontradas coleções de variáveis na biblioteca ${bibliotecaSelecionada.name}`);
    }
    
    // Obter todas as variáveis da biblioteca
    const libraryVariables: any[] = [];
    
    for (const collection of libraryCollections) {
      try {
        // @ts-ignore
        const variables = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(collection.key);
        if (variables && Array.isArray(variables)) {
          libraryVariables.push(...variables);
        }
      } catch (err) {
        console.warn(`Erro ao obter variáveis da coleção ${collection.name}:`, err);
      }
    }
    
    // Obter variáveis da coleção local
    const localVariables = localCollection.variableIds.map((id: string) => 
      figma.variables.getVariableById(id)
    ).filter((v: any) => v !== null);
    
    console.log(`Encontradas ${localVariables.length} variáveis na coleção local`);
    
    // Mapear correspondências baseadas nos valores, não nos nomes
    const matches: Array<{
      localId: string, 
      localName: string, 
      libraryId: string, 
      libraryName: string,
      mode: string,
      valueType: string
    }> = [];
    
    // Para cada variável local
    for (const localVar of localVariables) {
      if (!localVar) continue;
      
      // Para cada modo na coleção local
      for (const mode of localCollection.modes) {
        try {
          // Obter o valor da variável local neste modo
          const localValue = localVar.valuesByMode[mode.modeId];
          
          if (!localValue) continue;
          
          // Verificar o tipo do valor
          if (typeof localValue === 'object' && 'type' in localValue) {
            const valueType = localValue.type as string;
            
            // Caso seja uma referência a outra variável
            if (valueType === "VARIABLE_ALIAS" && 'id' in localValue) {
              const referencedVarId = localValue.id as string;
              
              // Buscar a variável referenciada
              const referencedVar = figma.variables.getVariableById(referencedVarId);
              
              if (referencedVar) {
                // Procurar variáveis na biblioteca com o mesmo nome da variável referenciada
                const matchingLibraryVars = libraryVariables.filter(v => 
                  v.name === referencedVar.name
                );
                
                if (matchingLibraryVars.length > 0) {
                  for (const libVar of matchingLibraryVars) {
                    matches.push({
                      localId: localVar.id,
                      localName: localVar.name,
                      libraryId: libVar.key,
                      libraryName: libVar.name,
                      mode: mode.name,
                      valueType: 'Referência a Variável'
                    });
                    
                    // Uma vez que encontramos um match, não precisamos verificar os outros
                    break;
                  }
                }
              }
            }
            // Caso seja um valor de cor
            else if (valueType === "COLOR" && 
                    'r' in localValue && 
                    'g' in localValue && 
                    'b' in localValue) {
              // Buscar variáveis de cor na biblioteca que tenham o mesmo valor RGB
              const localRgb = `${localValue.r},${localValue.g},${localValue.b}`;
              
              for (const libVar of libraryVariables) {
                // Para cada modo disponível na variável da biblioteca
                for (const libModeId in libVar.valuesByMode) {
                  const libValue = libVar.valuesByMode[libModeId];
                  
                  // Se for uma cor, compara os valores RGB
                  if (libValue && 
                      typeof libValue === 'object' && 
                      'type' in libValue && 
                      libValue.type === "COLOR" && 
                      'r' in libValue && 
                      'g' in libValue && 
                      'b' in libValue) {
                    const libRgb = `${libValue.r},${libValue.g},${libValue.b}`;
                    
                    // Se os valores RGB forem iguais
                    if (localRgb === libRgb) {
                      matches.push({
                        localId: localVar.id,
                        localName: localVar.name,
                        libraryId: libVar.key,
                        libraryName: libVar.name,
                        mode: mode.name,
                        valueType: 'Cor RGB'
                      });
                      
                      // Uma vez que encontramos um match para este modo, podemos pular para o próximo
                      break;
                    }
                  }
                }
              }
            }
            // Caso seja um valor de número
            else if (valueType === "FLOAT" && 'value' in localValue) {
              const localFloat = localValue.value;
              
              for (const libVar of libraryVariables) {
                // Para cada modo disponível na variável da biblioteca
                for (const libModeId in libVar.valuesByMode) {
                  const libValue = libVar.valuesByMode[libModeId];
                  
                  // Se for um número, compara os valores
                  if (libValue && 
                      typeof libValue === 'object' && 
                      'type' in libValue && 
                      libValue.type === "FLOAT" && 
                      'value' in libValue && 
                      libValue.value === localFloat) {
                    matches.push({
                      localId: localVar.id,
                      localName: localVar.name,
                      libraryId: libVar.key,
                      libraryName: libVar.name,
                      mode: mode.name,
                      valueType: 'Número'
                    });
                    
                    // Uma vez que encontramos um match para este modo, podemos pular para o próximo
                    break;
                  }
                }
              }
            }
            // Caso seja um valor de string
            else if (valueType === "STRING" && 'value' in localValue) {
              const localString = localValue.value;
              
              for (const libVar of libraryVariables) {
                // Para cada modo disponível na variável da biblioteca
                for (const libModeId in libVar.valuesByMode) {
                  const libValue = libVar.valuesByMode[libModeId];
                  
                  // Se for uma string, compara os valores
                  if (libValue && 
                      typeof libValue === 'object' && 
                      'type' in libValue && 
                      libValue.type === "STRING" && 
                      'value' in libValue && 
                      libValue.value === localString) {
                    matches.push({
                      localId: localVar.id,
                      localName: localVar.name,
                      libraryId: libVar.key,
                      libraryName: libVar.name,
                      mode: mode.name,
                      valueType: 'Texto'
                    });
                    
                    // Uma vez que encontramos um match para este modo, podemos pular para o próximo
                    break;
                  }
                }
              }
            }
            // Outros tipos podem ser adicionados conforme necessário
          }
        } catch (modeError) {
          console.warn(`Erro ao processar modo ${mode.name} para variável ${localVar.name}:`, modeError);
        }
      }
    }
    
    console.log(`Encontradas ${matches.length} correspondências de valores para substituição`);
    
    // Executar a substituição das variáveis com base nos matches encontrados
    let substituidas = 0;
    let erros = 0;
    
    // Agrupar as correspondências por variável local
    const matchesByVar = new Map<string, any>();
    
    for (const match of matches) {
      if (!matchesByVar.has(match.localId)) {
        matchesByVar.set(match.localId, {
          localVarId: match.localId,
          localVar: figma.variables.getVariableById(match.localId) as Variable,
          libraryVarKey: match.libraryId,
          modeId: match.mode
        });
      }
    }
    
    // Para cada variável local que tem pelo menos uma correspondência
    for (const [localVarId, match] of matchesByVar.entries()) {
      try {
        const localVar = match.localVar; // Todas as correspondências têm a mesma variável local
        const localVarName = localVar.name;
        console.log(`Processando variável local: "${localVarName}" (ID: ${localVar.id})`);
        
        // Importar a variável da biblioteca
        try {
          // @ts-ignore
          const importedVariable = await figma.teamLibrary.importVariableByKeyAsync(match.libraryVarKey);
          
          if (!importedVariable) {
            throw new Error(`Não foi possível importar a variável com key ${match.libraryVarKey}`);
          }
          
          console.log(`Variável importada com sucesso. ID local: ${importedVariable.id}, Nome: ${importedVariable.name}`);
          
          // Agora usamos o ID da variável importada para a referência
          await localVar.setValueForMode(match.modeId, {
            type: 'VARIABLE_ALIAS',
            id: importedVariable.id
          });
          
          substituidas++;
          console.log(`Modo ${match.mode} da variável ${localVar.name} substituído com sucesso pela variável ${importedVariable.name} (ID: ${importedVariable.id})`);
        } catch (importError) {
          console.warn(`Erro ao importar e substituir variável: ${importError}`);
          erros++;
        }
      } catch (varError) {
        console.warn(`Erro ao processar variável ${localVarId}:`, varError);
        erros++;
      }
    }
    
    console.log(`Substituição concluída. ${substituidas} modos de variáveis substituídos com ${erros} erros.`);
    
    // Enviar resultado para a UI
    figma.ui.postMessage({
      type: 'substituicao-result',
      success: true,
      message: `Substituição concluída! ${substituidas} modos de variáveis foram conectados às variáveis da biblioteca.${erros > 0 ? ` (${erros} erros ocorreram durante o processo)` : ''}`
    });
    
  } catch (error) {
    console.error("Erro ao substituir variáveis:", error);
    figma.ui.postMessage({
      type: 'substituicao-result',
      success: false,
      message: "Erro ao substituir variáveis: " + String(error)
    });
  }
}

// Handle mensagens da UI
figma.ui.onmessage = (msg) => {
  console.log('Mensagem recebida:', msg.type, msg);
  
  // Rastrear a aba ativa
  if (msg.type === 'activeTabChanged') {
    activeTab = msg.tabId;
    console.log('Aba ativa atualizada para:', activeTab);
    
    // Se a aba for Update Variables e tiver uma biblioteca selecionada, atualizar a prévia
    if (activeTab === 'update-variables' && selectedLibraryId) {
      console.log('Atualizando prévia ao mudar para a aba update-variables com biblioteca:', selectedLibraryId);
      figma.ui.postMessage({ type: 'loading-preview-start' });
      preVisualizarSubstituicaoNos(selectedLibraryId, 'selection');
    }
  }
  
  if (msg.type === 'ui-ready') {
    console.log("UI está pronta, carregando bibliotecas...");
    carregarBibliotecas();
  }
  
  // Recarregar bibliotecas
  if (msg.type === 'recarregar') {
    console.log("Recarregando bibliotecas...");
    carregarBibliotecas();
  }
  
  if (msg.type === 'carregarBibliotecas') {
    console.log('Solicitação para carregar bibliotecas recebida');
    carregarBibliotecas();
  }
  
  // Carregar coleções de uma biblioteca específica
  if (msg.type === 'carregarColecoes' && msg.libraryId) {
    console.log(`Solicitando coleções da biblioteca: ${msg.libraryId}`);
    selectedLibraryId = msg.libraryId;
    carregarColecoesDaBiblioteca(msg.libraryId);
  }
  
  // Carregar coleções locais
  if (msg.type === 'carregarColecoesLocais') {
    console.log("Solicitando coleções locais de variáveis");
    carregarColecoesLocais();
  }
  
  // Pré-visualizar substituição de variáveis em nós
  if (msg.type === 'preVisualizarSubstituicaoNos') {
    selectedLibraryId = msg.libraryId;
    console.log('Pré-visualizando substituição com biblioteca:', msg.libraryId, 'e escopo:', msg.scope);
    figma.ui.postMessage({ type: 'loading-preview-start' });
    preVisualizarSubstituicaoNos(msg.libraryId, msg.scope.toLowerCase());
  }
  
  // Substituir variáveis em nós
  if (msg.type === 'substituirVariaveisNos') {
    try {
      selectedLibraryId = msg.libraryId;
      console.log('Substituindo variáveis com biblioteca:', msg.libraryId, 'e escopo:', msg.scope);
      substituirVariaveisNos(msg.libraryId, msg.scope.toLowerCase());
    } catch (error: any) {
      console.error('Erro ao substituir variáveis:', error);
      figma.ui.postMessage({
        type: 'substituicao-nos-result', 
        success: false,
        message: error.message || 'Ocorreu um erro durante a substituição'
      });
    }
  }
  
  // Pré-visualizar substituição de variáveis
  if (msg.type === 'preVisualizarSubstituicao') {
    console.log("Solicitando prévia de substituição:", msg);
    preVisualizarSubstituicao(msg.libraryId, msg.localCollectionId);
  }
  
  // Substituir variáveis
  if (msg.type === 'substituirVariaveis') {
    console.log("Solicitando substituição de variáveis:", msg);
    substituirVariaveis(msg.libraryId, msg.localCollectionId)
      .then(() => {
        console.log('Substituição de variáveis concluída com sucesso');
      })
      .catch(err => {
        console.error('Erro na substituição de variáveis:', err);
      });
  }
  
  // Atualizar variáveis (função antiga, mantida por compatibilidade)
  if (msg.type === 'atualizarVariaveis') {
    console.log("Solicitando atualização de variáveis (função legada):", msg);
    atualizarVariaveis(
      msg.libraryId,
      msg.collectionId,
      msg.oldPrefix, 
      msg.newPrefix
    );
  }
  
  // Fecha o plugin se solicitado
  if (msg.type === 'fechar') {
    console.log("Fechando plugin");
    figma.closePlugin();
  }
};

// Funções para a nova aba "Update Variables"

// Função para pré-visualizar a substituição de variáveis em nós selecionados
async function preVisualizarSubstituicaoNos(libraryId: string, scope: string) {
  console.log('Iniciando pré-visualização nos nós com libraryId:', libraryId, 'e scope:', scope);
  
  // Informar ao UI que o processo de carregamento começou
  figma.ui.postMessage({ type: 'loading-preview-start' });
  
  try {
    // Obter todas as coleções locais
    const variableCollections = await figma.variables.getLocalVariableCollectionsAsync();
    console.log('Coleções locais obtidas:', variableCollections.length);
    
    // Obter nome da biblioteca externa
    const localVariables = await figma.variables.getLocalVariablesAsync() as ExtendedVariable[];
    const externalLibraryVar = localVariables.find(v => v.remote && v.libraryId === libraryId);
    const externalLibrary = externalLibraryVar?.libraryName || 'Biblioteca Externa';
    
    // Filtrar variáveis locais e as da biblioteca selecionada
    const libraryVariables = localVariables.filter(v => v.remote && v.libraryId === libraryId);
    
    // Determinar os nós a verificar com base no escopo
    let nodesToProcess: SceneNode[] = [];
    if (scope === 'selection') {
      nodesToProcess = [...figma.currentPage.selection];
      if (nodesToProcess.length === 0) {
        figma.ui.postMessage({
          type: 'preview-substituicao-nos',
          hasMatches: false,
          scope: 'seleção atual',
          error: 'Nenhum nó selecionado.'
        });
        figma.ui.postMessage({ type: 'loading-preview-end' });
        return;
      }
    } else if (scope === 'page') {
      nodesToProcess = [...figma.currentPage.children];
    } else if (scope === 'document') {
      nodesToProcess = [];
      figma.root.children.forEach(page => {
        nodesToProcess = [...nodesToProcess, ...page.children];
      });
    }
    
    console.log(`Verificando ${nodesToProcess.length} nós no escopo "${scope}"`);
    
    // Encontrar todas as variáveis nos nós e agrupar por tipo
    type VariableInfo = {
      nodeId: string;
      nodeName: string;
      varName: string;
      varId: string;
      property: string;
      valueType: string; // Usar string para evitar problemas de tipo
      isRemote: boolean;
      libraryName?: string;
      collectionName?: string;
    };
    
    // Informações sobre estilos
    type StyleInfo = {
      nodeId: string;
      nodeName: string;
      styleName: string;
      styleId: string;
      styleType: string;
      isRemote: boolean;
      libraryName?: string;
    };
    
    const results: {
      variables: VariableInfo[];
      styles: StyleInfo[];
      nodeCount: number;
      nodesWithVariables: number;
      nodesWithStyles: number;
    } = {
      variables: [],
      styles: [],
      nodeCount: 0,
      nodesWithVariables: 0,
      nodesWithStyles: 0
    };
    
    // Função recursiva para processar nós e encontrar TODAS as variáveis e estilos
    function processNode(node: SceneNode) {
      results.nodeCount++;
      
      let nodeHasVariables = false;
      let nodeHasStyles = false;
      
      // 1. Verificar variáveis no nó
      try {
        // Log para depuração
        console.log(`Processando nó: ${node.name} (tipo: ${node.type})`);
        
        // Acessar boundVariables de forma segura
        const boundVariables = node.boundVariables;
        
        if (boundVariables) {
          console.log(`Nó ${node.name} tem variáveis vinculadas:`, boundVariables);
          
          // Iterar sobre todas as propriedades vinculadas
          for (const prop in boundVariables) {
            const binding = boundVariables[prop as keyof typeof boundVariables];
            console.log(`Propriedade ${prop} com binding:`, binding);
            
            if (binding && "id" in binding) {
              // Obter a variável vinculada
              const variableId = binding.id;
              console.log(`Variável ID: ${variableId}`);
              
              const variable = localVariables.find(v => v.id === variableId);
              
              if (variable) {
                console.log(`Variável encontrada: ${variable.name}, tipo: ${variable.resolvedType}`);
                nodeHasVariables = true;
                
                // Encontrar a coleção da variável
                const collection = variableCollections.find(c => c.id === variable.variableCollectionId);
                
                // Adicionar a variável aos resultados
                results.variables.push({
                  nodeId: node.id,
                  nodeName: node.name,
                  varName: variable.name,
                  varId: variable.id,
                  property: prop,
                  valueType: String(variable.resolvedType), // Converter para string
                  isRemote: variable.remote || false,
                  libraryName: variable.remote ? variable.libraryName : undefined,
                  collectionName: collection?.name
                });
              } else {
                console.log(`Variável com ID ${variableId} não encontrada nas variáveis locais`);
              }
            }
          }
        } else {
          // Tenta acessar variáveis de modo alternativo para versões mais novas da API Figma
          // @ts-ignore
          if (node.getAllVariables && typeof node.getAllVariables === 'function') {
            try {
              // @ts-ignore
              const nodeVariables = node.getAllVariables();
              console.log(`Variáveis obtidas via getAllVariables:`, nodeVariables);
              
              if (nodeVariables && nodeVariables.length > 0) {
                nodeHasVariables = true;
                
                for (const varBinding of nodeVariables) {
                  if (varBinding && varBinding.variableId) {
                    const variableId = varBinding.variableId;
                    const property = varBinding.property || 'desconhecida';
                    
                    const variable = localVariables.find(v => v.id === variableId);
                    
                    if (variable) {
                      // Encontrar a coleção da variável
                      const collection = variableCollections.find(c => c.id === variable.variableCollectionId);
                      
                      // Adicionar a variável aos resultados
                      results.variables.push({
                        nodeId: node.id,
                        nodeName: node.name,
                        varName: variable.name,
                        varId: variable.id,
                        property: property,
                        valueType: String(variable.resolvedType),
                        isRemote: variable.remote || false,
                        libraryName: variable.remote ? variable.libraryName : undefined,
                        collectionName: collection?.name
                      });
                    }
                  }
                }
              }
            } catch (getAllVarsError) {
              console.warn(`Erro ao chamar getAllVariables para o nó ${node.name}:`, getAllVarsError);
            }
          }
          
          // Verificar se o nó é uma instância de componente e tem variáveis via componentProperties
          // @ts-ignore
          if (node.type === 'INSTANCE' && node.componentProperties) {
            try {
              console.log(`Verificando componentProperties em instância ${node.name}`);
              // @ts-ignore
              const componentProps = node.componentProperties;
              
              for (const propKey in componentProps) {
                try {
                  // @ts-ignore - Ignorar verificações de tipo pois a estrutura pode variar
                  const prop = componentProps[propKey];
                  console.log(`Verificando propriedade ${propKey}:`, prop);
                  
                  // Verificar duas possibilidades: boundVariables ou boundVariableId
                  // @ts-ignore
                  if (prop && prop.boundVariables) {
                    // @ts-ignore
                    for (const bindKey in prop.boundVariables) {
                      try {
                        // @ts-ignore
                        const binding = prop.boundVariables[bindKey];
                        // @ts-ignore
                        if (binding && binding.id) {
                          // @ts-ignore
                          const variableId = binding.id;
                          console.log(`Encontrada variável via boundVariables em ${propKey}.${bindKey}: ${variableId}`);
                          
                          addVariableToResults(node, variableId, `${propKey}.${bindKey}`);
                        }
                      } catch (error) {
                        console.warn(`Erro ao processar binding ${bindKey}:`, error);
                      }
                    }
                  } 
                  // @ts-ignore
                  else if (prop && prop.boundVariableId) {
                    // @ts-ignore
                    const variableId = prop.boundVariableId;
                    console.log(`Encontrada variável via boundVariableId em ${propKey}: ${variableId}`);
                    
                    addVariableToResults(node, variableId, propKey);
                  }
                } catch (propError) {
                  console.warn(`Erro ao processar propriedade ${propKey}:`, propError);
                }
              }
            } catch (compPropsError) {
              console.warn(`Erro ao verificar componentProperties no nó ${node.name}:`, compPropsError);
            }
          }
        }
      } catch (varsError) {
        console.warn(`Erro ao verificar variáveis no nó ${node.name}:`, varsError);
      }
      
      // Função auxiliar para adicionar variável aos resultados
      function addVariableToResults(node: SceneNode, variableId: string, propertyPath: string) {
        const variable = localVariables.find(v => v.id === variableId);
        
        if (variable) {
          nodeHasVariables = true;
          
          // Encontrar a coleção da variável
          const collection = variableCollections.find(c => c.id === variable.variableCollectionId);
          
          // Adicionar a variável aos resultados
          results.variables.push({
            nodeId: node.id,
            nodeName: node.name,
            varName: variable.name,
            varId: variable.id,
            property: propertyPath,
            valueType: String(variable.resolvedType),
            isRemote: variable.remote || false,
            libraryName: variable.remote ? variable.libraryName : undefined,
            collectionName: collection?.name
          });
        }
      }
      
      // 2. Verificar estilos no nó
      // Paint Styles (fills, strokes)
      if ('fillStyleId' in node) {
        const fillStyleId = node.fillStyleId;
        if (fillStyleId && typeof fillStyleId === 'string' && fillStyleId !== '') {
          const style = figma.getStyleById(fillStyleId);
          if (style) {
            nodeHasStyles = true;
            results.styles.push({
              nodeId: node.id,
              nodeName: node.name,
              styleName: style.name,
              styleId: style.id,
              styleType: 'Fill',
              isRemote: style.remote || false,
              libraryName: style.remote ? getLibraryNameFromStyle(style) : undefined
            });
          }
        }
      }
      
      // Multiple fills
      if ('fillStyleId' in node && Array.isArray(node.fillStyleId)) {
        node.fillStyleId.forEach((id, index) => {
          if (id && typeof id === 'string' && id !== '') {
            const style = figma.getStyleById(id);
            if (style) {
              nodeHasStyles = true;
              results.styles.push({
                nodeId: node.id,
                nodeName: node.name,
                styleName: style.name,
                styleId: style.id,
                styleType: `Fill ${index + 1}`,
                isRemote: style.remote || false,
                libraryName: style.remote ? getLibraryNameFromStyle(style) : undefined
              });
            }
          }
        });
      }
      
      // Stroke Style
      if ('strokeStyleId' in node) {
        const strokeStyleId = node.strokeStyleId;
        if (strokeStyleId && typeof strokeStyleId === 'string' && strokeStyleId !== '') {
          const style = figma.getStyleById(strokeStyleId);
          if (style) {
            nodeHasStyles = true;
            results.styles.push({
              nodeId: node.id,
              nodeName: node.name,
              styleName: style.name,
              styleId: style.id,
              styleType: 'Stroke',
              isRemote: style.remote || false,
              libraryName: style.remote ? getLibraryNameFromStyle(style) : undefined
            });
          }
        }
      }
      
      // Multiple strokes
      if ('strokeStyleId' in node && Array.isArray(node.strokeStyleId)) {
        node.strokeStyleId.forEach((id, index) => {
          if (id && typeof id === 'string' && id !== '') {
            const style = figma.getStyleById(id);
            if (style) {
              nodeHasStyles = true;
              results.styles.push({
                nodeId: node.id,
                nodeName: node.name,
                styleName: style.name,
                styleId: style.id,
                styleType: `Stroke ${index + 1}`,
                isRemote: style.remote || false,
                libraryName: style.remote ? getLibraryNameFromStyle(style) : undefined
              });
            }
          }
        });
      }
      
      // Effect Style
      if ('effectStyleId' in node) {
        const effectStyleId = node.effectStyleId;
        if (effectStyleId && effectStyleId !== '') {
          const style = figma.getStyleById(effectStyleId);
          if (style) {
            nodeHasStyles = true;
            results.styles.push({
              nodeId: node.id,
              nodeName: node.name,
              styleName: style.name,
              styleId: style.id,
              styleType: 'Effect',
              isRemote: style.remote || false,
              libraryName: style.remote ? getLibraryNameFromStyle(style) : undefined
            });
          }
        }
      }
      
      // Text Style
      if ('textStyleId' in node) {
        const textStyleId = node.textStyleId;
        if (textStyleId && typeof textStyleId === 'string' && textStyleId !== '') {
          const style = figma.getStyleById(textStyleId);
          if (style) {
            nodeHasStyles = true;
            results.styles.push({
              nodeId: node.id,
              nodeName: node.name,
              styleName: style.name,
              styleId: style.id,
              styleType: 'Text',
              isRemote: style.remote || false,
              libraryName: style.remote ? getLibraryNameFromStyle(style) : undefined
            });
          }
        }
      }
      
      // Grid Style
      if ('gridStyleId' in node) {
        const gridStyleId = node.gridStyleId;
        if (gridStyleId && gridStyleId !== '') {
          const style = figma.getStyleById(gridStyleId);
          if (style) {
            nodeHasStyles = true;
            results.styles.push({
              nodeId: node.id,
              nodeName: node.name,
              styleName: style.name,
              styleId: style.id,
              styleType: 'Grid',
              isRemote: style.remote || false,
              libraryName: style.remote ? getLibraryNameFromStyle(style) : undefined
            });
          }
        }
      }
      
      if (nodeHasVariables) {
        results.nodesWithVariables++;
      }
      
      if (nodeHasStyles) {
        results.nodesWithStyles++;
      }
      
      // Recursivamente processar filhos
      if ('children' in node) {
        for (const child of node.children) {
          processNode(child);
        }
      }
    }
    
    // Função para extrair nome da biblioteca de um estilo
    function getLibraryNameFromStyle(style: BaseStyle): string | undefined {
      if (style.name.includes('/')) {
        return style.name.split('/')[0].trim();
      }
      return undefined;
    }
    
    // Processar todos os nós no escopo de forma profunda
    for (const node of nodesToProcess) {
      processNode(node);
    }
    
    // Agrupar variáveis por tipo
    const colorVars = results.variables.filter(v => v.valueType === "COLOR");
    const floatVars = results.variables.filter(v => v.valueType === "FLOAT");
    const stringVars = results.variables.filter(v => v.valueType === "STRING");
    const booleanVars = results.variables.filter(v => v.valueType === "BOOLEAN");
    const aliasVars = results.variables.filter(v => v.valueType === "VARIABLE_ALIAS");
    
    // Agrupar estilos por tipo
    const fillStyles = results.styles.filter(s => s.styleType.startsWith('Fill'));
    const strokeStyles = results.styles.filter(s => s.styleType.startsWith('Stroke'));
    const effectStyles = results.styles.filter(s => s.styleType === 'Effect');
    const textStyles = results.styles.filter(s => s.styleType === 'Text');
    const gridStyles = results.styles.filter(s => s.styleType === 'Grid');
    
    console.log(`Análise concluída: ${results.variables.length} variáveis e ${results.styles.length} estilos encontrados em ${results.nodeCount} nós`);
    console.log(`  - Cores: ${colorVars.length}`);
    console.log(`  - Números: ${floatVars.length}`);
    console.log(`  - Textos: ${stringVars.length}`);
    console.log(`  - Booleanos: ${booleanVars.length}`);
    console.log(`  - Aliases: ${aliasVars.length}`);
    console.log(`  - Fills: ${fillStyles.length}`);
    console.log(`  - Strokes: ${strokeStyles.length}`);
    console.log(`  - Effects: ${effectStyles.length}`);
    console.log(`  - Text Styles: ${textStyles.length}`);
    console.log(`  - Grid Styles: ${gridStyles.length}`);
    
    // Enviar resultados para a UI
    figma.ui.postMessage({
      type: 'preview-substituicao-nos',
      hasMatches: results.variables.length > 0 || results.styles.length > 0,
      variables: results.variables,
      styles: results.styles,
      colorVars,
      floatVars,
      stringVars,
      booleanVars,
      aliasVars,
      fillStyles,
      strokeStyles,
      effectStyles,
      textStyles,
      gridStyles,
      nodeCount: results.nodeCount,
      nodesWithVariables: results.nodesWithVariables,
      nodesWithStyles: results.nodesWithStyles,
      scope: scope === 'selection' ? 'seleção atual' : (scope === 'page' ? 'página atual' : 'documento inteiro')
    });
  } catch (error) {
    console.error('Erro ao gerar prévia:', error);
    figma.ui.postMessage({
      type: 'preview-substituicao-nos',
      hasMatches: false,
      scope: scope,
      error: `Erro ao gerar prévia: ${error instanceof Error ? error.message : String(error)}`
    });
  } finally {
    // Informar ao UI que o processo de carregamento terminou
    figma.ui.postMessage({ type: 'loading-preview-end' });
  }
}

// Função para substituir variáveis em nós selecionados
async function substituirVariaveisNos(libraryId: string, scope: string) {
  console.log('Iniciando substituição nos nós com libraryId:', libraryId, 'e scope:', scope);
  
  try {
    // Obter todas as variáveis
    const localVariables = await figma.variables.getLocalVariablesAsync() as ExtendedVariable[];
    const libraryVariables = localVariables.filter(v => v.remote && v.libraryId === libraryId);
    
    // Obter todos os estilos
    // Primeiro, vamos obter os estilos locais
    const localStyles = [
      ...figma.getLocalPaintStyles(),
      ...figma.getLocalTextStyles(),
      ...figma.getLocalEffectStyles(),
      ...figma.getLocalGridStyles()
    ];
    
    // Depois, obter os estilos remotos da biblioteca
    // Vamos tentar identificar estilos remotos que pertençam à biblioteca selecionada
    const allRemoteStyles = [
      ...figma.getLocalPaintStyles().filter(s => s.remote),
      ...figma.getLocalTextStyles().filter(s => s.remote),
      ...figma.getLocalEffectStyles().filter(s => s.remote),
      ...figma.getLocalGridStyles().filter(s => s.remote)
    ];
    
    // Filtrar estilos que pertencem à biblioteca selecionada
    // Vamos tentar encontrar o nome da biblioteca para fazer a correspondência
    const bibliotecasMap = await obterTodasBibliotecas();
    const bibliotecas = Array.from(bibliotecasMap.values());
    const bibliotecaSelecionada = bibliotecas.find(bib => bib.id === libraryId);
    const nomebiblioteca = bibliotecaSelecionada?.name || '';
    
    // Vamos filtrar os estilos que pertencem à biblioteca
    const libraryStyles = allRemoteStyles.filter(style => {
      if (style.name.includes('/')) {
        const styleBiblioteca = style.name.split('/')[0].trim();
        return styleBiblioteca === nomebiblioteca;
      }
      return false;
    });
    
    console.log(`Encontrados ${libraryVariables.length} variáveis e ${libraryStyles.length} estilos na biblioteca`);
    
    if (libraryVariables.length === 0 && libraryStyles.length === 0) {
      figma.ui.postMessage({
        type: 'update-complete',
        success: false,
        message: 'Não foram encontradas variáveis ou estilos na biblioteca selecionada.'
      });
      return;
    }
    
    // Mapa de variáveis da biblioteca por nome
    const variablesByName = new Map<string, Variable>();
    libraryVariables.forEach(variable => {
      variablesByName.set(variable.name, variable);
    });
    
    // Mapa de estilos da biblioteca por nome
    const stylesByLocalName = new Map<string, BaseStyle>();
    
    libraryStyles.forEach(style => {
      if (style.name.includes('/')) {
        // Extrair o nome sem o prefixo da biblioteca
        const cleanName = style.name.split('/').slice(1).join('/');
        stylesByLocalName.set(cleanName, style);
      }
    });
    
    // Determinar os nós a atualizar com base no escopo
    let nodesToProcess: SceneNode[] = [];
    if (scope === 'selection') {
      nodesToProcess = [...figma.currentPage.selection];
      if (nodesToProcess.length === 0) {
        figma.ui.postMessage({
          type: 'update-complete',
          success: false,
          message: 'Nenhum nó selecionado para atualização.'
        });
        return;
      }
    } else if (scope === 'page') {
      nodesToProcess = [...figma.currentPage.children];
    } else if (scope === 'document') {
      nodesToProcess = [];
      figma.root.children.forEach(page => {
        nodesToProcess = [...nodesToProcess, ...page.children];
      });
    }
    
    // Estatísticas para relatório
    const stats = {
      nodesProcessed: 0,
      variablesReplaced: 0,
      stylesReplaced: 0,
      nodesWithReplacement: 0
    };
    
    // Função recursiva para processar nós
    function processNodeForReplacement(node: SceneNode) {
      stats.nodesProcessed++;
      
      let nodeHadReplacement = false;
      
      // 1. Substituir variáveis no nó
      const boundVariables = node.boundVariables;
      
      if (boundVariables) {
        // Iterar sobre todas as propriedades vinculadas
        for (const prop in boundVariables) {
          const binding = boundVariables[prop as keyof typeof boundVariables];
          
          if (binding && "id" in binding) {
            // Obter a variável vinculada
            const variableId = binding.id;
            const variable = localVariables.find(v => v.id === variableId);
            
            if (variable && !variable.remote) {
              // Verificar se existe uma variável com o mesmo nome na biblioteca
              if (variablesByName.has(variable.name)) {
                const libraryVariable = variablesByName.get(variable.name);
                
                if (libraryVariable) {
                  // Substituir a variável local pela variável da biblioteca
                  try {
                    node.setBoundVariable(prop as VariableBindableNodeField, libraryVariable);
                    stats.variablesReplaced++;
                    nodeHadReplacement = true;
                  } catch (e) {
                    console.error(`Erro ao substituir variável ${variable.name} no nó ${node.name}:`, e);
                  }
                }
              }
            }
          }
        }
      }
      
      // 2. Substituir estilos no nó
      
      // Fill Style
      if ('fillStyleId' in node) {
        const fillStyleId = node.fillStyleId;
        if (fillStyleId && typeof fillStyleId === 'string' && fillStyleId !== '') {
          const style = figma.getStyleById(fillStyleId);
          if (style && !style.remote) {
            // Verificar se existe um estilo com o mesmo nome na biblioteca
            if (stylesByLocalName.has(style.name)) {
              const libraryStyle = stylesByLocalName.get(style.name);
              if (libraryStyle) {
                try {
                  // @ts-ignore
                  node.fillStyleId = libraryStyle.id;
                  stats.stylesReplaced++;
                  nodeHadReplacement = true;
                } catch (e) {
                  console.error(`Erro ao substituir estilo de preenchimento ${style.name} no nó ${node.name}:`, e);
                }
              }
            }
          }
        }
      }
      
      // Multiple fills
      if ('fillStyleId' in node && Array.isArray(node.fillStyleId)) {
        let madeChanges = false;
        
        // @ts-ignore
        const newFillStyleIds = [...node.fillStyleId];
        
        for (let i = 0; i < newFillStyleIds.length; i++) {
          const id = newFillStyleIds[i];
          if (id && typeof id === 'string' && id !== '') {
            const style = figma.getStyleById(id);
            if (style && !style.remote) {
              // Verificar se existe um estilo com o mesmo nome na biblioteca
              if (stylesByLocalName.has(style.name)) {
                const libraryStyle = stylesByLocalName.get(style.name);
                if (libraryStyle) {
                  newFillStyleIds[i] = libraryStyle.id;
                  madeChanges = true;
                  stats.stylesReplaced++;
                }
              }
            }
          }
        }
        
        if (madeChanges) {
          try {
            // @ts-ignore
            node.fillStyleId = newFillStyleIds;
            nodeHadReplacement = true;
          } catch (e) {
            console.error(`Erro ao substituir estilos de preenchimento múltiplos no nó ${node.name}:`, e);
          }
        }
      }
      
      // Stroke Style
      if ('strokeStyleId' in node) {
        const strokeStyleId = node.strokeStyleId;
        if (strokeStyleId && typeof strokeStyleId === 'string' && strokeStyleId !== '') {
          const style = figma.getStyleById(strokeStyleId);
          if (style && !style.remote) {
            // Verificar se existe um estilo com o mesmo nome na biblioteca
            if (stylesByLocalName.has(style.name)) {
              const libraryStyle = stylesByLocalName.get(style.name);
              if (libraryStyle) {
                try {
                  // @ts-ignore
                  node.strokeStyleId = libraryStyle.id;
                  stats.stylesReplaced++;
                  nodeHadReplacement = true;
                } catch (e) {
                  console.error(`Erro ao substituir estilo de contorno ${style.name} no nó ${node.name}:`, e);
                }
              }
            }
          }
        }
      }
      
      // Multiple strokes
      if ('strokeStyleId' in node && Array.isArray(node.strokeStyleId)) {
        let madeChanges = false;
        
        // @ts-ignore
        const newStrokeStyleIds = [...node.strokeStyleId];
        
        for (let i = 0; i < newStrokeStyleIds.length; i++) {
          const id = newStrokeStyleIds[i];
          if (id && typeof id === 'string' && id !== '') {
            const style = figma.getStyleById(id);
            if (style && !style.remote) {
              // Verificar se existe um estilo com o mesmo nome na biblioteca
              if (stylesByLocalName.has(style.name)) {
                const libraryStyle = stylesByLocalName.get(style.name);
                if (libraryStyle) {
                  newStrokeStyleIds[i] = libraryStyle.id;
                  madeChanges = true;
                  stats.stylesReplaced++;
                }
              }
            }
          }
        }
        
        if (madeChanges) {
          try {
            // @ts-ignore
            node.strokeStyleId = newStrokeStyleIds;
            nodeHadReplacement = true;
          } catch (e) {
            console.error(`Erro ao substituir estilos de contorno múltiplos no nó ${node.name}:`, e);
          }
        }
      }
      
      // Effect Style
      if ('effectStyleId' in node) {
        const effectStyleId = node.effectStyleId;
        if (effectStyleId && effectStyleId !== '') {
          const style = figma.getStyleById(effectStyleId);
          if (style && !style.remote) {
            // Verificar se existe um estilo com o mesmo nome na biblioteca
            if (stylesByLocalName.has(style.name)) {
              const libraryStyle = stylesByLocalName.get(style.name);
              if (libraryStyle) {
                try {
                  // @ts-ignore
                  node.effectStyleId = libraryStyle.id;
                  stats.stylesReplaced++;
                  nodeHadReplacement = true;
                } catch (e) {
                  console.error(`Erro ao substituir estilo de efeito ${style.name} no nó ${node.name}:`, e);
                }
              }
            }
          }
        }
      }
      
      // Text Style
      if ('textStyleId' in node) {
        const textStyleId = node.textStyleId;
        if (textStyleId && typeof textStyleId === 'string' && textStyleId !== '') {
          const style = figma.getStyleById(textStyleId);
          if (style && !style.remote) {
            // Verificar se existe um estilo com o mesmo nome na biblioteca
            if (stylesByLocalName.has(style.name)) {
              const libraryStyle = stylesByLocalName.get(style.name);
              if (libraryStyle) {
                try {
                  // @ts-ignore
                  node.textStyleId = libraryStyle.id;
                  stats.stylesReplaced++;
                  nodeHadReplacement = true;
                } catch (e) {
                  console.error(`Erro ao substituir estilo de texto ${style.name} no nó ${node.name}:`, e);
                }
              }
            }
          }
        }
      }
      
      // Grid Style
      if ('gridStyleId' in node) {
        const gridStyleId = node.gridStyleId;
        if (gridStyleId && gridStyleId !== '') {
          const style = figma.getStyleById(gridStyleId);
          if (style && !style.remote) {
            // Verificar se existe um estilo com o mesmo nome na biblioteca
            if (stylesByLocalName.has(style.name)) {
              const libraryStyle = stylesByLocalName.get(style.name);
              if (libraryStyle) {
                try {
                  // @ts-ignore
                  node.gridStyleId = libraryStyle.id;
                  stats.stylesReplaced++;
                  nodeHadReplacement = true;
                } catch (e) {
                  console.error(`Erro ao substituir estilo de grid ${style.name} no nó ${node.name}:`, e);
                }
              }
            }
          }
        }
      }
      
      if (nodeHadReplacement) {
        stats.nodesWithReplacement++;
      }
      
      // Recursivamente processar filhos
      if ('children' in node) {
        for (const child of node.children) {
          processNodeForReplacement(child);
        }
      }
    }
    
    // Processar todos os nós no escopo
    for (const node of nodesToProcess) {
      processNodeForReplacement(node);
    }
    
    console.log(`Substituição concluída: ${stats.variablesReplaced} variáveis e ${stats.stylesReplaced} estilos substituídos em ${stats.nodesWithReplacement} nós`);
    
    // Enviar resultados para a UI
    figma.ui.postMessage({
      type: 'update-complete',
      success: true,
      message: `Concluído! ${stats.variablesReplaced} variáveis e ${stats.stylesReplaced} estilos foram substituídos em ${stats.nodesWithReplacement} nós.`,
      stats: stats
    });
  } catch (error) {
    console.error('Erro ao substituir variáveis e estilos:', error);
    figma.ui.postMessage({
      type: 'update-complete',
      success: false,
      message: `Erro ao substituir variáveis e estilos: ${error instanceof Error ? error.message : String(error)}`
    });
  }
} 