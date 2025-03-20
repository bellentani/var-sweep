/// <reference types="@figma/plugin-typings" />

// Adicionando log para debug
console.log("Plugin var-sweep iniciando...");
console.log("Versão: 0.3.0-beta");

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

// Tipos para os tipos de valores de variáveis
type VariableValueType = "VARIABLE_ALIAS" | "COLOR" | "FLOAT" | "STRING";

// Constantes para os tipos
const VAR_TYPE_ALIAS: VariableValueType = "VARIABLE_ALIAS";
const VAR_TYPE_COLOR: VariableValueType = "COLOR";
const VAR_TYPE_FLOAT: VariableValueType = "FLOAT";
const VAR_TYPE_STRING: VariableValueType = "STRING";

// Função para substituir variáveis e estilos
async function substituirVariaveisEEstilos(node: SceneNode, variables: Array<{
  type?: string,
  property?: string,
  id: string
}>) {
  try {
    for (const variable of variables) {
      if (variable.type) {
        // Substituir variáveis
        const boundVars = (node as any).boundVariables;
        if (boundVars && variable.property && boundVars[variable.property]) {
          boundVars[variable.property] = {
            type: 'VARIABLE_ALIAS',
            id: variable.id
          };
        }
      } else if (variable.property) {
        // Substituir estilos
        switch (variable.property) {
          case 'fill':
            if ('fills' in node) {
              (node as any).fillStyleId = variable.id;
            }
            break;
          case 'stroke':
            if ('strokes' in node) {
              (node as any).strokeStyleId = variable.id;
            }
            break;
          case 'effect':
            if ('effects' in node) {
              (node as any).effectStyleId = variable.id;
            }
            break;
          case 'text':
            if ('textStyleId' in node) {
              (node as any).textStyleId = variable.id;
            }
                    break;
          case 'grid':
            if ('layoutGrids' in node) {
              (node as any).gridStyleId = variable.id;
            }
                      break;
                    }
                  }
                }
  } catch (error) {
    console.error('Erro ao substituir variáveis/estilos:', error);
  }
}

// Função para pré-visualizar substituição
async function preVisualizarSubstituicao(node: SceneNode, variables: Array<{
  type?: string,
  property?: string,
  id: string
}>) {
  try {
    // Criar uma cópia do nó para pré-visualização
    let clone: SceneNode;
    
    if (node.type === 'INSTANCE') {
      clone = (node as InstanceNode).detachInstance();
    } else {
      // Criar um novo nó do mesmo tipo
      const parent = node.parent;
      if (!parent) {
        console.error('Nó não tem pai, não é possível clonar');
        return null;
      }
      
      clone = figma.createFrame();
      clone.x = node.x;
      clone.y = node.y;
      clone.resize(node.width, node.height);
      
      // Copiar propriedades básicas
      clone.name = node.name;
      if ('opacity' in node) {
        (clone as any).opacity = (node as any).opacity;
      }
      if ('visible' in node) {
        (clone as any).visible = (node as any).visible;
      }
      if ('locked' in node) {
        (clone as any).locked = (node as any).locked;
      }
      
      // Inserir após o nó original
      parent.insertChild(parent.children.indexOf(node) + 1, clone);
    }
    
    await substituirVariaveisEEstilos(clone, variables);
    return clone;
  } catch (error) {
    console.error('Erro ao pré-visualizar substituição:', error);
    return null;
  }
}

// Interface para informações de variáveis e estilos
interface VariableInfo {
  name: string;
  type: string;
  collection: string;
  nodeId: string;
  property: string;
  isRealVariable?: boolean; // Indica se é uma variável real ou cor inline
  colorValue?: string; // Para armazenar o valor CSS da cor
  variableCollectionId?: string; // ID da coleção à qual a variável pertence
}

