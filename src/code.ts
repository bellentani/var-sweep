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
    console.log(`Carregando coleções da biblioteca: ${libraryId}`);
    
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
    
    // Buscar coleções de variáveis
    const colecoes: ColecaoInfo[] = [];
    
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
            let belongsToSelectedLibrary = false;
            
            if (collection.libraryName === nomeBiblioteca) {
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
  id: string,
  name?: string, // Adicionado nome para facilitar o mapeamento
  hasMatch?: boolean // Indica se a variável tem correspondência na biblioteca
}>) {
  try {
    console.log(`Substituindo variáveis para nó: ${node.name}`);
    let sucessos = 0;
    let falhas = 0;
    
    for (const variable of variables) {
      console.log(`Processando variável: ${variable.name || variable.id}, tipo: ${variable.type || 'estilo'}`);
      
      // Verificar se a variável está marcada para aplicação (tem correspondência)
      if (variable.hasMatch === false) {
        console.log(`Variável ${variable.name} ignorada, não tem correspondência`);
        continue;
      }
      
      let aplicado = false;
      
      // Tratar variáveis FLOAT separadamente
      if (variable.type === 'FLOAT') {
        console.log(`Aplicando variável FLOAT: ${variable.name}`);
        aplicado = await aplicarVariavelFloat(node, variable);
        if (aplicado) {
          console.log(`✓ Variável FLOAT "${variable.name}" aplicada com sucesso`);
          sucessos++;
        } else {
          console.log(`✗ Falha ao aplicar variável FLOAT "${variable.name}"`);
          falhas++;
        }
        continue; // Pular para a próxima variável
      }
      
      if (variable.type === 'COLOR') {
        console.log(`Aplicando variável COLOR: ${variable.name}`);
        aplicado = await aplicarVariavelColor(node, variable);
        if (aplicado) {
          console.log(`✓ Variável COLOR "${variable.name}" aplicada com sucesso`);
          sucessos++;
        } else {
          console.log(`✗ Falha ao aplicar variável COLOR "${variable.name}"`);
          falhas++;
        }
        continue; // Pular para a próxima variável
      }
      
      if (variable.type) {
        // Substituir outros tipos de variáveis
        const boundVars = (node as any).boundVariables;
        if (boundVars && variable.property && boundVars[variable.property]) {
          console.log(`Aplicando variável à propriedade: ${variable.property}`);
          boundVars[variable.property] = {
            type: 'VARIABLE_ALIAS',
            id: variable.id
          };
          sucessos++;
          aplicado = true;
        } else {
          console.log(`Não foi possível aplicar variável: propriedade ${variable.property} não encontrada em boundVars`);
          falhas++;
        }
      } else if (variable.property) {
        // Substituir estilos
        switch (variable.property) {
          case 'fill':
            if ('fills' in node) {
              console.log(`Aplicando estilo de fill: ${variable.id}`);
              (node as any).fillStyleId = variable.id;
              sucessos++;
              aplicado = true;
            } else {
              falhas++;
            }
            break;
          case 'stroke':
            if ('strokes' in node) {
              console.log(`Aplicando estilo de stroke: ${variable.id}`);
              (node as any).strokeStyleId = variable.id;
              sucessos++;
              aplicado = true;
            } else {
              falhas++;
            }
            break;
          case 'effect':
            if ('effects' in node) {
              console.log(`Aplicando estilo de efeito: ${variable.id}`);
              (node as any).effectStyleId = variable.id;
              sucessos++;
              aplicado = true;
            } else {
              falhas++;
            }
            break;
          case 'text':
            if ('textStyleId' in node) {
              console.log(`Aplicando estilo de texto: ${variable.id}`);
              (node as any).textStyleId = variable.id;
              sucessos++;
              aplicado = true;
            } else {
              falhas++;
            }
                    break;
          case 'grid':
            if ('layoutGrids' in node) {
              console.log(`Aplicando estilo de grid: ${variable.id}`);
              (node as any).gridStyleId = variable.id;
              sucessos++;
              aplicado = true;
            } else {
              falhas++;
            }
            break;
          default:
            falhas++;
                      break;
                    }
                  }

      if (aplicado) {
        console.log(`✓ Variável "${variable.name}" aplicada com sucesso`);
      } else {
        console.log(`✗ Falha ao aplicar variável "${variable.name}"`);
                }
    }
    
    console.log(`Substituição concluída para nó ${node.name}: ${sucessos} sucessos, ${falhas} falhas`);
    return { sucessos, falhas };
  } catch (error) {
    console.error('Erro ao substituir variáveis/estilos:', error);
    return { sucessos: 0, falhas: 0 };
  }
}

