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

console.log("Plugin iniciado");

// Verifica acesso às APIs necessárias
if (!figma.currentPage) {
  figma.notify("Erro: Não foi possível acessar a página atual");
  figma.closePlugin();
}

// Mostra a interface do usuário
figma.showUI(__html__, { width: 450, height: 600 });
console.log("UI exibida");

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
    
    // Mapear correspondências (variáveis com o mesmo nome)
    const matches: Array<{localId: string, localName: string, libraryId: string, libraryName: string}> = [];
    
    for (const localVar of localVariables) {
      if (!localVar) continue;
      
      // Procurar uma variável correspondente na biblioteca
      const libraryVar = libraryVariables.find(v => v.name === localVar.name);
      
      if (libraryVar) {
        matches.push({
          localId: localVar.id,
          localName: localVar.name,
          libraryId: libraryVar.key,
          libraryName: libraryVar.name
        });
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
    
    // Substituir variáveis locais pelas da biblioteca quando tiverem o mesmo nome
    let substituidas = 0;
    let erros = 0;
    
    // Primeiro loop para verificar e criar um mapa de correspondências
    const matches = new Map();
    
    for (const localVar of localVariables) {
      if (!localVar) continue;
      
      // Procurar uma variável correspondente na biblioteca
      const libraryVar = libraryVariables.find(v => v.name === localVar.name);
      
      if (libraryVar) {
        matches.set(localVar.id, libraryVar.key);
      }
    }
    
    // Para cada objeto na página, substituir as referências das variáveis locais por variáveis da biblioteca
    await Promise.all(figma.root.children.map(async page => {
      try {
        console.log(`Processando página: ${page.name}`);
        
        // Obter todos os nós na página
        const nodes = page.findAll();
        
        // Processar cada nó
        for (const node of nodes) {
          try {
            // Obter as variáveis vinculadas a este nó
            const boundVariables = node.boundVariables;
            
            if (boundVariables) {
              // Para cada propriedade vinculada
              for (const [property, binding] of Object.entries(boundVariables)) {
                try {
                  // Se for uma variável única
                  if (!Array.isArray(binding)) {
                    const localVarId = binding.id;
                    
                    // Verificar se temos uma correspondência
                    if (matches.has(localVarId)) {
                      const libraryVarKey = matches.get(localVarId);
                      
                      // Substituir a variável
                      // @ts-ignore
                      await node.setBoundVariable(property, {
                        type: "VARIABLE_ALIAS",
                        // @ts-ignore
                        id: libraryVarKey
                      });
                      
                      substituidas++;
                    }
                  }
                  // Se for um array de variáveis
                  else if (Array.isArray(binding)) {
                    // Tratamento especial para arrays de variáveis
                    // Será implementado conforme necessidade
                  }
                } catch (propError) {
                  console.warn(`Erro ao processar propriedade ${property}:`, propError);
                  erros++;
                }
              }
            }
          } catch (nodeError) {
            console.warn(`Erro ao processar nó:`, nodeError);
            erros++;
          }
        }
      } catch (pageError) {
        console.warn(`Erro ao processar página ${page.name}:`, pageError);
        erros++;
      }
    }));
    
    console.log(`Substituição concluída. ${substituidas} variáveis substituídas com ${erros} erros.`);
    
    // Enviar resultado para a UI
    figma.ui.postMessage({
      type: 'substituicao-result',
      success: true,
      message: `Substituição concluída! ${substituidas} variáveis foram substituídas por referências da biblioteca.${erros > 0 ? ` (${erros} erros ocorreram durante o processo)` : ''}`
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

// Quando o UI envia mensagens
figma.ui.onmessage = (msg) => {
  console.log("Mensagem recebida:", msg);
  
  if (msg.type === 'ui-ready') {
    console.log("UI está pronta, carregando bibliotecas...");
    carregarBibliotecas();
  }
  
  // Recarregar bibliotecas
  if (msg.type === 'recarregar') {
    console.log("Recarregando bibliotecas...");
    carregarBibliotecas();
  }
  
  // Carregar coleções de uma biblioteca específica
  if (msg.type === 'carregarColecoes' && msg.libraryId) {
    console.log(`Solicitando coleções da biblioteca: ${msg.libraryId}`);
    carregarColecoesDaBiblioteca(msg.libraryId);
  }
  
  // Carregar coleções locais
  if (msg.type === 'carregarColecoesLocais') {
    console.log("Solicitando coleções locais de variáveis");
    carregarColecoesLocais();
  }
  
  // Pré-visualizar substituição de variáveis
  if (msg.type === 'preVisualizarSubstituicao') {
    console.log("Solicitando prévia de substituição:", msg);
    preVisualizarSubstituicao(msg.libraryId, msg.localCollectionId);
  }
  
  // Substituir variáveis
  if (msg.type === 'substituirVariaveis') {
    console.log("Solicitando substituição de variáveis:", msg);
    substituirVariaveis(msg.libraryId, msg.localCollectionId);
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