// Função para buscar variáveis e estilos em nós
async function buscarVariaveisEEstilos(escopo: 'selection' | 'page'): Promise<VariableInfo[]> {
  const nodes = escopo === 'selection' ? figma.currentPage.selection : [figma.currentPage];
  const variables: VariableInfo[] = [];
  
  // Conjunto para controlar variáveis que já foram adicionadas
  const addedVariableIds = new Set<string>();

  function processarNo(node: BaseNode) {
    // Verifica variáveis vinculadas
    if ('boundVariables' in node) {
      const boundVars = (node as any).boundVariables;
      if (boundVars) {
        console.log(`Verificando variáveis vinculadas em nó: ${node.name || 'sem nome'}, id: ${node.id}`);
        console.log(`Propriedades vinculadas:`, Object.keys(boundVars));
        
        // Processar todas as propriedades com variáveis vinculadas
        Object.entries(boundVars).forEach(([property, value]: [string, any]) => {
          // Se é um valor de variável única
          if (value && value.id) {
            const variable = figma.variables.getVariableById(value.id);
            if (variable && !addedVariableIds.has(variable.id)) {
              console.log(`Encontrada variável: ${variable.name}, tipo: ${variable.resolvedType}`);
              addedVariableIds.add(variable.id);
              variables.push({
                name: variable.name,
                type: variable.resolvedType.toString(),
                collection: variable.id, // Usar o ID da variável em vez do ID da coleção
                variableCollectionId: variable.variableCollectionId, // Salvar também o ID da coleção
                nodeId: node.id,
                property: property,
                isRealVariable: true // Esta é uma variável real
              });
            }
          } 
          // Se é um array de variáveis (como em fills ou strokes)
          else if (Array.isArray(value)) {
            value.forEach((varItem, index) => {
              if (varItem && varItem.id) {
                const variable = figma.variables.getVariableById(varItem.id);
                if (variable && !addedVariableIds.has(variable.id)) {
                  addedVariableIds.add(variable.id);
                  variables.push({
                    name: variable.name,
                    type: variable.resolvedType.toString(),
                    collection: variable.variableCollectionId,
                    nodeId: node.id,
                    property: `${property}[${index}]`,
                    isRealVariable: true // Esta é uma variável real
                  });
                }
              }
            });
          }
        });
      }
    }
    
    // Verifica se o nó tem propriedades de cor diretamente
    if ('fills' in node && Array.isArray(node.fills) && node.fills.length > 0) {
      // Verificar se as cores são de variáveis
      const hasBoundFills = 'boundVariables' in node && 
                            (node as any).boundVariables && 
                            (node as any).boundVariables.fills;
                            
      // Se não tem variáveis vinculadas a fills, adicionar como cores inline
      if (!hasBoundFills) {
        node.fills.forEach((fill, index) => {
          if (fill.type === 'SOLID' && fill.color) {
            const rgba = `rgba(${Math.round(fill.color.r * 255)}, ${Math.round(fill.color.g * 255)}, ${Math.round(fill.color.b * 255)}, ${fill.opacity || 1})`;
            
            variables.push({
              name: `${node.name || 'Node'} Fill ${index + 1}`,
              type: 'COLOR',
              collection: 'Inline Colors',
              nodeId: node.id,
              property: `fill-${index}`,
              isRealVariable: false, // Não é uma variável real, apenas uma cor inline
              colorValue: rgba
            });
          }
        });
      }
    }
    
    if ('strokes' in node && Array.isArray(node.strokes) && node.strokes.length > 0) {
      // Verificar se as cores são de variáveis
      const hasBoundStrokes = 'boundVariables' in node && 
                             (node as any).boundVariables && 
                             (node as any).boundVariables.strokes;
                             
      // Se não tem variáveis vinculadas a strokes, adicionar como cores inline                       
      if (!hasBoundStrokes) {
        node.strokes.forEach((stroke, index) => {
          if (stroke.type === 'SOLID' && stroke.color) {
            const rgba = `rgba(${Math.round(stroke.color.r * 255)}, ${Math.round(stroke.color.g * 255)}, ${Math.round(stroke.color.b * 255)}, ${stroke.opacity || 1})`;
                               
            variables.push({
              name: `${node.name || 'Node'} Stroke ${index + 1}`,
              type: 'COLOR',
              collection: 'Inline Colors',
              nodeId: node.id,
              property: `stroke-${index}`,
              isRealVariable: false, // Não é uma variável real, apenas uma cor inline
              colorValue: rgba
            });
          }
        });
      }
    }

    // Verifica estilos
    if ('fillStyleId' in node && node.fillStyleId) {
      const style = figma.getStyleById(node.fillStyleId.toString());
      if (style) {
        variables.push({
          name: style.name,
          type: 'style',
          collection: 'Fills',
          nodeId: node.id,
          property: 'fill'
        });
      }
    }

    if ('strokeStyleId' in node && node.strokeStyleId) {
      const style = figma.getStyleById(node.strokeStyleId.toString());
      if (style) {
        variables.push({
          name: style.name,
          type: 'style',
          collection: 'Strokes',
          nodeId: node.id,
          property: 'stroke'
        });
      }
    }

    if ('effectStyleId' in node && node.effectStyleId) {
      const style = figma.getStyleById(node.effectStyleId.toString());
      if (style) {
        variables.push({
          name: style.name,
          type: 'style',
          collection: 'Effects',
          nodeId: node.id,
          property: 'effect'
        });
      }
    }

    if ('textStyleId' in node && node.textStyleId) {
      const style = figma.getStyleById(node.textStyleId.toString());
      if (style) {
        variables.push({
          name: style.name,
          type: 'style',
          collection: 'Text Styles',
          nodeId: node.id,
          property: 'text'
        });
      }
    }

    if ('gridStyleId' in node && node.gridStyleId) {
      const style = figma.getStyleById(node.gridStyleId.toString());
      if (style) {
        variables.push({
          name: style.name,
          type: 'style',
          collection: 'Grid Styles',
          nodeId: node.id,
          property: 'grid'
        });
      }
    }

    // Processa nós filhos recursivamente
    if ('children' in node) {
      (node as any).children.forEach((child: BaseNode) => processarNo(child));
    }
  }

  // Processa todos os nós no escopo
  nodes.forEach(node => processarNo(node));

  return variables;
}

// Função para procurar variáveis e estilos nos nós selecionados
async function procurarVariaveisEEstilos(options: {scope: 'selection' | 'page', libraryId?: string, collectionId?: string}): Promise<void> {
  try {
    console.log("Buscando variáveis e estilos...");
    console.log("Opções:", options);
    
    const selection = figma.currentPage.selection;
    
    if (!selection || selection.length === 0) {
      console.log("Nenhum elemento selecionado");
      figma.ui.postMessage({
        type: 'no-variables-found'
      });
      return;
    }
    
    const variables = await buscarVariaveisEEstilos(options.scope);
    
    console.log(`Encontradas ${variables.length} variáveis e estilos`);
    
    // Processar valores de cor para exibição na UI
    const processedVariables = await Promise.all(variables.map(async variable => {
      // Se for uma variável real do tipo COLOR, buscar seu valor real
      if (variable.type === 'COLOR' && variable.isRealVariable) {
        try {
          // Obter a variável diretamente pelo ID
          const variableObj = figma.variables.getVariableById(variable.collection);
          
          if (variableObj) {
            // Filtrar por coleção específica, se fornecida
            if (options.collectionId && options.collectionId !== variableObj.variableCollectionId) {
              console.log(`Variável ${variable.name} ignorada - não pertence à coleção ${options.collectionId}`);
              return null; // Ignorar esta variável se não pertencer à coleção selecionada
            }
            
            // Obter a coleção para acessar os modos
            const collection = figma.variables.getVariableCollectionById(variableObj.variableCollectionId);
            
            if (collection && collection.modes.length > 0) {
              // Usar o primeiro modo disponível (geralmente é o padrão)
              const modeId = collection.modes[0].modeId;
              
              // Obter o valor da variável neste modo
              const value = variableObj.valuesByMode[modeId];
              
              console.log(`Processando variável ${variable.name}, valor:`, value);
              
              // Se o valor for um objeto de cor
              if (value && typeof value === 'object' && 'r' in value &&
                  'g' in value && 'b' in value) {
                // Verificar se temos o valor alpha
                const alpha = 'a' in value ? value.a : 1;
                const rgba = `rgba(${Math.round(value.r * 255)}, ${Math.round(value.g * 255)}, ${Math.round(value.b * 255)}, ${alpha})`;
                
                console.log(`Processada variável de cor: ${variable.name} com valor: ${rgba}`);
                
                return {
                  ...variable,
                  colorValue: rgba
                };
              }
            }
          }
        } catch (err) {
          console.warn(`Erro ao processar valor de cor da variável ${variable.name}:`, err);
        }
      }
      return variable;
    }));
    
    // Filtrar as variáveis nulas (que foram excluídas pelo filtro de coleção)
    const filteredVariables = processedVariables.filter(v => v !== null);
    
    if (filteredVariables.length > 0) {
      console.log("Enviando variáveis encontradas para a UI");
      
      // Adicionando logs para debug
      const colorVars = filteredVariables.filter(v => v.type === 'COLOR' && v.isRealVariable === true);
      console.log(`Variáveis de cor reais encontradas: ${colorVars.length}`);
      colorVars.forEach(v => console.log(`  - ${v.name} (${v.collection})`));
      
      figma.ui.postMessage({
        type: 'variables-found',
        variables: filteredVariables
      });
    } else {
      figma.ui.postMessage({
        type: 'no-variables-found'
      });
    }
  } catch (error) {
    console.error('Erro ao buscar variáveis:', error);
    figma.ui.postMessage({
      type: 'error',
      error: 'Erro ao buscar variáveis e estilos.'
    });
  }
}