// Nova função para aplicar variáveis do tipo FLOAT
async function aplicarVariavelFloat(node: SceneNode, variable: { id: string, name?: string, property?: string }) {
  try {
    console.log(`>>> APLICANDO VARIÁVEL FLOAT: "${variable.name || variable.id}"`);
    
    // Verificar propriedade específica
    const prop = variable.property || '';
    if (!prop) {
      console.log(`✗ Propriedade não especificada para variável FLOAT`);
      return false;
    }
    
    console.log(`>>> Propriedade original: "${prop}"`);
    console.log(`>>> Node tipo: ${node.type}, nome: "${node.name}"`);
    
    // Listar propriedades disponíveis para diagnóstico
    console.log(`>>> Propriedades disponíveis:`);
    if ('layoutMode' in node) {
      console.log(`>>> Propriedades de layout: layoutMode: ${(node as any).layoutMode}, paddingTop: ${(node as any).paddingTop}, paddingBottom: ${(node as any).paddingBottom}, paddingLeft: ${(node as any).paddingLeft}, paddingRight: ${(node as any).paddingRight}, itemSpacing: ${(node as any).itemSpacing}`);
    }
    
    // Para border radius (diagnóstico específico)
    if ('cornerRadius' in node) {
      console.log(`>>> Propriedades de radius: cornerRadius: ${(node as any).cornerRadius}`);
    }
    if ('topLeftRadius' in node) {
      console.log(`>>> Radius específicos: topLeftRadius: ${(node as any).topLeftRadius}, topRightRadius: ${(node as any).topRightRadius}, bottomLeftRadius: ${(node as any).bottomLeftRadius}, bottomRightRadius: ${(node as any).bottomRightRadius}`);
    }
    
    // Propriedades que sabemos que funcionam com variáveis FLOAT
    const propriedadesFloat = [
      'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
      'itemSpacing', 'cornerRadius', 'strokeWeight',
      'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'
    ];
    
    // Descobrir qual propriedade usar - SIMPLIFICADA (sem usar horizontalPadding/verticalPadding)
    console.log(`>>> Procurando propriedade para variável: "${variable.name}"`);
    let propriedadeEfetiva = prop;
    
    // Mapear propriedades obsoletas para as novas
    if (propriedadeEfetiva === 'horizontalPadding') {
      console.log(`>>> Propriedade horizontalPadding obsoleta. Tentando usar paddingLeft ou paddingRight`);
      // Verificar qual está disponível
      if ('paddingLeft' in node) {
        propriedadeEfetiva = 'paddingLeft';
      } else if ('paddingRight' in node) {
        propriedadeEfetiva = 'paddingRight';
      }
    } else if (propriedadeEfetiva === 'verticalPadding') {
      console.log(`>>> Propriedade verticalPadding obsoleta. Tentando usar paddingTop ou paddingBottom`);
      // Verificar qual está disponível
      if ('paddingTop' in node) {
        propriedadeEfetiva = 'paddingTop';
      } else if ('paddingBottom' in node) {
        propriedadeEfetiva = 'paddingBottom';
      }
    } else if (propriedadeEfetiva === 'cornerRadius' || propriedadeEfetiva.includes('radius')) {
      console.log(`>>> Propriedade de radius detectada: ${propriedadeEfetiva}`);
      
      // Verificar se é uma propriedade de radius específica ou genérica
      if (propriedadeEfetiva === 'cornerRadius') {
        // Verificar se o nó suporta cornerRadius ou radii específicos
        if ('cornerRadius' in node) {
          propriedadeEfetiva = 'cornerRadius';
          console.log(`>>> Usando cornerRadius para o nó`);
        } else if ('topLeftRadius' in node) {
          // Se não tem cornerRadius mas tem radii específicos, usar o primeiro disponível
          console.log(`>>> Nó não suporta cornerRadius, tentando usar radii específicos`);
          propriedadeEfetiva = 'topLeftRadius';
        }
      } else if (propriedadeEfetiva.includes('radius')) {
        // Verificar se a propriedade específica existe no nó
        if (propriedadeEfetiva in node) {
          console.log(`>>> Usando propriedade específica de radius: ${propriedadeEfetiva}`);
        } else if ('cornerRadius' in node) {
          // Fallback para cornerRadius
          propriedadeEfetiva = 'cornerRadius';
          console.log(`>>> Propriedade específica não disponível, usando cornerRadius`);
        }
      }
    }
    
    // Verificar se a propriedade existe e pode receber valores
    const propriedadesPosiveis = propriedadesFloat.filter(p => {
      try {
        // Verificar se a propriedade existe no nó
        return p in node && typeof (node as any)[p] !== 'undefined';
      } catch (err) {
        return false;
      }
    });
    
    console.log(`>>> Possíveis propriedades: ${propriedadesPosiveis.join(', ')}`);
    
    // Se não encontrou a propriedade específica, tentar uma similar
    if (!propriedadesPosiveis.includes(propriedadeEfetiva)) {
      console.log(`>>> Propriedade ${propriedadeEfetiva} não disponível no nó`);
      
      // Tentar encontrar uma propriedade do mesmo tipo
      if (propriedadeEfetiva.includes('padding')) {
        const paddingProps = propriedadesPosiveis.filter(p => p.includes('padding'));
        if (paddingProps.length > 0) {
          propriedadeEfetiva = paddingProps[0];
          console.log(`>>> Usando propriedade alternativa de padding: ${propriedadeEfetiva}`);
        }
      } else if (propriedadeEfetiva.includes('radius')) {
        // Verificar todas as propriedades de radius disponíveis
        const radiusProps = propriedadesPosiveis.filter(p => p.includes('radius'));
        if (radiusProps.length > 0) {
          propriedadeEfetiva = radiusProps[0];
          console.log(`>>> Usando propriedade alternativa de radius: ${propriedadeEfetiva}`);
        }
      } else if (propriedadeEfetiva.includes('stroke')) {
        const strokeProps = propriedadesPosiveis.filter(p => p.includes('stroke'));
        if (strokeProps.length > 0) {
          propriedadeEfetiva = strokeProps[0];
          console.log(`>>> Usando propriedade alternativa de stroke: ${propriedadeEfetiva}`);
        }
      }
    }
    
    console.log(`>>> Tentando aplicar à propriedade: "${propriedadeEfetiva}"`);
    
    // Obter valor atual para fins de diagnóstico
    try {
      const valorAtual = (node as any)[propriedadeEfetiva];
      console.log(`→ Valor atual da propriedade "${propriedadeEfetiva}": ${valorAtual}`);
    } catch (err) {
      console.warn(`→ Não foi possível obter valor atual de ${propriedadeEfetiva}:`, err);
    }
    
    // Obter a variável
    const varObj = figma.variables.getVariableById(variable.id);
    if (!varObj) {
      console.log(`Variável não encontrada com ID ${variable.id}`);
      return false;
    }
    
    // MÉTODO ESPECÍFICO PARA RADIUS
    // Tentar aplicar a todos os raios se for cornerRadius
    if (propriedadeEfetiva === 'cornerRadius' || propriedadeEfetiva.includes('radius')) {
      console.log(`>>> Tentando método específico para radius...`);
      
      // Obter o valor da variável para aplicação
      let valorRadius = null;
      if (varObj.resolvedType === 'FLOAT' && varObj.variableCollectionId) {
        const colecao = figma.variables.getVariableCollectionById(varObj.variableCollectionId);
        if (colecao && colecao.defaultModeId) {
          valorRadius = varObj.valuesByMode[colecao.defaultModeId];
          console.log(`>>> Valor da variável de radius: ${valorRadius}`);
        }
      }
      
      let radiusAplicado = false;
      
      // 1. Tentar aplicar cornerRadius via boundVariables
      try {
        if ('cornerRadius' in node) {
          if (!('boundVariables' in node)) {
            (node as any).boundVariables = {};
          }
          
          const boundVars = {...(node as any).boundVariables} as Record<string, any>;
          boundVars['cornerRadius'] = {
            type: 'VARIABLE_ALIAS',
            id: variable.id
          };
          
          (node as any).boundVariables = boundVars;
          console.log(`>>> Aplicado cornerRadius via boundVariables`);
          radiusAplicado = true;
        }
      } catch (cornerErr) {
        console.warn(`>>> Erro ao aplicar cornerRadius via boundVariables:`, cornerErr);
      }
      
      // 2. Tentar aplicar radii específicos
      try {
        const radiusProps = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'];
        let algunsRadiusAplicados = false;
        
        for (const radiusProp of radiusProps) {
          if (radiusProp in node) {
            try {
              // Tentar via setBoundVariable
              (node as any).setBoundVariable(radiusProp, varObj);
              console.log(`>>> Aplicado ${radiusProp} via setBoundVariable`);
              algunsRadiusAplicados = true;
            } catch (err) {
              console.warn(`>>> Erro ao aplicar ${radiusProp} via setBoundVariable:`, err);
              
              // Tentar via boundVariables
              try {
                if (!('boundVariables' in node)) {
                  (node as any).boundVariables = {};
                }
                
                const boundVars = {...(node as any).boundVariables} as Record<string, any>;
                boundVars[radiusProp] = {
                  type: 'VARIABLE_ALIAS',
                  id: variable.id
                };
                
                (node as any).boundVariables = boundVars;
                console.log(`>>> Aplicado ${radiusProp} via boundVariables`);
                algunsRadiusAplicados = true;
              } catch (boundErr) {
                console.warn(`>>> Erro ao aplicar ${radiusProp} via boundVariables:`, boundErr);
                
                // Último recurso: aplicar valor direto
                if (valorRadius !== null) {
                  try {
                    (node as any)[radiusProp] = valorRadius;
                    console.log(`>>> Aplicado ${radiusProp} via valor direto: ${valorRadius}`);
                    algunsRadiusAplicados = true;
                  } catch (directErr) {
                    console.warn(`>>> Erro ao aplicar ${radiusProp} via valor direto:`, directErr);
                  }
                }
              }
            }
          }
        }
        
        if (algunsRadiusAplicados) {
          radiusAplicado = true;
        }
      } catch (radiiErr) {
        console.warn(`>>> Erro ao aplicar radii específicos:`, radiiErr);
      }
      
      // Se aplicamos radius com sucesso, retornar
      if (radiusAplicado) {
        return true;
      }
    }
    
    // MÉTODOS ALTERNATIVOS EM SEQUÊNCIA para outras propriedades
    let aplicado = false;
    
    // 1. Método com tratamento de erros para boundVariables
    try {
      console.log(`Tentando método com boundVariables para ${propriedadeEfetiva}...`);
      
      // Primeiro verificar se o nó tem o objeto boundVariables
      if (!('boundVariables' in node)) {
        // Criar o objeto se não existir
        (node as any).boundVariables = {};
      }
      
      // Criar uma cópia do objeto boundVariables existente
      let boundVars = {};
      try {
        boundVars = {...(node as any).boundVariables};
      } catch (err) {
        console.log(`Erro ao copiar boundVariables: ${err}`);
        boundVars = {};
      }
      
      try {
        // Remover qualquer vinculação existente primeiro
        if (boundVars && propriedadeEfetiva in boundVars) {
          // Usar Record<string, any> para evitar erros de tipo
          (boundVars as Record<string, any>)[propriedadeEfetiva] = undefined;
          delete (boundVars as Record<string, any>)[propriedadeEfetiva];
          console.log(`Removida vinculação existente de ${propriedadeEfetiva}`);
        }
      } catch (err) {
        console.warn(`Erro ao remover vinculação existente: ${err}`);
      }
      
      // Adicionar a nova vinculação
      (boundVars as Record<string, any>)[propriedadeEfetiva] = {
        type: 'VARIABLE_ALIAS',
        id: variable.id
      };
      
      try {
        // Aplicar as alterações de boundVariables
        (node as any).boundVariables = boundVars;
        console.log(`✓ Vinculação aplicada via boundVariables para ${propriedadeEfetiva}`);
        aplicado = true;
      } catch (err) {
        console.warn(`Erro ao aplicar boundVariables: ${err}`);
      }
    } catch (err) {
      console.warn(`Erro no método boundVariables: ${err}`);
    }
    
    // 2. Método com setBoundVariable (se o primeiro falhar)
    if (!aplicado) {
      try {
        console.log(`Tentando com setBoundVariable para ${propriedadeEfetiva}...`);
        (node as any).setBoundVariable(propriedadeEfetiva, varObj);
        console.log(`✓ Aplicado com sucesso via setBoundVariable: ${propriedadeEfetiva}`);
        aplicado = true;
      } catch (err) {
        console.warn(`Falha no método setBoundVariable: ${err}`);
      }
    }
    
    // 3. Método direto com valor (se os dois anteriores falharem)
    if (!aplicado) {
      try {
        console.log(`Tentando aplicar valor numérico diretamente...`);
        if (varObj.resolvedType === 'FLOAT' && varObj.variableCollectionId) {
          const colecao = figma.variables.getVariableCollectionById(varObj.variableCollectionId);
          if (colecao && colecao.defaultModeId) {
            const valorVar = varObj.valuesByMode[colecao.defaultModeId];
            if (typeof valorVar === 'number') {
              (node as any)[propriedadeEfetiva] = valorVar;
              console.log(`✓ Aplicado valor direto: ${propriedadeEfetiva} = ${valorVar}`);
              aplicado = true;
              
              // Tentar aplicar variável também
              try {
                if (!(node as any).boundVariables) {
                  (node as any).boundVariables = {};
                }
                (node as any).boundVariables[propriedadeEfetiva] = {
                  type: 'VARIABLE_ALIAS',
                  id: variable.id
                };
              } catch (e) {
                // Ignorar erros aqui
              }
            }
          }
        }
      } catch (err) {
        console.warn(`Erro ao aplicar valor direto: ${err}`);
      }
    }
    
    return aplicado;
  } catch (error) {
    console.error(`✗ Falha ao aplicar variável FLOAT: ${variable.name}`, error);
    return false;
  }
}

// Função auxiliar para aplicar uma variável a uma propriedade específica
function aplicarVariavelPropriedade(node: SceneNode, variable: { id: string }, property: string): boolean {
  try {
    // Verificar se o nó e a propriedade existem
    if (!node || !(property in node)) {
      console.log(`  → Propriedade "${property}" não existe no nó`);
      return false;
    }
    
    // Obter o valor atual da propriedade para determinar o tipo de dados
    const valorAtual = (node as any)[property];
    console.log(`  → Valor atual da propriedade "${property}": ${valorAtual}`);
    
    // MÉTODO DE SUBSTITUIÇÃO DIRETA (funciona para FLOAT e COLOR)
    try {
      // 1. Copiar o objeto boundVariables existente ou criar um novo
      const boundVars = (node as any).boundVariables ? {...(node as any).boundVariables} : {};
      
      // 2. Remover qualquer vinculação existente para esta propriedade
      if (boundVars[property]) {
        delete boundVars[property];
        console.log(`  → Removida vinculação existente da propriedade "${property}"`);
      }
      
      // 3. Adicionar a referência da variável
      boundVars[property] = {
        type: 'VARIABLE_ALIAS',
        id: variable.id
      };
      
      // 4. Atribuir o objeto boundVariables de volta ao nó
      (node as any).boundVariables = boundVars;
      
      // 5. Para variáveis numéricas, forçar um refresh visual
      if (typeof valorAtual === 'number') {
        const valorOriginal = (node as any)[property];
        
        // Alterar temporariamente o valor para forçar a atualização
        (node as any)[property] = valorOriginal + 0.001;
        (node as any)[property] = valorOriginal;
        
        console.log(`  → Forçada atualização para a propriedade "${property}"`);
      }
      
      console.log(`  ✓ Variável aplicada com sucesso à propriedade "${property}"`);
      return true;
    } catch (err) {
      console.error(`  ✗ Erro ao aplicar variável à propriedade "${property}":`, err);
      return false;
    }
  } catch (error) {
    console.error(`  ✗ Erro ao verificar propriedade "${property}":`, error);
    return false;
  }
}