// Função para carregar os dados iniciais
async function carregarDadosIniciais(): Promise<void> {
  try {
    console.log("Carregando dados iniciais...");
    await carregarBibliotecas();
    
    // Também carrega as coleções locais para a aba Update Collections
    await carregarColecoesLocais();
  } catch (error) {
    console.error('Erro ao carregar dados iniciais:', error);
    figma.ui.postMessage({
      type: 'error',
      error: 'Erro ao carregar dados iniciais.'
    });
  }
}
    
// Função para carregar as coleções de uma biblioteca
async function carregarColecoes(libraryId: string): Promise<void> {
  try {
    console.log(`Carregando coleções da biblioteca: ${libraryId}`);
    await carregarColecoesDaBiblioteca(libraryId);
  } catch (error) {
    console.error('Erro ao carregar coleções:', error);
    figma.ui.postMessage({
      type: 'error',
      error: 'Erro ao carregar coleções da biblioteca.'
    });
  }
}

// Função para pré-visualizar correspondências entre biblioteca e coleção local
async function preVisualizarCorrespondencias(libraryId: string, localCollectionId: string): Promise<void> {
  try {
    console.log(`Gerando prévia de correspondências - Biblioteca: ${libraryId}, Coleção Local: ${localCollectionId}`);
    
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
    
    console.log(`Obtidas ${libraryVariables.length} variáveis da biblioteca para referência`);
    
    // Obter variáveis da coleção local
    const localVariables = localCollection.variableIds.map((id: string) => 
      figma.variables.getVariableById(id)
    ).filter((v: any) => v !== null);
    
    console.log(`Encontradas ${localVariables.length} variáveis na coleção local`);
    
    // Função para comparar valores de variáveis
    function valoresIguais(valor1: any, valor2: any): boolean {
      // Se ambos forem undefined ou null, são considerados iguais
      if (!valor1 && !valor2) return true;
      if (!valor1 || !valor2) return false;
      
      // Se for tipo COLOR, compara os componentes RGB
      if (typeof valor1 === 'object' && typeof valor2 === 'object' && 
          valor1.type === 'COLOR' && valor2.type === 'COLOR') {
        return (
          valor1.r === valor2.r &&
          valor1.g === valor2.g &&
          valor1.b === valor2.b &&
          (valor1.a === valor2.a || // Compara alpha se disponível
           (valor1.a === undefined && valor2.a === undefined)) // Ou se ambos não tiverem alpha
        );
      }
      
      // Se for tipo FLOAT, compara o valor numérico
      if (typeof valor1 === 'object' && typeof valor2 === 'object' && 
          valor1.type === 'FLOAT' && valor2.type === 'FLOAT') {
        return valor1.value === valor2.value;
      }
      
      // Se for tipo STRING, compara o valor de texto
      if (typeof valor1 === 'object' && typeof valor2 === 'object' && 
          valor1.type === 'STRING' && valor2.type === 'STRING') {
        return valor1.value === valor2.value;
      }
      
      // Se for tipo BOOLEAN, compara o valor booleano
      if (typeof valor1 === 'object' && typeof valor2 === 'object' && 
          valor1.type === 'BOOLEAN' && valor2.type === 'BOOLEAN') {
        return valor1.value === valor2.value;
      }
      
      return false; // Tipos diferentes não são considerados iguais
    }
    
    // Mapear correspondências baseadas nos valores e/ou nomes
    const matches: Array<{
      localId: string, 
      localName: string, 
      libraryId: string, 
      libraryName: string,
      valueType: string,
      modes?: Array<{
        modeId: string,
        name: string,
        value: string
      }>
    }> = [];
    
    // Inicializar estrutura para agrupar variáveis por ID
    const matchesMap: {[key: string]: {
      localId: string, 
      localName: string, 
      libraryId: string, 
      libraryName: string, 
      valueType: string
    }} = {};
    
    // Fase 1: Encontrar correspondências e agrupá-las por ID local
    for (const localVar of localVariables) {
      if (!localVar) continue;
      
      // Variável para armazenar se encontramos correspondência para esta variável local
      let encontrouCorrespondencia = false;
      
      // Para cada modo da coleção local
      for (const modo of localCollection.modes) {
        if (encontrouCorrespondencia) break; // Se já encontramos correspondência, não precisamos verificar outros modos
        
        const modeName = modo.name || 'Modo';
        const localValue = localVar.valuesByMode[modo.modeId];
          
          if (!localValue) continue;
          
        // CASO 1: Referência a variável
        if (typeof localValue === 'object' && localValue !== null && 
            'type' in localValue && 
            ((localValue as any).type === 'VARIABLE_ALIAS') && 
            'id' in localValue) {
              const referencedVarId = localValue.id as string;
              const referencedVar = figma.variables.getVariableById(referencedVarId);
              
              if (referencedVar) {
            const matchingLibraryVars = libraryVariables.filter(v => v.name === referencedVar.name);
                
                if (matchingLibraryVars.length > 0) {
              const libVar = matchingLibraryVars[0];
              matchesMap[localVar.id] = {
                      localId: localVar.id,
                      localName: localVar.name,
                      libraryId: libVar.key,
                      libraryName: libVar.name,
                      valueType: 'Referência a Variável'
              };
              encontrouCorrespondencia = true;
            }
          }
        }
        
        // CASO 2: String como nome de variável
        else if (typeof localValue === 'object' && localValue !== null && 
            'type' in localValue && 
            ((localValue as any).type === 'STRING') && 
            'value' in localValue) {
          const localString = (localValue as any).value as string;
          const matchingLibraryVars = libraryVariables.filter(v => v.name === localString);
          
          if (matchingLibraryVars.length > 0) {
            const libVar = matchingLibraryVars[0];
            matchesMap[localVar.id] = {
                        localId: localVar.id,
                        localName: localVar.name,
                        libraryId: libVar.key,
                        libraryName: libVar.name,
              valueType: 'Nome de Variável'
            };
            encontrouCorrespondencia = true;
          }
        }
        
        // CASO 3: Comparação de valores
        else {
              for (const libVar of libraryVariables) {
            if (!libVar || !libVar.valuesByMode) continue;
            
            for (const libModoId in libVar.valuesByMode) {
              const libValor = libVar.valuesByMode[libModoId];
              
              if (!libValor) continue;
              
              if (valoresIguais(localValue, libValor)) {
                matchesMap[localVar.id] = {
                      localId: localVar.id,
                      localName: localVar.name,
                      libraryId: libVar.key,
                      libraryName: libVar.name,
                  valueType: localVar.resolvedType || 'Valor Correspondente'
                };
                encontrouCorrespondencia = true;
                    break;
                  }
                }
            
            if (encontrouCorrespondencia) break;
          }
        }
      }
    }
    
    // Fase 2: Adicionar informações de modo para cada variável correspondente
    for (const localId in matchesMap) {
      try {
        // Obter a variável local
        const localVar = figma.variables.getVariableById(localId);
        
        if (!localVar) {
          console.warn(`Variável local com ID ${localId} não encontrada`);
          continue;
        }
        
        // Encontrar a variável da biblioteca pelo nome
        const matchInfo = matchesMap[localId];
        const libVarName = matchInfo.libraryName;
        const libVar = libraryVariables.find(v => v.name === libVarName);
        
        if (!libVar) {
          console.warn(`Variável da biblioteca com nome "${libVarName}" não encontrada`);
          continue;
        }
        
        // Criar uma nova correspondência com informações de modo
        const newMatch = {
          ...matchesMap[localId],
          modes: [] as Array<{ modeId: string, name: string, value: string }>
        };
        
        // Para cada modo da coleção local
        for (const mode of localCollection.modes) {
          // Pular se a variável local não tiver valor definido para este modo
          if (!localVar.valuesByMode.hasOwnProperty(mode.modeId)) {
            console.log(`Modo ${mode.name} não tem valor definido, pulando...`);
            continue;
          }
          
          const valorLocal = localVar.valuesByMode[mode.modeId];
          if (!valorLocal) continue;
          
          // Formatar o valor para exibição amigável
          let valorFormatado = "";
          
          if (typeof valorLocal === 'object' && valorLocal !== null) {
            if ('type' in valorLocal) {
              // Formatação baseada no tipo
              const tipo = (valorLocal as any).type as string;
              switch (tipo) {
                case 'COLOR':
                  const colorValue = valorLocal as any;
                  valorFormatado = `rgba(${Math.round(colorValue.r * 255)}, ${Math.round(colorValue.g * 255)}, ${Math.round(colorValue.b * 255)}, ${colorValue.a || 1})`;
                  break;
                case 'FLOAT':
                  valorFormatado = `${(valorLocal as any).value}`;
                  break;
                case 'STRING':
                  valorFormatado = `"${(valorLocal as any).value}"`;
                  break;
                case 'BOOLEAN':
                  valorFormatado = (valorLocal as any).value ? 'true' : 'false';
                  break;
                case 'VARIABLE_ALIAS':
                  const refVar = figma.variables.getVariableById((valorLocal as any).id);
                  valorFormatado = refVar ? `→ ${refVar.name}` : `→ ID:${(valorLocal as any).id}`;
                  break;
                default:
                  valorFormatado = 'Tipo desconhecido';
              }
            } else {
              valorFormatado = JSON.stringify(valorLocal);
            }
          } else {
            valorFormatado = String(valorLocal);
          }
          
          // Adicionar ao array de modos
          newMatch.modes.push({
            modeId: mode.modeId,
            name: mode.name,
            value: valorFormatado
          });
        }
        
        // Adicionar esta correspondência à lista
        matches.push(newMatch);
        
      } catch (varError) {
        console.warn(`Erro ao processar variável com ID ${localId}: ${varError}`);
      }
    }
    
    console.log(`Encontradas ${matches.length} correspondências entre variáveis locais e da biblioteca`);
    
    // Enviar resultado para a UI
    if (matches.length > 0) {
    figma.ui.postMessage({
        type: 'preview-correspondencias',
        hasMatches: true,
      matches: matches,
      totalMatches: matches.length
    });
    } else {
      figma.ui.postMessage({
        type: 'preview-correspondencias',
        hasMatches: false,
        message: "Não foram encontradas correspondências entre as variáveis."
      });
    }
    
  } catch (error) {
    console.error("Erro ao gerar prévia:", error);
    figma.ui.postMessage({
      type: 'preview-correspondencias',
      hasMatches: false,
      error: String(error)
    });
  }
}

// Função para substituir variáveis em uma coleção local pelas correspondentes da biblioteca
async function substituirVariaveisEmColecao(matches: Array<{
  localId: string, 
  localName: string, 
  libraryId: string,
  libraryName: string,
  valueType: string,
  modes?: Array<{
    modeId: string,
    name: string,
    value: string
  }>
}>): Promise<void> {
  try {
    console.log(`Iniciando substituição de ${matches.length} variáveis na coleção local`);
    
    // Contadores para acompanhar o progresso
    let variaveisAlteradas = 0;
    let variaveisComErro = 0;
    
    // Função para formatar valor para exibição nos logs
    function formatarValorLog(valor: any): string {
      if (!valor) return "undefined";
      
      if (typeof valor === 'object') {
        if (valor.type === 'COLOR') {
          return `RGB(${Math.round(valor.r * 255)},${Math.round(valor.g * 255)},${Math.round(valor.b * 255)})`;
        } else if (valor.type === 'FLOAT') {
          return `${valor.value}`;
        } else if (valor.type === 'STRING') {
          return `"${valor.value}"`;
        } else if (valor.type === 'VARIABLE_ALIAS') {
          const refVar = figma.variables.getVariableById(valor.id);
          return `Alias -> ${refVar ? refVar.name : valor.id}`;
        } else {
          return JSON.stringify(valor);
        }
      }
      
      return String(valor);
    }
    
    // Primeiro, carregar TODAS as coleções de variáveis de TODAS as bibliotecas
    // @ts-ignore
    const variableCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
    
    if (!variableCollections || !Array.isArray(variableCollections)) {
      throw new Error("Não foi possível obter as coleções de variáveis das bibliotecas");
    }
    
    console.log(`Encontradas ${variableCollections.length} coleções de variáveis em todas as bibliotecas`);
    
    // Obter todas as variáveis de todas as coleções de todas as bibliotecas
    console.log("Carregando todas as variáveis das bibliotecas...");
    const todasVariaveisBiblioteca: any[] = [];
    
    for (const collection of variableCollections) {
      try {
        console.log(`Carregando variáveis da coleção ${collection.name} da biblioteca ${collection.libraryName}...`);
        // @ts-ignore
        const variables = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(collection.key);
        
        if (variables && Array.isArray(variables)) {
          console.log(`Adicionando ${variables.length} variáveis da coleção ${collection.name}`);
          todasVariaveisBiblioteca.push(...variables);
        }
      } catch (err) {
        console.warn(`Erro ao obter variáveis da coleção ${collection.name}:`, err);
      }
    }
    
    console.log(`Carregadas ${todasVariaveisBiblioteca.length} variáveis de todas as bibliotecas`);
    
    // Função para resolver o valor real de uma variável alias
    async function resolverValorReal(valor: any): Promise<any> {
      if (!valor) return null;
      
      // Se for uma referência a outra variável, seguimos a referência
      if (typeof valor === 'object' && valor !== null && 
          valor.type === 'VARIABLE_ALIAS' && valor.id) {
        
        const variavelReferenciada = figma.variables.getVariableById(valor.id);
        if (variavelReferenciada) {
          console.log(`Variável é referência para ${variavelReferenciada.name}`);
          
          // Verificamos se está variável está nos matches
          const matchCorrespondente = matches.find(m => m.localName === variavelReferenciada.name);
          if (matchCorrespondente) {
            console.log(`Encontrado match para a variável referenciada: ${matchCorrespondente.libraryName}`);
            
            // Procurar esta variável na biblioteca
            const variavelBiblioteca = todasVariaveisBiblioteca.find(v => 
              v.name === matchCorrespondente.libraryName || 
              v.name.endsWith(`/${matchCorrespondente.libraryName}`)
            );
            
            if (variavelBiblioteca) {
              // Retornar a referência para esta variável da biblioteca
              return {
                variavelEncontrada: true,
                variavelBiblioteca: variavelBiblioteca
              };
            }
          }
          
          // Não encontramos correspondência direta pelo nome, vamos procurar pelo valor
          // Para cada variável na biblioteca, verificamos se tem o mesmo nome
          for (const varBiblioteca of todasVariaveisBiblioteca) {
            if (varBiblioteca.name === variavelReferenciada.name || 
                varBiblioteca.name.endsWith(`/${variavelReferenciada.name}`)) {
              console.log(`Encontrada variável na biblioteca com nome ${varBiblioteca.name}`);
              
              return {
                variavelEncontrada: true,
                variavelBiblioteca: varBiblioteca
              };
            }
          }
        }
      }
      
      // Caso não encontre uma referência válida, retornamos o valor original
      return {
        variavelEncontrada: false,
        valorOriginal: valor
      };
    }
    
    // Para cada variável nos matches
    for (const match of matches) {
      try {
        // Obter a variável local
        const localVar = figma.variables.getVariableById(match.localId);
        if (!localVar) {
          console.warn(`Variável local com ID ${match.localId} não encontrada`);
          continue;
        }
        
        // Obter a coleção local
        const localCollection = figma.variables.getVariableCollectionById(localVar.variableCollectionId);
        if (!localCollection) {
          console.warn(`Coleção local para variável ${localVar.name} não encontrada`);
          continue;
        }
        
        console.log(`Processando variável local: ${localVar.name}`);
        
        // Flag para indicar se houve alteração em algum modo desta variável
        let variavelAlterada = false;
        
        // Para cada modo definido nos matches
        if (match.modes && match.modes.length > 0) {
          // Para cada modo na coleção local que está nos matches
          for (const modoInfo of match.modes) {
            try {
              const modoId = modoInfo.modeId;
              const modoName = modoInfo.name;
              
              // Verificar se o modo existe na coleção local
              const modoLocal = localCollection.modes.find(m => m.modeId === modoId);
              if (!modoLocal) {
                console.warn(`Modo ${modoName} não encontrado na coleção local`);
                continue;
              }
              
              // Obter o valor atual neste modo
              const valorAtual = localVar.valuesByMode[modoId];
              if (!valorAtual) {
                console.log(`Modo ${modoName} não tem valor definido, pulando...`);
                continue;
              }
              
              console.log(`Processando modo: ${modoName} (ID: ${modoId}) para variável ${localVar.name}`);
              console.log(`Valor atual: ${formatarValorLog(valorAtual)}`);
              
              // Verificar se é uma referência e tentar resolver
              const resultadoResolucao = await resolverValorReal(valorAtual);
              
              if (resultadoResolucao.variavelEncontrada) {
                // Se encontramos uma variável correspondente, importar e aplicar
                try {
                  console.log(`Importando variável ${resultadoResolucao.variavelBiblioteca.name}...`);
                  // @ts-ignore
                  const importedVar = await figma.variables.importVariableByKeyAsync(resultadoResolucao.variavelBiblioteca.key);
                  
                  if (importedVar) {
                    // Criar referência para a variável importada
                    const referencia = {
                      type: "VARIABLE_ALIAS" as const,
                      id: importedVar.id
                    };
                    
                    console.log(`Modo ${modoName} está ${formatarValorLog(valorAtual)} e vai para Alias -> ${importedVar.name}`);
                    
                    // Fazer backup do valor atual
                    const valorBackup = valorAtual;
                    
                    try {
                      // Aplicar a referência SOMENTE para este modo específico
                      localVar.setValueForMode(modoId, referencia);
                      variavelAlterada = true;
                      console.log(`Modo ${modoName} atualizado com sucesso para ${importedVar.name}`);
                    } catch (err) {
                      console.warn(`Erro ao aplicar referência para modo ${modoName}: ${err}`);
                      
                      // Restaurar o valor original
                      try {
                        localVar.setValueForMode(modoId, valorBackup);
                        console.log(`Restaurado valor original para o modo ${modoName}`);
                      } catch (restoreErr) {
                        console.error(`Erro ao restaurar valor original para o modo ${modoName}: ${restoreErr}`);
                      }
                      
                      variaveisComErro++;
                    }
                  } else {
                    console.warn(`Não foi possível importar a variável ${resultadoResolucao.variavelBiblioteca.name}`);
                  }
                } catch (importErr) {
                  console.warn(`Erro ao importar variável: ${importErr}`);
                }
              } else {
                // Não foi possível resolver uma referência direta, tentar encontrar por valor
                console.log(`Não foi encontrada referência direta, tentando buscar por nome...`);
                
                // Encontrar todas as variáveis da biblioteca com o MESMO NOME que a variável no match
                const variaveisComMesmoNome = todasVariaveisBiblioteca.filter(v => 
                  v.name === match.libraryName || 
                  v.name.endsWith(`/${match.libraryName}`)
                );
                
                console.log(`Encontradas ${variaveisComMesmoNome.length} variáveis com o nome "${match.libraryName}" nas bibliotecas`);
                
                if (variaveisComMesmoNome.length > 0) {
                  try {
                    // Usar a primeira variável encontrada com este nome
                    const varBiblioteca = variaveisComMesmoNome[0];
                    
                    // @ts-ignore
                    const importedVar = await figma.variables.importVariableByKeyAsync(varBiblioteca.key);
                    
                    if (importedVar) {
                      // Criar referência para a variável importada
                      const referencia = {
                        type: "VARIABLE_ALIAS" as const,
                        id: importedVar.id
                      };
                      
                      console.log(`Modo ${modoName} está ${formatarValorLog(valorAtual)} e vai para Alias -> ${importedVar.name}`);
                      
                      // Fazer backup do valor atual
                      const valorBackup = valorAtual;
                      
                      try {
                        // Aplicar a referência SOMENTE para este modo específico
                        localVar.setValueForMode(modoId, referencia);
                        variavelAlterada = true;
                        console.log(`Modo ${modoName} atualizado com sucesso para ${importedVar.name}`);
                      } catch (err) {
                        console.warn(`Erro ao aplicar referência para modo ${modoName}: ${err}`);
                        
                        // Restaurar o valor original
                        try {
                          localVar.setValueForMode(modoId, valorBackup);
                          console.log(`Restaurado valor original para o modo ${modoName}`);
                        } catch (restoreErr) {
                          console.error(`Erro ao restaurar valor original para o modo ${modoName}: ${restoreErr}`);
                        }
                        
                        variaveisComErro++;
                      }
                    } else {
                      console.warn(`Não foi possível importar a variável ${varBiblioteca.name}`);
                    }
                  } catch (importErr) {
                    console.warn(`Erro ao importar variável: ${importErr}`);
                  }
                } else {
                  console.warn(`Não foi encontrada variável com nome "${match.libraryName}" nas bibliotecas`);
                }
              }
            } catch (modoErr) {
              console.warn(`Erro ao processar modo ${modoInfo.name}: ${modoErr}`);
              variaveisComErro++;
            }
          }
        } else {
          console.warn(`Variável ${localVar.name} não tem modos definidos nos matches`);
        }
        
        // Se a variável foi alterada em algum modo, incrementamos o contador
        if (variavelAlterada) {
          variaveisAlteradas++;
          console.log(`Variável ${localVar.name} atualizada com sucesso em pelo menos um modo`);
        }
      } catch (varErr) {
        console.error(`Erro ao processar variável ${match.localName}: ${varErr}`);
        variaveisComErro++;
      }
    }
    
    console.log(`Substituição concluída: ${variaveisAlteradas} variáveis alteradas, ${variaveisComErro} erros`);
    
    // Enviar resultado para a UI
    if (variaveisAlteradas > 0) {
      figma.ui.postMessage({
        type: 'update-collections-result',
        success: true,
        message: `${variaveisAlteradas} variáveis atualizadas com sucesso. ${variaveisComErro} variáveis com erro.`
      });
    } else {
      figma.ui.postMessage({
        type: 'update-collections-result',
        success: false,
        message: `Não foi possível atualizar as variáveis. ${variaveisComErro} variáveis com erro.`
      });
    }
  } catch (error) {
    console.error("Erro ao substituir variáveis:", error);
    
    figma.ui.postMessage({
      type: 'update-collections-result',
      success: false,
      message: `Erro: ${String(error)}`
    });
  }
}