// Nova função para aplicar variáveis do tipo COLOR
async function aplicarVariavelColor(node: SceneNode, variable: { id: string, name?: string, property?: string }) {
  try {
    console.log(`Aplicando variável COLOR: ${variable.name || variable.id}, propriedade: ${variable.property}`);
    
    // Verificar propriedade específica
    const prop = variable.property || '';
    
    if (prop.startsWith('fills[')) {
      const match = prop.match(/\[(\d+)\]/);
      if (match && 'fills' in node) {
        const fillIndex = parseInt(match[1], 10);
        try {
          if (node.fills && Array.isArray(node.fills) && node.fills.length > fillIndex) {
            const fillObj = {...node.fills[fillIndex]};
            if (fillObj.type === 'SOLID') {
              // Certifique-se de que boundVariables exista no fill
              if (!('boundVariables' in fillObj)) {
                (fillObj as any).boundVariables = {};
              }
              
              (fillObj as any).boundVariables = {
                color: {
                  type: 'VARIABLE_ALIAS',
                  id: variable.id
                }
              };
              
              const newFills = [...node.fills];
              newFills[fillIndex] = fillObj;
              node.fills = newFills;
              console.log(`Variável de cor aplicada ao fill[${fillIndex}]`);
              return true;
            }
          }
        } catch (err) {
          console.warn(`Erro ao aplicar variável a fill[${fillIndex}]:`, err);
        }
      }
    } 
    else if (prop.startsWith('strokes[')) {
      const match = prop.match(/\[(\d+)\]/);
      if (match && 'strokes' in node) {
        const strokeIndex = parseInt(match[1], 10);
        try {
          if (node.strokes && Array.isArray(node.strokes) && node.strokes.length > strokeIndex) {
            const strokeObj = {...node.strokes[strokeIndex]};
            if (strokeObj.type === 'SOLID') {
              if (!('boundVariables' in strokeObj)) {
                (strokeObj as any).boundVariables = {};
              }
              
              (strokeObj as any).boundVariables = {
                color: {
                  type: 'VARIABLE_ALIAS',
                  id: variable.id
                }
              };
              
              const newStrokes = [...node.strokes];
              newStrokes[strokeIndex] = strokeObj;
              node.strokes = newStrokes;
              console.log(`Variável de cor aplicada ao stroke[${strokeIndex}]`);
              return true;
            }
          }
        } catch (err) {
          console.warn(`Erro ao aplicar variável a stroke[${strokeIndex}]:`, err);
        }
      }
    }
    else if (prop === 'fills' && 'fills' in node) {
      // Aplicar ao primeiro fill
      try {
        if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
          const fillObj = {...node.fills[0]};
          if (fillObj.type === 'SOLID') {
            if (!('boundVariables' in fillObj)) {
              (fillObj as any).boundVariables = {};
            }
            
            (fillObj as any).boundVariables = {
              color: {
                type: 'VARIABLE_ALIAS',
                id: variable.id
              }
            };
            
            const newFills = [...node.fills];
            newFills[0] = fillObj;
            node.fills = newFills;
            console.log(`Variável de cor aplicada ao primeiro fill`);
            return true;
          }
        }
      } catch (err) {
        console.warn(`Erro ao aplicar variável ao primeiro fill:`, err);
      }
    }
    else if (prop === 'strokes' && 'strokes' in node) {
      // Aplicar ao primeiro stroke
      try {
        if (node.strokes && Array.isArray(node.strokes) && node.strokes.length > 0) {
          const strokeObj = {...node.strokes[0]};
          if (strokeObj.type === 'SOLID') {
            if (!('boundVariables' in strokeObj)) {
              (strokeObj as any).boundVariables = {};
            }
            
            (strokeObj as any).boundVariables = {
              color: {
                type: 'VARIABLE_ALIAS',
                id: variable.id
              }
            };
            
            const newStrokes = [...node.strokes];
            newStrokes[0] = strokeObj;
            node.strokes = newStrokes;
            console.log(`Variável de cor aplicada ao primeiro stroke`);
            return true;
          }
        }
      } catch (err) {
        console.warn(`Erro ao aplicar variável ao primeiro stroke:`, err);
      }
    }
    
    return false;
  } catch (error) {
    console.error(`Erro ao aplicar variável COLOR:`, error);
    return false;
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
    
    // Buscar variáveis e estilos nos nós selecionados
    const foundVariables = await buscarVariaveisEEstilos(options.scope);
    
    if (foundVariables.length === 0) {
      console.log("Nenhuma variável ou estilo encontrado");
      figma.ui.postMessage({
        type: 'no-variables-found'
      });
      return;
    }

    console.log(`Processando ${foundVariables.length} variáveis encontradas para verificar correspondências`);
    
    // Enviar as variáveis/estilos encontrados para a UI
      figma.ui.postMessage({
        type: 'variables-found',
      variables: foundVariables.map(v => ({
        name: v.name,
        type: v.type,
        nodeId: v.nodeId,
        property: v.property,
        colorValue: v.colorValue,
        isRealVariable: v.isRealVariable,
        variableCollectionId: v.variableCollectionId
      }))
    });
  } catch (error) {
    console.error("Erro ao procurar variáveis e estilos:", error);
    figma.ui.postMessage({
      type: 'error',
      message: 'Erro ao procurar variáveis e estilos: ' + (error as Error).message
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
  
  // Tratar a resposta de seleção de biblioteca e coleção
  if (msg.type === 'resposta-selecao-biblioteca-colecao') {
    // Esta mensagem é tratada internamente na função testeFloat
    return;
  }
  
  if (msg.type === 'teste-float') {
    await testeFloat();
    return;
  }

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
    console.log('### Iniciando substituição de variáveis...');
    console.log('Variáveis recebidas:', JSON.stringify(msg.variables, null, 2));
    
    const selection = figma.currentPage.selection;
    console.log(`Seleção: ${selection.length} nós`);
    
    if (selection.length === 0) {
      figma.ui.postMessage({
        type: 'no-nodes-selected',
        message: 'Selecione pelo menos um nó para aplicar as variáveis.'
      });
      return;
    }
    
    // Importar as variáveis da biblioteca selecionada
    if (msg.libraryId && msg.collectionId) {
      console.log(`Importando variáveis da biblioteca: ${msg.libraryId}, coleção: ${msg.collectionId}`);
      
      // Buscar a coleção de variáveis
      try {
        // @ts-ignore
        const variableCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
        
        if (!variableCollections || !Array.isArray(variableCollections)) {
          throw new Error("Não foi possível obter as coleções de variáveis");
        }
        
        // Encontrar a coleção específica
        const collection = variableCollections.find((collection: any) => {
          return collection.key === msg.collectionId || collection.id === msg.collectionId;
        }) as any;
        
        if (!collection) {
          throw new Error(`Coleção com ID ${msg.collectionId} não encontrada`);
        }
        
        // Obter variáveis da coleção
        // @ts-ignore
        const colecaoVariaveis = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(collection.key);
        
        if (!colecaoVariaveis || !Array.isArray(colecaoVariaveis)) {
          throw new Error("Não foi possível obter as variáveis da coleção");
        }
        
        console.log(`Encontradas ${colecaoVariaveis.length} variáveis na coleção ${collection.name}`);
        
        // Pre-importar todas as variáveis para maior eficiência
        console.log("Pré-importando variáveis...");
        
        // Map para armazenar variáveis importadas
        const variaveisImportadas = new Map<string, Variable>();
        
        // Importar as variáveis que serão usadas
        for (const variavelOriginal of msg.variables) {
          if (!variavelOriginal.hasMatch) {
            console.log(`Variável "${variavelOriginal.name}" não tem correspondência, pulando`);
            continue;
          }
          
          // Buscar variável correspondente na coleção
          try {
            console.log(`Buscando variável "${variavelOriginal.name}" na coleção`);
            const varCorrespondente = colecaoVariaveis.find((v: any) => 
              v.name === variavelOriginal.name || 
              v.name.endsWith(`/${variavelOriginal.name}`)
            );
            
            if (varCorrespondente) {
              console.log(`Variável "${variavelOriginal.name}" encontrada na coleção, importando...`);
              try {
                // @ts-ignore
                const importedVar = await figma.variables.importVariableByKeyAsync(varCorrespondente.key);
                if (importedVar) {
                  variaveisImportadas.set(variavelOriginal.name || '', importedVar);
                  console.log(`Variável "${variavelOriginal.name}" importada com sucesso`);
    } else {
                  console.warn(`Falha ao importar variável "${variavelOriginal.name}"`);
                }
              } catch (err) {
                console.warn(`Erro ao importar variável "${variavelOriginal.name}": ${err}`);
              }
            } else {
              console.warn(`Variável "${variavelOriginal.name}" não encontrada na coleção`);
            }
          } catch (err) {
            console.warn(`Erro ao buscar variável "${variavelOriginal.name}" na coleção: ${err}`);
          }
        }
        
        console.log(`${variaveisImportadas.size} variáveis pré-importadas com sucesso`);
        
        // Usar a função substituirVariaveisNoEscopo existente, apenas com os tipos corretos
        const resultados = await substituirVariaveisNoEscopo(
          selection, 
          msg.variables, 
          msg.libraryId, 
          msg.collectionId
        );
        
        // Informar resultados à UI
        figma.ui.postMessage({
          type: 'variaveis-substituidas',
          message: `${resultados.sucessos} variáveis substituídas com sucesso, ${resultados.falhas} falhas`,
          success: resultados.sucessos > 0
        });
      } catch (error) {
        console.error("Erro ao importar variáveis:", error);
        figma.ui.postMessage({
          type: 'error',
          message: 'Erro ao importar variáveis: ' + (error as Error).message
        });
      }
    } else {
      // Aplicar variáveis sem importação (caso raro, geralmente não usado)
      console.log('Aplicando variáveis sem biblioteca/coleção específica...');
      
      let sucessosTotal = 0;
      let falhasTotal = 0;
      
      for (const node of selection) {
        const { sucessos, falhas } = await substituirVariaveisEEstilos(node, msg.variables);
        sucessosTotal += sucessos;
        falhasTotal += falhas;
      }
      
      figma.ui.postMessage({
        type: 'variaveis-substituidas',
        message: `${sucessosTotal} variáveis substituídas com sucesso, ${falhasTotal} falhas`,
        success: sucessosTotal > 0
      });
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
  else if (msg.type === 'substituir-variaveis') {
    console.log('Iniciando substituição de variáveis...');
    console.log('Escopo:', msg.scope);
    console.log('Biblioteca:', msg.libraryId);
    console.log('Coleção:', msg.collectionId);
    console.log('Variáveis a substituir:', msg.variables.length);
    
    // Verificar se temos os dados necessários
    if (!msg.libraryId || !msg.collectionId || !msg.variables || msg.variables.length === 0) {
      figma.ui.postMessage({
        type: 'substituicao-concluida',
        success: false,
        message: 'Não foi possível substituir variáveis: dados insuficientes.'
      });
      return;
    }
    
    try {
      // Definir o escopo de nós a serem processados
      const nodes = msg.scope === 'page' ? figma.currentPage.children : figma.currentPage.selection;
      
      if (!nodes || nodes.length === 0) {
        figma.ui.postMessage({
          type: 'substituicao-concluida',
          success: false,
          message: 'Nenhum elemento selecionado para substituição.'
        });
        return;
      }
      
      console.log(`Processando ${nodes.length} nós no escopo ${msg.scope}`);
      
      // Chamar a função de substituição para cada nó
      substituirVariaveisNoEscopo(nodes, msg.variables, msg.libraryId, msg.collectionId)
        .then((resultado) => {
          console.log('Substituição concluída:', resultado);
          
          figma.ui.postMessage({
            type: 'substituicao-concluida',
            success: true,
            message: `Substituição concluída! ${resultado.sucessos} variáveis substituídas, ${resultado.falhas} falhas.`
          });
        })
        .catch((erro) => {
          console.error('Erro na substituição:', erro);
          
          figma.ui.postMessage({
            type: 'substituicao-concluida',
            success: false,
            message: `Erro ao substituir variáveis: ${erro.message || erro}`
          });
        });
    } catch (error) {
      console.error('Erro ao processar substituição:', error);
      
      figma.ui.postMessage({
        type: 'substituicao-concluida',
        success: false,
        message: `Erro ao processar substituição: ${(error as Error).message || String(error)}`
      });
    }
  }
}; 

// Adicionar esta nova função para substituir variáveis no escopo
async function substituirVariaveisNoEscopo(
  nodes: readonly SceneNode[],
  variaveisParaSubstituir: Array<{
    id: string,
    name: string,
    type?: string,
    property?: string,
    nodeId?: string,
    hasMatch?: boolean
  }>,
  libraryId: string,
  collectionId: string
): Promise<{ sucessos: number, falhas: number }> {
  let sucessosTotal = 0;
  let falhasTotal = 0;
  
  console.log(`\n### Iniciando substituição de variáveis...`);
  console.log(`→ Nós selecionados: ${nodes.length}`);
  console.log(`→ Variáveis encontradas: ${variaveisParaSubstituir.length}`);
  
  try {
    // Abordagem 1: Importar todas as variáveis da coleção selecionada
    console.log(`### Importando variáveis da biblioteca "${libraryId}" e coleção "${collectionId}"...`);
    
    // Obter coleção de variáveis da biblioteca
    // @ts-ignore
    const colecaoVariaveis = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(collectionId);
    
    if (!colecaoVariaveis || colecaoVariaveis.length === 0) {
      console.log(`✗ Nenhuma variável encontrada na coleção`);
      return { sucessos: 0, falhas: 0 };
    }
    
    console.log(`→ Encontradas ${colecaoVariaveis.length} variáveis na coleção`);
    
    // Importar as variáveis necessárias
    const variaveisImportadas = new Map<string, Variable>();
    
    // Primeiro, filtrar apenas variáveis que têm correspondência (match)
    const variaveisComMatch = variaveisParaSubstituir.filter(v => v.hasMatch);
    console.log(`→ Variáveis com match: ${variaveisComMatch.length} de ${variaveisParaSubstituir.length}`);
    
    // Pré-importar todas as variáveis com match para reutilização
    for (const variavel of variaveisComMatch) {
      // Buscar correspondência exata pelo nome da variável
      const varCorrespondente = colecaoVariaveis.find(v => v.name === variavel.name);
      if (varCorrespondente) {
        try {
          // @ts-ignore
          const varImportada = await figma.variables.importVariableByKeyAsync(varCorrespondente.key);
          if (varImportada) {
            variaveisImportadas.set(variavel.name, varImportada);
            console.log(`→ Pré-importada variável "${varImportada.name}" para reutilização`);
          }
        } catch (err) {
          console.warn(`→ Erro ao pré-importar variável "${variavel.name}":`, err);
        }
      }
    }
    
    console.log(`→ Pré-importadas ${variaveisImportadas.size} variáveis`);
    
    // NOVA ABORDAGEM: Detectar e substituir variáveis em nós
    
    // Função para detectar variáveis aplicadas a um nó
    async function detectarVariaveisNoNo(node: SceneNode): Promise<Array<{
      id: string,
      name: string,
      type: string,
      property: string,
      variableId: string  // ID da variável aplicada ao nó
    }>> {
      const variaveisDetectadas: Array<{
        id: string,
        name: string,
        type: string,
        property: string,
        variableId: string
      }> = [];
      
      console.log(`\n## Analisando nó: ${node.name} (ID: ${node.id})`);
      
      // 1. Verificar variáveis vinculadas via boundVariables
      if ('boundVariables' in node) {
        const boundVars = (node as any).boundVariables;
        if (boundVars) {
          console.log(`→ Nó tem boundVariables`, Object.keys(boundVars));
          
          // Processar cada propriedade com variável
          for (const property in boundVars) {
            try {
              const bindingValue = boundVars[property as keyof typeof boundVars];
              
              // Verificar se é uma referência de variável válida
              if (bindingValue && bindingValue.type === 'VARIABLE_ALIAS' && bindingValue.id) {
                // Obter a variável original
                const varOriginal = figma.variables.getVariableById(bindingValue.id);
                
                if (varOriginal) {
                  console.log(`→ Encontrada variável "${varOriginal.name}" aplicada à propriedade "${property}"`);
                  
                  // Determinar o tipo da variável
                  const varType = varOriginal.resolvedType;
                  
                  variaveisDetectadas.push({
                    id: varOriginal.id,
                    name: varOriginal.name,
                    type: varType,
                    property: property,
                    variableId: varOriginal.id
                  });
                }
              }
            } catch (propErr) {
              console.warn(`→ Erro ao processar propriedade "${property}":`, propErr);
            }
          }
        }
      }
      
      // 2. Verificar variáveis em fills e strokes (caso especial para cores)
      if ('fills' in node && Array.isArray(node.fills)) {
        node.fills.forEach((fill, index) => {
          if (fill.type === 'SOLID' && 'boundVariables' in fill) {
            const fillBoundVars = (fill as any).boundVariables;
            if (fillBoundVars && fillBoundVars.color && fillBoundVars.color.type === 'VARIABLE_ALIAS') {
              try {
                const colorVarId = fillBoundVars.color.id;
                const colorVar = figma.variables.getVariableById(colorVarId);
                
                if (colorVar) {
                  console.log(`→ Encontrada variável de cor "${colorVar.name}" em fill[${index}]`);
                  
                  variaveisDetectadas.push({
                    id: colorVar.id,
                    name: colorVar.name,
                    type: 'COLOR',
                    property: `fills[${index}]`,
                    variableId: colorVar.id
                  });
                }
              } catch (colorErr) {
                console.warn(`→ Erro ao processar variável de cor em fill[${index}]:`, colorErr);
              }
            }
          }
        });
      }
      
      if ('strokes' in node && Array.isArray(node.strokes)) {
        node.strokes.forEach((stroke, index) => {
          if (stroke.type === 'SOLID' && 'boundVariables' in stroke) {
            const strokeBoundVars = (stroke as any).boundVariables;
            if (strokeBoundVars && strokeBoundVars.color && strokeBoundVars.color.type === 'VARIABLE_ALIAS') {
              try {
                const colorVarId = strokeBoundVars.color.id;
                const colorVar = figma.variables.getVariableById(colorVarId);
                
                if (colorVar) {
                  console.log(`→ Encontrada variável de cor "${colorVar.name}" em stroke[${index}]`);
                  
                  variaveisDetectadas.push({
                    id: colorVar.id,
                    name: colorVar.name,
                    type: 'COLOR',
                    property: `strokes[${index}]`,
                    variableId: colorVar.id
                  });
                }
              } catch (colorErr) {
                console.warn(`→ Erro ao processar variável de cor em stroke[${index}]:`, colorErr);
              }
            }
          }
        });
      }
      
      console.log(`→ Total de ${variaveisDetectadas.length} variáveis detectadas no nó`);
      return variaveisDetectadas;
    }
    
    // Função para processar um único nó
    async function processarNo(node: SceneNode): Promise<{ sucessos: number, falhas: number }> {
      let sucessos = 0;
      let falhas = 0;
      
      try {
        // 1. NOVA LÓGICA: Detectar variáveis aplicadas a este nó
        const variaveisDoNo = await detectarVariaveisNoNo(node);
        
        if (variaveisDoNo.length > 0) {
          console.log(`\n## Processando nó: ${node.name} (ID: ${node.id})`);
          console.log(`→ O nó tem ${variaveisDoNo.length} variáveis aplicadas`);
          
          // 2. Para cada variável detectada, encontrar equivalente na biblioteca
          for (const varDoNo of variaveisDoNo) {
            console.log(`\n→ Substituindo variável: "${varDoNo.name}" (${varDoNo.type}) aplicada à propriedade: ${varDoNo.property}`);
            
            // Buscar variável equivalente na coleção de referência pelo nome
            const varCorrespondente = colecaoVariaveis.find(v => v.name === varDoNo.name);
            
            if (!varCorrespondente) {
              console.log(`✗ Não encontrada variável equivalente para "${varDoNo.name}" na coleção`);
              falhas++;
              continue;
            }
            
            console.log(`✓ Encontrada variável equivalente: "${varCorrespondente.name}" na coleção`);
            
            // Verificar se já importamos esta variável
            let varImportada = variaveisImportadas.get(varDoNo.name);
            
            if (!varImportada) {
              // Importar a variável
              try {
                // @ts-ignore
                varImportada = await figma.variables.importVariableByKeyAsync(varCorrespondente.key);
                if (varImportada) {
                  variaveisImportadas.set(varDoNo.name, varImportada);
                  console.log(`→ Importada variável "${varImportada.name}" para substituição`);
          } else {
                  console.log(`✗ Falha ao importar variável "${varDoNo.name}"`);
                  falhas++;
                  continue;
          }
        } catch (err) {
                console.warn(`→ Erro ao importar variável "${varDoNo.name}":`, err);
                falhas++;
                continue;
              }
            }
            
            if (!varImportada) {
              console.log(`✗ Falha ao obter variável importada "${varDoNo.name}"`);
              falhas++;
              continue;
            }
            
            // 3. Aplicar a variável importada ao nó
            let aplicado = false;
            
            if (varDoNo.type === 'COLOR') {
              // Para variáveis de cor, usar a função especializada
              console.log(`→ Aplicando variável de cor: ${varImportada.name}`);
              
              const varColorObj = {
                id: varImportada.id,
                name: varImportada.name,
                property: varDoNo.property
              };
              
              aplicado = await aplicarVariavelColor(node, varColorObj);
            } 
            else if (varDoNo.type === 'FLOAT') {
              // Para variáveis de número (FLOAT), usar a função para FLOAT
              console.log(`→ Aplicando variável FLOAT: ${varImportada.name}`);
              
              const varFloatObj = {
                id: varImportada.id,
                name: varImportada.name,
                property: varDoNo.property
              };
              
              aplicado = await aplicarVariavelFloat(node, varFloatObj);
            }
            else {
              // Para outros tipos, tentar aplicação genérica
              try {
                console.log(`→ Tentando aplicação genérica para tipo ${varDoNo.type}`);
                // @ts-ignore
                node.setBoundVariable(varDoNo.property, varImportada);
                aplicado = true;
              } catch (err) {
                console.log(`→ Falha na aplicação genérica: ${err}`);
                aplicado = false;
              }
            }
            
            if (aplicado) {
              console.log(`✓ Variável "${varImportada.name}" aplicada com sucesso à propriedade ${varDoNo.property}`);
              sucessos++;
            } else {
              console.log(`✗ Falha ao aplicar variável "${varImportada.name}"`);
              falhas++;
            }
          }
        } else {
          console.log(`→ Nó ${node.name} não tem variáveis aplicadas para substituir`);
        }
        
        // LÓGICA ANTERIOR: Processar variáveis explicitamente especificadas
        // (Mantida para compatibilidade com a chamada original)
        const variaveisDoNoExplicitas = variaveisComMatch.filter(v => v.nodeId === node.id);
        
        if (variaveisDoNoExplicitas.length > 0) {
          console.log(`\n## Processando ${variaveisDoNoExplicitas.length} variáveis explícitas para o nó: ${node.name}`);
          
          // Processar cada variável
          for (const variavel of variaveisDoNoExplicitas) {
            console.log(`\n→ Processando variável explícita: "${variavel.name}" (${variavel.type || 'tipo desconhecido'}) aplicada à propriedade: ${variavel.property || 'desconhecida'}`);
            
            // Buscar variável já pré-importada
            const variavelImportada = variaveisImportadas.get(variavel.name);
            
            if (variavelImportada) {
              // Aplicar a variável ao nó dependendo do tipo
              if (variavel.type === 'COLOR') {
                // Para variáveis de cor, usar a função especializada
                console.log(`→ Aplicando variável de cor: ${variavelImportada.name}`);
                
                const varColorObj = {
                  id: variavelImportada.id,
                  name: variavelImportada.name,
                  property: variavel.property
                };
                
                const aplicado = await aplicarVariavelColor(node, varColorObj);
                
                if (aplicado) {
                  console.log(`✓ Variável de cor aplicada com sucesso: ${variavelImportada.name}`);
                  sucessos++;
                } else {
                  console.log(`✗ Falha ao aplicar variável de cor: ${variavelImportada.name}`);
        falhas++;
      }
    }
              else if (variavel.type === 'FLOAT') {
                // Para variáveis de número (FLOAT), usar a função para FLOAT
                console.log(`→ Aplicando variável FLOAT: ${variavelImportada.name}`);
                
                const varFloatObj = {
                  id: variavelImportada.id,
                  name: variavelImportada.name,
                  property: variavel.property
                };
                
                const aplicado = await aplicarVariavelFloat(node, varFloatObj);
                
                if (aplicado) {
                  console.log(`✓ Variável FLOAT aplicada com sucesso: ${variavelImportada.name} à propriedade ${variavel.property}`);
                  sucessos++;
                } else {
                  console.log(`✗ Falha ao aplicar variável FLOAT: ${variavelImportada.name}`);
                  falhas++;
                }
              } 
              else {
                // Para outros tipos (string, etc)
                console.log(`→ Tipo não implementado ou desconhecido: ${variavel.type}`);
                falhas++;
              }
            } else {
              console.log(`✗ Variável "${variavel.name}" não encontrada na biblioteca ou não importada`);
              falhas++;
            }
          }
        }
      } catch (nodeErr) {
        console.error(`Erro processando nó ${node.id}:`, nodeErr);
      }
      
      // Retornar contadores para este nó
    return { sucessos, falhas };
    }
    
    // Função para processar um nó e seus filhos recursivamente
    async function processarNoRecursivo(node: SceneNode): Promise<{ sucessos: number, falhas: number }> {
      // Processar o nó atual primeiro
      const resultado = await processarNo(node);
      let sucessosRecursivo = resultado.sucessos;
      let falhasRecursivo = resultado.falhas;
      
      // Processar nós filhos recursivamente
      if ('children' in node) {
        for (const filho of node.children) {
          const resultadoFilho = await processarNoRecursivo(filho);
          sucessosRecursivo += resultadoFilho.sucessos;
          falhasRecursivo += resultadoFilho.falhas;
        }
      }
      
      return {
        sucessos: sucessosRecursivo,
        falhas: falhasRecursivo
      };
    }
    
    // Processar todos os nós de nível raiz e seus filhos
    for (const node of nodes) {
      const resultado = await processarNoRecursivo(node);
      sucessosTotal += resultado.sucessos;
      falhasTotal += resultado.falhas;
    }
    
    console.log(`\n### Resultado final: ${sucessosTotal} variáveis substituídas com sucesso, ${falhasTotal} falhas`);
    return { sucessos: sucessosTotal, falhas: falhasTotal };
  } catch (error) {
    console.error("Erro ao substituir variáveis:", error);
    return { sucessos: sucessosTotal, falhas: falhasTotal };
  }
}

// ... existing code ...

// Função para aplicar variáveis a um nó e seus filhos
async function aplicarVariaveisAoNo(
  node: SceneNode, 
  variaveisOriginais: Array<{
    id: string,
    name: string,
    type?: string,
    property?: string,
    nodeId?: string,
    hasMatch?: boolean
  }>,
  variaveisImportadas: Map<string, Variable>,
  nomeBiblioteca: string
): Promise<{ sucessos: number, falhas: number }> {
  let sucessosNo = 0;
  let falhasNo = 0;
  
  // LOG para debug: verificar se estamos recebendo a biblioteca correta
  console.log(`\n### Iniciando aplicação de variáveis da biblioteca "${nomeBiblioteca}"`);
  console.log(`  → Biblioteca contém ${variaveisImportadas.size} variáveis disponíveis`);
  
  // Mostrar algumas variáveis para verificação (limitadas a 5)
  const exemploVariaveis = Array.from(variaveisImportadas.keys()).slice(0, 5);
  console.log(`  → Exemplos de variáveis disponíveis: ${exemploVariaveis.join(', ')}`);
  
  // Função auxiliar para categorizar o nome da variável
  const categorizarNome = (nome: string): { categoria: string, componente: string, variante: string, prefixo: string } => {
    let categoria = "";
    let componente = "";
    let variante = "";
    let prefixo = "";
    
    if (nome.includes('/')) {
      const partes = nome.split('/');
      prefixo = partes[0] || "";
      
      if (partes.length >= 3) {
        // Ex: bg/button/primary/default
        categoria = partes[0] || ""; // bg
        componente = partes[1] || ""; // button
        variante = partes.slice(2).join('/'); // primary/default
      } else if (partes.length === 2) {
        // Ex: bg/button
        categoria = partes[0] || ""; // bg
        componente = partes[1] || ""; // button
      } else {
        // Apenas uma parte
        categoria = partes[0] || "";
      }
    } else {
      // Sem separadores, usar o nome completo como categoria
      categoria = nome;
    }
    
    return { categoria, componente, variante, prefixo };
  };
  
  // Função para buscar variável na biblioteca de referência - NOVA IMPLEMENTAÇÃO MAIS ROBUSTA
  const buscarVariavelNaBiblioteca = async (nomeVariavel: string): Promise<Variable | null> => {
    console.log(`  → Buscando variável "${nomeVariavel}" na biblioteca "${nomeBiblioteca}"...`);
    
    // 1. Verificar se já temos a variável no mapa de variáveis importadas (correspondência exata)
    if (variaveisImportadas.has(nomeVariavel)) {
      console.log(`  → Encontrada correspondência exata para "${nomeVariavel}"`);
      return variaveisImportadas.get(nomeVariavel)!;
    }
    
    // 2. Se não encontrarmos, vamos buscar diretamente na biblioteca
    // Esta abordagem é mais robusta, buscando em todas as coleções da biblioteca
    if (variaveisImportadas.size < 5) { // Se temos poucas variáveis, vale a pena buscar mais
      console.log(`  → Poucos resultados no mapa atual, buscando diretamente na biblioteca...`);
      
      try {
        // Obter todas as bibliotecas para acessar por nome
        const todasBibliotecas = await obterTodasBibliotecas();
        const bibliotecas = Array.from(todasBibliotecas.values());
        
        // Buscar a biblioteca pelo nome fornecido
        let bibliotecaReferencia = bibliotecas.find(b => b.name === nomeBiblioteca);
        
        // Se não encontrar pelo nome exato, buscar por similaridade
        if (!bibliotecaReferencia) {
          console.log(`  → Biblioteca "${nomeBiblioteca}" não encontrada pelo nome exato, buscando por similaridade...`);
          bibliotecaReferencia = bibliotecas.find(b => b.name.includes(nomeBiblioteca) || nomeBiblioteca.includes(b.name));
        }
        
        if (!bibliotecaReferencia) {
          console.log(`  ✗ Biblioteca "${nomeBiblioteca}" não encontrada`);
          return null;
        }
        
        console.log(`  → Biblioteca encontrada: ${bibliotecaReferencia.name} (ID: ${bibliotecaReferencia.id})`);
        
        // Obter coleções de variáveis da biblioteca
        // @ts-ignore
        const colecoesDisponiveis = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync(bibliotecaReferencia.id);
        
        if (!colecoesDisponiveis || colecoesDisponiveis.length === 0) {
          console.log(`  ✗ Biblioteca não tem coleções de variáveis`);
          return null;
        }
        
        console.log(`  → Biblioteca tem ${colecoesDisponiveis.length} coleções de variáveis`);
        
        // Buscar em todas as coleções disponíveis
        for (const colecao of colecoesDisponiveis) {
          console.log(`  → Verificando coleção: ${colecao.name} (${colecao.key})`);
          
          try {
            // @ts-ignore
            const variaveisDaColecao = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(colecao.key);
            
            if (!variaveisDaColecao || variaveisDaColecao.length === 0) {
              console.log(`  → Coleção ${colecao.name} está vazia`);
      continue;
    }
    
            console.log(`  → Coleção ${colecao.name} tem ${variaveisDaColecao.length} variáveis`);
            
            // Buscar a variável pelo nome exato
            const variavelEncontrada = variaveisDaColecao.find(v => v.name === nomeVariavel);
            
            if (variavelEncontrada) {
              console.log(`  ✓ Variável "${nomeVariavel}" encontrada na coleção ${colecao.name}`);
              
              // Importar a variável
              try {
                // @ts-ignore
                const variavelImportada = await figma.variables.importVariableByKeyAsync(variavelEncontrada.key);
                
                if (variavelImportada) {
                  console.log(`  ✓ Variável importada com sucesso: ${variavelImportada.name}`);
                  
                  // Adicionar ao mapa para uso futuro
                  variaveisImportadas.set(variavelImportada.name, variavelImportada);
                  
                  return variavelImportada;
                }
              } catch (importErr) {
                console.warn(`  → Erro ao importar variável:`, importErr);
              }
            }
          } catch (colErr) {
            console.warn(`  → Erro ao acessar variáveis da coleção:`, colErr);
          }
        }
        
        console.log(`  ✗ Variável "${nomeVariavel}" não encontrada em nenhuma coleção da biblioteca ${nomeBiblioteca}`);
        return null;
          } catch (err) {
        console.error(`  → Erro ao buscar variável na biblioteca:`, err);
        return null;
      }
    }
    
    // 3. Buscar variáveis com nomes similares no mapa existente
    const partesTamanho = ['x-small', 'small', 'medium', 'large', 'x-large', 'xx-large', 'xxx-large'];
    const partes = nomeVariavel.split('/');
    
    // Correspondências exatas para dimensões
    for (const [nome, variavel] of variaveisImportadas.entries()) {
      if (nome === nomeVariavel || 
          // Verificar casos específicos como padding/vertical/x-large === padding/vertical/x-large
          (nome.startsWith(partes[0]) && nome.includes(partes[1] || '') && nome.includes(partes[2] || ''))) {
        console.log(`  → Encontrada correspondência exata para "${nomeVariavel}"`);
        return variavel;
      }
    }
    
    console.log(`  ✗ Não encontrada variável equivalente para "${nomeVariavel}" na biblioteca`);
    return null;
  };
  
  console.log(`\n### Examinando nó: ${node.name || node.id} (Tipo: ${node.type})`);
  
  // 1. Obter as variáveis atualmente aplicadas a este nó
  let variaveisAplicadas: { id: string, name: string, property: string, type?: string }[] = [];
  
  // Verificar propriedades numéricas (FLOAT) como padding e border
  const propriedadesFloat = ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 
                            'itemSpacing', 'cornerRadius', 'strokeWeight'];
  
  // PRIORIDADE ALTA: Verificação específica para strokeWeight
  if ('strokes' in node && node.strokes && node.strokes.length > 0 && 'strokeWeight' in node) {
    try {
      console.log(`  → Verificando especificamente strokeWeight no nó ${node.name}`);
      
      // Verificar diretamente se há variável vinculada ao strokeWeight
      if ('boundVariables' in node && 
          (node as any).boundVariables && 
          (node as any).boundVariables.strokeWeight && 
          (node as any).boundVariables.strokeWeight.id) {
          
        const strokeId = (node as any).boundVariables.strokeWeight.id;
        try {
          const strokeVar = figma.variables.getVariableById(strokeId);
          if (strokeVar) {
            variaveisAplicadas.push({
              id: strokeId,
              name: strokeVar.name,
              property: 'strokeWeight',
              type: 'FLOAT'
            });
            console.log(`  → Variável FLOAT aplicada encontrada em strokeWeight: "${strokeVar.name}" (ID: ${strokeId})`);
          }
        } catch (err) {
          console.warn(`  → Erro ao obter variável de strokeWeight:`, err);
        }
      } else {
        console.log(`  → Nó tem strokeWeight (valor: ${(node as any).strokeWeight}), mas não tem variável aplicada`);
      }
    } catch (err) {
      console.warn(`  → Erro ao verificar strokeWeight:`, err);
    }
  }
  
  // Verificação padrão para outras propriedades FLOAT
  if ('boundVariables' in node) {
    const boundVars = (node as any).boundVariables;
    if (boundVars) {
      // Verificar cada propriedade de boundVariables
      for (const prop in boundVars) {
        if (propriedadesFloat.includes(prop) && boundVars[prop] && boundVars[prop].id) {
          try {
            const variavelAtual = figma.variables.getVariableById(boundVars[prop].id);
            if (variavelAtual) {
              // Verificar se já adicionamos esta variável (evitar duplicatas para strokeWeight)
              const jaAdicionada = variaveisAplicadas.some(v => 
                v.id === boundVars[prop].id && v.property === prop);
                
              if (!jaAdicionada) {
                variaveisAplicadas.push({
                  id: boundVars[prop].id,
                  name: variavelAtual.name,
                  property: prop,
                  type: 'FLOAT'
                });
                console.log(`  → Variável FLOAT aplicada encontrada em ${prop}: "${variavelAtual.name}" (ID: ${boundVars[prop].id})`);
              }
            }
          } catch (err) {
            console.warn(`  → Erro ao obter variável de ${prop}:`, err);
          }
        }
      }
    }
  }
  
  // [... código para detectar variáveis de cor e outras propriedades ...]
  
  // Se não encontramos variáveis aplicadas mas o nó tem propriedades que suportam variáveis
  if (variaveisAplicadas.length === 0) {
    console.log(`  → Nenhuma variável encontrada aplicada diretamente a este nó.`);
  } else {
    console.log(`  → Total de ${variaveisAplicadas.length} variáveis aplicadas a este nó.`);
  }
  
  // 2. ABORDAGEM CORRIGIDA: Processar as variáveis com maior robustez
  console.log(`\n### Substituindo variáveis aplicadas por equivalentes da biblioteca "${nomeBiblioteca}"...`);
  
  // Definir como aplicar variáveis a propriedades
  const aplicarVariavelCorrigida = async (
    node: SceneNode,
    variable: Variable,
    property: string,
    tipo: string
  ): Promise<boolean> => {
    console.log(`  → Processando variável: "${variable.name}" (${tipo}) aplicada à propriedade: ${property}`);
    
    try {
      if (tipo === 'FLOAT') {
        // Verificar se é strokeWeight para tratamento especial
        if (property === 'strokeWeight') {
          console.log(`  → Detectada propriedade de borda (strokeWeight), usando função especializada`);
          return await aplicarStrokeWeightDiretamente(node, variable);
        }
        
        // Para as demais propriedades FLOAT
        try {
          // Tentar primeiro com setBoundVariable
          try {
            console.log(`  → Tentando aplicar ${property} com setBoundVariable...`);
            (node as any).setBoundVariable(property, variable);
            console.log(`  ✓ Aplicado com sucesso via setBoundVariable: ${property}`);
            return true;
          } catch (error) {
            console.warn(`  → Erro ao aplicar ${property} via setBoundVariable:`, error);
            
            // Tentar com boundVariables diretamente
            try {
              if (!(node as any).boundVariables) {
                (node as any).boundVariables = {};
              }
              
              // Criar uma cópia do objeto para evitar mutação direta
              const novoBoundVariables = {...(node as any).boundVariables};
              
              // Atualizar a propriedade
              novoBoundVariables[property] = {
                type: 'VARIABLE_ALIAS',
                id: variable.id
              };
              
              // Aplicar de volta ao nó
              (node as any).boundVariables = novoBoundVariables;
              
              console.log(`  ✓ Aplicado com sucesso via boundVariables direto: ${property}`);
              
              // Tentar forçar atualização visual
              const valorAtual = (node as any)[property];
              if (typeof valorAtual === 'number') {
                (node as any)[property] = valorAtual + 0.1;
                (node as any)[property] = valorAtual;
              }
              
            return true;
            } catch (err) {
              console.error(`  → Falha ao aplicar via boundVariables: ${property}`, err);
            }
          }
        } catch (propErr) {
          console.error(`  → Erro ao processar propriedade ${property}:`, propErr);
        }
      } 
      else if (tipo === 'COLOR') {
        // CORREÇÃO: Usar função específica para cores em vez de ignorar
        console.log(`  → Variável de cor será tratada com aplicarVariavelColor em vez desta função`);
        return false; // Deixar a chamada externa lidar com isso
    }
    
    return false;
    } catch (err) {
      console.error(`  → Erro geral ao processar variável "${variable.name}":`, err);
    return false;
  }
  };
  
  // Processar as variáveis aplicadas
  for (const varAplicada of variaveisAplicadas) {
    console.log(`\n  → Processando variável: "${varAplicada.name}" (${varAplicada.type}) aplicada à propriedade: ${varAplicada.property}`);
    
    // Para estilos de texto, processar separadamente
    if (varAplicada.property === 'text' || varAplicada.type === 'style') {
      console.log(`  → Ignorando estilo de texto (não implementado nesta versão)`);
      continue;
    }
    
    // CORREÇÃO: Não pular mais as variáveis COLOR, processá-las adequadamente
    
    // Buscar a variável correspondente na biblioteca de referência - USANDO A NOVA FUNÇÃO
    const varEquivalente = await buscarVariavelNaBiblioteca(varAplicada.name);
    
    if (!varEquivalente) {
      console.log(`  ✗ Não encontrada variável equivalente para "${varAplicada.name}" na biblioteca`);
      falhasNo++;
      continue;
    }
    
    console.log(`  ✓ Encontrada variável equivalente: "${varEquivalente.name}" (ID: ${varEquivalente.id})`);
    
    // TRATAR VARIÁVEIS DE COR DE FORMA DIFERENTE
    if (varAplicada.type === 'COLOR') {
      console.log(`  → Variável de cor detectada, usando função especializada para cores`);
      
      // Criar objeto no formato esperado pela função aplicarVariavelColor
      const varColorObj = {
        id: varEquivalente.id,
        name: varEquivalente.name,
        property: varAplicada.property
      };
      
      // Aplicar variável de cor com a função apropriada
      const resultado = await aplicarVariavelColor(node, varColorObj);
      
      if (resultado) {
        console.log(`  ✓ Variável de cor "${varEquivalente.name}" aplicada com sucesso à propriedade ${varAplicada.property}`);
        sucessosNo++;
      } else {
        console.log(`  ✗ Falha ao aplicar variável de cor "${varEquivalente.name}" à propriedade ${varAplicada.property}`);
        falhasNo++;
      }
    } else {
      // Para variáveis não-cor (FLOAT, etc.), usar a função corrigida
      const resultado = await aplicarVariavelCorrigida(node, varEquivalente, varAplicada.property, varAplicada.type || '');
      
      if (resultado) {
        console.log(`  ✓ Variável "${varEquivalente.name}" aplicada com sucesso à propriedade ${varAplicada.property}`);
        sucessosNo++;
      } else {
        console.log(`  ✗ Falha ao aplicar variável "${varEquivalente.name}" à propriedade ${varAplicada.property}`);
        falhasNo++;
      }
    }
  }
  
  // VERIFICAÇÃO ADICIONAL para nós com strokeWeight sem variável aplicada
  if ('strokes' in node && node.strokes && node.strokes.length > 0 && 'strokeWeight' in node) {
    // Verificar se não encontramos uma variável aplicada ao strokeWeight
    const temVariavelStrokeWeight = variaveisAplicadas.some(v => v.property === 'strokeWeight');
    
    if (!temVariavelStrokeWeight) {
      console.log(`\n  → Nó tem strokeWeight mas sem variável aplicada, buscando variável adequada na biblioteca...`);
      
      // Procurar variáveis relacionadas a borda na biblioteca
      let variavelBorda = null;
      for (const [nome, variavel] of variaveisImportadas.entries()) {
        // IMPORTANTE: Verificar se a variável é do tipo FLOAT
        if ((variavel.resolvedType === 'FLOAT') && 
            (nome.toLowerCase().includes('stroke') || 
            nome.toLowerCase().includes('border') || 
            nome.toLowerCase().includes('width'))) {
          variavelBorda = variavel;
          break;
        }
      }
      
      // Se não encontrou, buscar diretamente na biblioteca
      if (!variavelBorda) {
        console.log(`  → Tentando buscar variável de borda na biblioteca diretamente...`);
        variavelBorda = await buscarVariavelNaBiblioteca('border/width/small');
        
        if (!variavelBorda) {
          // Tentar alternativas
          variavelBorda = await buscarVariavelNaBiblioteca('stroke/width');
          
          if (!variavelBorda) {
            variavelBorda = await buscarVariavelNaBiblioteca('border');
          }
        }
        
        // Verificar se a variável é do tipo FLOAT
        if (variavelBorda && variavelBorda.resolvedType !== 'FLOAT') {
          console.log(`  ✗ Variável encontrada "${variavelBorda.name}" não é do tipo FLOAT e não pode ser aplicada ao strokeWeight`);
          variavelBorda = null;
        }
      }
      
      if (variavelBorda) {
        console.log(`  → Encontrada variável para strokeWeight: "${variavelBorda.name}" (tipo: ${variavelBorda.resolvedType})`);
        
        const resultado = await aplicarStrokeWeightDiretamente(node, variavelBorda);
        if (resultado) {
          console.log(`  ✓ Variável "${variavelBorda.name}" aplicada com sucesso à propriedade strokeWeight`);
          sucessosNo++;
  } else {
          console.log(`  ✗ Falha ao aplicar variável "${variavelBorda.name}" à propriedade strokeWeight`);
          falhasNo++;
        }
      } else {
        console.log(`  → Não foram encontradas variáveis FLOAT apropriadas para strokeWeight`);
      }
    }
  }
  
  // Forçar atualização visual do nó
  try {
    node.setPluginData('lastUpdate', Date.now().toString());
          node.setRelaunchData({ update: '' });
  } catch (updateErr) {
    console.warn(`  → Erro ao forçar atualização visual:`, updateErr);
  }
  
  console.log(`\n### Resultado para nó "${node.name || node.id}": ${sucessosNo} variáveis substituídas, ${falhasNo} falhas`);
  
  return { sucessos: sucessosNo, falhas: falhasNo };
}

async function testeFloat(): Promise<void> {
  console.log("Iniciando teste de aplicação de variável FLOAT...");
  
  try {
    // Verificar se há seleção
    const nodes = figma.currentPage.selection;
    if (!nodes || nodes.length === 0) {
      figma.ui.postMessage({
        type: 'teste-float-resultado',
        success: false,
        message: 'Selecione pelo menos um nó para testar a aplicação de variável.'
      });
      return;
    }

    // Verificar se o nó selecionado suporta padding
    const node = nodes[0] as any;
    if (!('paddingLeft' in node) && !('paddingRight' in node)) {
      figma.ui.postMessage({
        type: 'teste-float-resultado',
        success: false,
        message: 'O nó selecionado não suporta padding. Selecione um frame ou componente com auto-layout.'
      });
      return;
    }
    
    console.log(`Aplicando variável padding/vertical/small ao nó "${node.name}"`);
    
    // 1. OBTENDO A BIBLIOTECA E COLEÇÃO SELECIONADAS PELO USUÁRIO NA UI
    // Solicitar a biblioteca e coleção atualmente selecionadas na interface
    figma.ui.postMessage({
      type: 'solicitar-selecao-biblioteca-colecao'
    });
    
    // Criar uma Promise que será resolvida quando o plugin receber a resposta da UI
    const selecao = await new Promise<{libraryId: string, collectionId: string}>((resolve, reject) => {
      const handler = (msg: any) => {
        if (msg.type === 'resposta-selecao-biblioteca-colecao') {
          figma.ui.off('message', handler); // Remover o listener após receber a resposta
          
          if (!msg.libraryId || !msg.collectionId) {
            reject(new Error("Selecione uma biblioteca e uma coleção de variáveis na interface"));
          } else {
            resolve({
              libraryId: msg.libraryId,
              collectionId: msg.collectionId
            });
          }
        }
      };
      
      // Adicionar o handler temporário para a resposta
      figma.ui.on('message', handler);
      
      // Definir um timeout para rejeitar a Promise após 5 segundos
      setTimeout(() => {
        figma.ui.off('message', handler);
        reject(new Error("Tempo esgotado ao aguardar seleção de biblioteca e coleção"));
      }, 5000);
    });
    
    // ... resto do código omitido ...
  } catch (error) {
    console.error("Erro no teste de Float:", error);
    
    figma.ui.postMessage({
      type: 'teste-float-resultado',
      success: false,
      message: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    });
  }
}

// Função para aplicar strokeWeight diretamente
const aplicarStrokeWeightDiretamente = async (node: SceneNode, variable: Variable): Promise<boolean> => {
  console.log(`  → Aplicando strokeWeight com função especializada: ${variable.name}`);
  
  try {
    // Verificar se o nó suporta strokeWeight
    if (!('strokeWeight' in node)) {
      console.log(`  ✗ Nó não suporta strokeWeight`);
      return false;
    }
    
    // IMPORTANTE: Verificar se a variável é do tipo FLOAT
    // Variáveis do tipo COLOR não devem ser aplicadas ao strokeWeight
    if (variable.resolvedType === 'COLOR') {
      console.log(`  ✗ Erro: Tentando aplicar variável de cor ao strokeWeight. Isso não é permitido.`);
      return false;
    }
    
    // Forçar log de debug detalhado
    console.log(`  → Detalhes do nó: tipo=${node.type}, id=${node.id}, nome=${node.name}`);
    console.log(`  → Detalhes da variável: nome=${variable.name}, id=${variable.id}, tipo=${variable.resolvedType}`);
    
    if ('strokes' in node) {
      console.log(`  → Nó tem ${(node as any).strokes?.length || 0} strokes`);
    }
    
    // Obter valor resolvido da variável para debug
    let valorStroke = 1;
    try {
      if (variable.variableCollectionId) {
        const colecao = figma.variables.getVariableCollectionById(variable.variableCollectionId);
        if (colecao && colecao.defaultModeId && variable.valuesByMode) {
          const modoAtual = colecao.defaultModeId;
          if (variable.valuesByMode[modoAtual] !== undefined) {
            const valor = variable.valuesByMode[modoAtual];
            // Converter valor para número
            if (typeof valor === 'number') {
              valorStroke = valor;
            } else if (typeof valor === 'string' && !isNaN(parseFloat(valor))) {
              valorStroke = parseFloat(valor);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Erro ao obter valor da variável:", err);
    }
    
    console.log(`  → Valor resolvido da variável de stroke: ${valorStroke}`);
    
    // Salvar valor original para debug e recuperação
    const strokeWeightOriginal = (node as any).strokeWeight;
    console.log(`  → Valor original strokeWeight: ${strokeWeightOriginal}`);
    
    // Tentar todos os métodos disponíveis em ordem de preferência
    let sucesso = false;
    
    // MÉTODO 1: API moderna setBoundVariable
    try {
      console.log(`  → [MÉTODO 1] Tentando aplicar strokeWeight com setBoundVariable...`);
      (node as any).setBoundVariable('strokeWeight', variable);
      console.log(`  ✓ strokeWeight aplicado com sucesso via setBoundVariable`);
      sucesso = true;
    } catch (err) {
      console.warn(`  → Falha no MÉTODO 1 (setBoundVariable):`, err);
    }
    
    // MÉTODO 2: Manipulação direta de boundVariables
    if (!sucesso) {
      try {
        console.log(`  → [MÉTODO 2] Tentando aplicar strokeWeight com boundVariables direto...`);
        
        // Garantir que boundVariables existe
        if (!(node as any).boundVariables) {
          console.log(`  → Criando objeto boundVariables no nó`);
          (node as any).boundVariables = {};
        }
        
        // Aplicar bound variable
        (node as any).boundVariables = {
          ...(node as any).boundVariables,
          strokeWeight: {
            type: 'VARIABLE_ALIAS',
            id: variable.id
          }
        };
                
                // Forçar atualização visual
        console.log(`  → Forçando atualização visual - alterando temporariamente o valor`);
        (node as any).strokeWeight = strokeWeightOriginal + 0.1;
        (node as any).strokeWeight = strokeWeightOriginal;
        
        console.log(`  ✓ strokeWeight aplicado com sucesso via boundVariables direto`);
        sucesso = true;
      } catch (err) {
        console.warn(`  → Falha no MÉTODO 2 (boundVariables):`, err);
      }
    }
    
    // MÉTODO 3: Manipulação agressiva - alterar o valor e depois a variável
    if (!sucesso) {
      try {
        console.log(`  → [MÉTODO 3] Tentando método agressivo para strokeWeight...`);
        
        // Aplicar valor diretamente
        console.log(`  → Aplicando valor numérico diretamente: ${valorStroke}`);
        (node as any).strokeWeight = valorStroke;
        
        // Tentar aplicar variável após alterar o valor
        if (!(node as any).boundVariables) {
          (node as any).boundVariables = {};
        }
        
        (node as any).boundVariables.strokeWeight = {
          type: 'VARIABLE_ALIAS',
          id: variable.id
        };
        
        // Se tem strokes, remover temporariamente e restaurar para forçar atualização
        if ('strokes' in node && node.strokes && (node as any).strokes.length > 0) {
          const strokesOriginais = [...(node as any).strokes];
          console.log(`  → Manipulando strokes para forçar atualização (${strokesOriginais.length} strokes)`);
          
          (node as any).strokes = [];
          (node as any).strokes = strokesOriginais;
        }
        
        console.log(`  ✓ strokeWeight aplicado com sucesso via método agressivo`);
        sucesso = true;
  } catch (err) {
        console.error(`  → Falha no MÉTODO 3 (agressivo):`, err);
      }
    }
    
    return sucesso;
  } catch (error) {
    console.error("Erro ao aplicar strokeWeight:", error);
    return false;
  }
};

// Função auxiliar para aplicar uma variável a um nó
async function aplicarVariavelAoNo(
  node: SceneNode, 
  variavel: {
    id: string,
    name: string,
    type?: string,
    property?: string,
    nodeId?: string,
    hasMatch?: boolean
  },
  variavelImportada: Variable,
  sucessosIniciais: number,
  falhasIniciais: number
): Promise<{ sucessosAplicacao: number, falhasAplicacao: number }> {
  let sucessos = sucessosIniciais;
  let falhas = falhasIniciais;
  
  // Aplicar a variável ao nó dependendo do tipo
  if (variavel.type === 'COLOR') {
    // Para variáveis de cor, usar a função especializada
    console.log(`→ Aplicando variável de cor: ${variavelImportada.name}`);
    
    const varColorObj = {
      id: variavelImportada.id,
      name: variavelImportada.name,
      property: variavel.property
    };
    
    const aplicado = await aplicarVariavelColor(node, varColorObj);
    
    if (aplicado) {
      console.log(`✓ Variável de cor aplicada com sucesso: ${variavelImportada.name}`);
      sucessos++;
    } else {
      console.log(`✗ Falha ao aplicar variável de cor: ${variavelImportada.name}`);
      falhas++;
    }
  } 
  else if (variavel.type === 'FLOAT') {
    // Para variáveis de número (FLOAT), usar a função para FLOAT
    console.log(`→ Aplicando variável FLOAT: ${variavelImportada.name}`);
    
    // LOG de diagnóstico
    console.log(`Detalhes da variável FLOAT:`);
    console.log(`- Nome: ${variavelImportada.name}`);
    console.log(`- ID: ${variavelImportada.id}`);
    console.log(`- Tipo resolvido: ${variavelImportada.resolvedType}`);
    console.log(`- Propriedade: ${variavel.property}`);
    
    // Verificar se é strokeWeight para usar função especializada
    if (variavel.property === 'strokeWeight' && variavelImportada.resolvedType === 'FLOAT') {
      console.log(`→ Usando função especializada para strokeWeight`);
      
      const aplicado = await aplicarStrokeWeightDiretamente(node, variavelImportada);
      
      if (aplicado) {
        console.log(`✓ Variável strokeWeight aplicada com sucesso: ${variavelImportada.name}`);
        sucessos++;
      } else {
        console.log(`✗ Falha ao aplicar variável strokeWeight: ${variavelImportada.name}`);
        falhas++;
      }
    } else {
      // Para outras propriedades FLOAT
      console.log(`→ Aplicando FLOAT diretamente: ${variavelImportada.name} → ${variavel.property}`);
      
      const varFloatObj = {
        id: variavelImportada.id,
        name: variavelImportada.name,
        property: variavel.property
      };
      
      // LOG de diagnóstico
      console.log(`Chamando aplicarVariavelFloat para "${variavelImportada.name}" (propriedade: ${variavel.property})`);
      
      // MÉTODO DIRETO
      let aplicado = false;
      try {
        console.log(`Tentativa 1: Aplicando variável FLOAT com aplicarVariavelFloat`);
        aplicado = await aplicarVariavelFloat(node, varFloatObj);
        
        if (!aplicado && node.type === 'INSTANCE') {
          console.log(`Tentativa 2 (instância): Aplicando variável FLOAT com método alternativo`);
          // Em instâncias, tente um método alternativo
          try {
            // @ts-ignore - Tentar setBoundVariable diretamente
            node.setBoundVariable(variavel.property, variavelImportada);
            aplicado = true;
            console.log(`Aplicado com sucesso via método alternativo para instância`);
          } catch (instErr) {
            console.log(`Falha no método alternativo para instância: ${instErr}`);
          }
        }
  } catch (err) {
        console.log(`Erro ao aplicar FLOAT: ${err}`);
      }
      
      if (aplicado) {
        console.log(`✓ Variável FLOAT aplicada com sucesso: ${variavelImportada.name} à propriedade ${variavel.property}`);
        sucessos++;
      } else {
        console.log(`✗ Falha ao aplicar variável FLOAT: ${variavelImportada.name}`);
        falhas++;
      }
    }
  } 
  else {
    // Para outros tipos (string, etc)
    console.log(`→ Tipo não implementado ou desconhecido: ${variavel.type}`);
    falhas++;
  }
  
  return { sucessosAplicacao: sucessos, falhasAplicacao: falhas };
}