// Configurar o manipulador de mensagens
figma.ui.onmessage = async (msg) => {
  console.log('Mensagem recebida:', msg);

  if (msg.type === 'search-variables') {
    console.log('Procurando variáveis e estilos...');
    
    // Verificamos se a flag matchByName está presente na mensagem
    console.log('Opções recebidas:', { 
      scope: msg.scope || 'selection',
      libraryId: msg.libraryId,
      collectionId: msg.collectionId,
      checkMatch: msg.checkMatch,
      matchByName: msg.matchByName
    });
    
    // Busca variáveis e estilos e aplica correspondência baseada nas opções
    const nodes = msg.scope === 'page' ? figma.currentPage.children : figma.currentPage.selection;
    
    if (!nodes || nodes.length === 0) {
      figma.ui.postMessage({ type: 'no-variables-found', message: 'Nenhum elemento selecionado.' });
      return;
    }
    
    try {
      // Buscar variáveis e estilos nos nós
      const foundVariables = await buscarVariaveisEEstilos(msg.scope || 'selection');
      
      // Se não encontramos variáveis, informamos à UI
      if (!foundVariables || foundVariables.length === 0) {
        figma.ui.postMessage({ type: 'no-variables-found', message: 'Nenhuma variável ou estilo encontrado.' });
        return;
      }
      
      console.log(`Processando ${foundVariables.length} variáveis encontradas para verificar correspondências`);
      
      // Mostrar variáveis encontradas (para debug)
      foundVariables.forEach((v, i) => {
        if (i < 10) { // Limitar a 10 para não inundar o console
          console.log(`  - [${i}] Nome: "${v.name}", Tipo: ${v.type}`);
        }
      });
      
      // Separar estilos de texto, efeitos e layout grid que precisam ser tratados separadamente
      const regularVariables = foundVariables.filter(v => 
        v.type !== 'style' || 
        (v.property !== 'text' && v.property !== 'effect' && v.property !== 'grid')
      );
      
      const specialStyles = foundVariables.filter(v => 
        v.type === 'style' && 
        (v.property === 'text' || v.property === 'effect' || v.property === 'grid')
      );
      
      console.log(`Identificados ${regularVariables.length} variáveis regulares e ${specialStyles.length} estilos especiais`);
      
      // Verificar a correspondência com variáveis reais da coleção selecionada
      if (msg.matchByName && msg.checkMatch && msg.libraryId && msg.collectionId) {
        console.log(`Buscando variáveis reais na biblioteca ${msg.libraryId}, coleção ${msg.collectionId}`);
        
        try {
          // 1. Obter as variáveis reais da biblioteca/coleção selecionada
          // @ts-ignore - API pode não estar nas tipagens
          const variableCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
          
          if (!variableCollections || !Array.isArray(variableCollections)) {
            throw new Error("Não foi possível obter as coleções de variáveis");
          }
          
          // Encontrar a coleção específica
          const collection = variableCollections.find((collection: any) => {
            return collection.key === msg.collectionId || collection.id === msg.collectionId;
          }) as any;
          
          if (!collection) {
            console.warn(`Coleção com ID ${msg.collectionId} não encontrada`);
            figma.ui.postMessage({
              type: 'variables-found',
              variables: foundVariables
            });
            return;
          }
          
          console.log(`Coleção encontrada: ${collection.name}`);
          
          // 2. Obter variáveis da coleção
          // @ts-ignore
          const collectionVariables = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(collection.key);
          
          if (!collectionVariables || !Array.isArray(collectionVariables)) {
            console.warn("Não foi possível obter as variáveis da coleção");
            figma.ui.postMessage({
              type: 'variables-found',
              variables: foundVariables
            });
            return;
          }
          
          console.log(`Encontradas ${collectionVariables.length} variáveis na coleção de referência`);
          
          // Extrair os nomes das variáveis da coleção para facilitar a busca
          const collectionVarNames = collectionVariables.map((v: any) => v.name.toLowerCase());
          console.log(`Nomes das variáveis na coleção: ${collectionVarNames.slice(0, 5).join(', ')}${collectionVarNames.length > 5 ? '...' : ''}`);
          
          // 3. Determinar o tipo predominante das variáveis na coleção (para logging)
          let colorCount = 0;
          let floatCount = 0;
          let stringCount = 0;
          
          collectionVariables.forEach((v: any) => {
            if (v.resolvedType === 'COLOR') colorCount++;
            else if (v.resolvedType === 'FLOAT') floatCount++;
            else if (v.resolvedType === 'STRING') stringCount++;
          });
          
          console.log(`Tipos na coleção - COLOR: ${colorCount}, FLOAT: ${floatCount}, STRING: ${stringCount}`);
          
          const predominantType = colorCount > floatCount && colorCount > stringCount 
            ? 'COLOR' 
            : floatCount > colorCount && floatCount > stringCount 
              ? 'FLOAT' 
              : 'STRING';
          
          console.log(`Tipo predominante na coleção: ${predominantType}`);
          
          // 4. Marcar correspondências baseadas nos nomes das variáveis (apenas para variáveis regulares)
          const regularVariablesWithMatch = regularVariables.map(variable => {
            // Uma variável tem match se seu nome existir na coleção de referência
            // ou se for uma parte significativa de um nome na coleção
            let hasMatch = false;
            
            // Nome da variável para comparação
            const varName = variable.name.toLowerCase();
            
            // 4.1 Match exato pelo nome
            if (collectionVarNames.includes(varName)) {
              console.log(`Match exato para "${varName}"`);
              hasMatch = true;
            } 
            // 4.2 Match parcial - verificar se alguma variável na coleção contém este nome
            else {
              // Se for um nome curto (menos de 3 caracteres), precisa de match exato
              if (varName.length >= 3) {
                for (const name of collectionVarNames) {
                  if (name.includes(varName) || varName.includes(name)) {
                    console.log(`Match parcial: "${varName}" com "${name}"`);
                    hasMatch = true;
                    break;
                  }
                }
              }
            }
            
            // 4.3 Se não encontrou match por nome, verificar se o tipo corresponde ao predominante
            if (!hasMatch && variable.type === predominantType) {
              console.log(`Match por tipo para "${varName}" (${variable.type} corresponde ao predominante)`);
              hasMatch = variable.type === predominantType;
            }
            
            return {
              ...variable,
              hasMatch
            };
          });
          
          // 5. Marcar correspondências para estilos especiais (text, effect, grid)
          // Para esses estilos, consideramos que eles sempre têm match quando uma biblioteca é selecionada
          const specialStylesWithMatch = specialStyles.map(style => {
            let hasMatch = true; // Por padrão, consideramos match para esses estilos especiais
            
            // Verificações adicionais para log
            const styleType = style.property === 'text' ? 'texto' : 
                             style.property === 'effect' ? 'efeito' : 'grid';
            
            console.log(`Estilo de ${styleType} "${style.name}" marcado como match por exceção`);
            
            return {
              ...style,
              hasMatch
            };
          });
          
          // 6. Combinar os resultados
          const allVariablesWithMatch = [...regularVariablesWithMatch, ...specialStylesWithMatch];
          
          // Contar quantas variáveis estão marcadas como match
          const matchCount = allVariablesWithMatch.filter(v => v.hasMatch).length;
          console.log(`CORRESPONDÊNCIA TOTAL: ${matchCount} de ${allVariablesWithMatch.length} itens marcados como correspondentes`);
          console.log(`- Variáveis regulares: ${regularVariablesWithMatch.filter(v => v.hasMatch).length} de ${regularVariablesWithMatch.length}`);
          console.log(`- Estilos especiais: ${specialStylesWithMatch.filter(v => v.hasMatch).length} de ${specialStylesWithMatch.length}`);
          
          figma.ui.postMessage({
            type: 'variables-found',
            variables: allVariablesWithMatch
          });
          return;
        } catch (error) {
          console.error('Erro ao buscar variáveis da coleção:', error);
          // Em caso de erro, continuamos com o fluxo normal
        }
      }
      
      // Caso não estejamos usando matchByName ou ocorreu algum erro, continuamos com o fluxo normal
      figma.ui.postMessage({
        type: 'variables-found',
        variables: foundVariables
      });
    } catch (error) {
      console.error('Erro ao buscar variáveis:', error);
      figma.ui.postMessage({
        type: 'error',
        error: 'Erro ao buscar variáveis e estilos.'
      });
    }
  }
  else if (msg.type === 'ui-ready') {
    console.log('UI pronta, carregando dados iniciais...');
    await carregarDadosIniciais();
  }
  else if (msg.type === 'recarregar') {
    console.log('Recarregando dados...');
    await carregarDadosIniciais();
  }
  else if (msg.type === 'carregarColecoes') {
    console.log(`Carregando coleções da biblioteca: ${msg.libraryId}`);
    await carregarColecoes(msg.libraryId);
  }
  else if (msg.type === 'carregarColecoesLocais') {
    console.log('Carregando coleções locais...');
    await carregarColecoesLocais();
  }
  else if (msg.type === 'preVisualizarSubstituicao') {
    if (msg.libraryId && msg.localCollectionId) {
      // Handler para a aba "Update Collections"
      console.log('Pré-visualizando correspondências entre biblioteca e coleção local...');
      await preVisualizarCorrespondencias(msg.libraryId, msg.localCollectionId);
    } else if (msg.variables) {
      // Handler para a aba "Update Variables"
      console.log('Pré-visualizando substituição de variáveis e estilos...');
      const selection = figma.currentPage.selection;
      if (selection.length > 0) {
        for (const node of selection) {
          await preVisualizarSubstituicao(node, msg.variables);
        }
      }
    }
  }
  else if (msg.type === 'substituirVariaveis') {
    console.log('Substituindo variáveis e estilos em nós...');
    // Obtém a seleção com base no escopo
    const scope = msg.scope || 'selection';
    let nodesToProcess: SceneNode[] = [];
    
    if (scope === 'selection') {
      // Copia os nós selecionados para um novo array
      nodesToProcess = [...figma.currentPage.selection];
    } else {
      // Se for 'page', vamos processar todos os nós da página atual
      // Filtramos para ter apenas SceneNode válidos
      nodesToProcess = figma.currentPage.children as SceneNode[];
    }
    
    if (nodesToProcess.length > 0 && msg.variables && Array.isArray(msg.variables)) {
      console.log(`Substituindo variáveis para biblioteca ID: ${msg.libraryId}, coleção ID: ${msg.collectionId}`);
      console.log(`Escopo: ${scope}, Nós para processar: ${nodesToProcess.length}`);
      
      // Filtrar variáveis pela coleção, se especificada
      let variablesToApply = msg.variables;
      if (msg.collectionId) {
        variablesToApply = msg.variables.filter((v: VariableInfo) => {
          // Se a variável tiver informação de coleção, verificar se corresponde
          if (v.variableCollectionId) {
            return v.variableCollectionId === msg.collectionId;
          }
          return true; // Manter variáveis sem informação de coleção
        });
        console.log(`Variáveis após filtro de coleção: ${variablesToApply.length} de ${msg.variables.length}`);
      }
      
      for (const node of nodesToProcess) {
        await substituirVariaveisEEstilos(node, variablesToApply);
      }
      figma.notify(`Variáveis e estilos substituídos com sucesso!`);
    } else {
      figma.notify(`Nenhum nó selecionado ou nenhuma variável para substituir.`);
    }
  }
  else if (msg.type === 'substituirVariaveisEmColecao') {
    console.log('Substituindo variáveis na coleção local...');
    if (msg.matches && Array.isArray(msg.matches)) {
      await substituirVariaveisEmColecao(msg.matches);
    } else {
      figma.notify('Nenhuma correspondência para substituir.');
    }
  }
  else if (msg.type === 'activeTabChanged') {
    console.log('Aba ativa alterada:', msg.tabId);
    // Implementar lógica específica para mudança de aba se necessário
  }
}; 