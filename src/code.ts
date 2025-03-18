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
async function carregarColecoesDaBiblioteca(libraryId: string, target?: string): Promise<void> {
  try {
    console.log(`Carregando coleções da biblioteca com ID: ${libraryId}`);
    
    const colecoes = await figma.variables.getVariableCollectionsAsync(libraryId);
    console.log(`Encontradas ${colecoes.length} coleções na biblioteca`);
    
    // Enviar as coleções para a UI
    figma.ui.postMessage({ 
      type: target === 'display' ? 'collections-for-display-loaded' : 'collections-loaded',
      libraryId,
      collections: colecoes,
      target
    });
  } catch (error) {
    console.error("Erro ao carregar coleções:", error);
    figma.ui.postMessage({ 
      type: 'error', 
      error: `Erro ao carregar coleções da biblioteca: ${error}` 
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
            const valueType = localValue.type as VariableValueType;
            
            // Caso seja uma referência a outra variável
            if (valueType === VAR_TYPE_ALIAS && 'id' in localValue) {
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
            else if (valueType === VAR_TYPE_COLOR && 
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
                      libValue.type === VAR_TYPE_COLOR && 
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
            else if (valueType === VAR_TYPE_FLOAT && 'value' in localValue) {
              const localFloat = localValue.value;
              
              for (const libVar of libraryVariables) {
                // Para cada modo disponível na variável da biblioteca
                for (const libModeId in libVar.valuesByMode) {
                  const libValue = libVar.valuesByMode[libModeId];
                  
                  // Se for um número, compara os valores
                  if (libValue && 
                      typeof libValue === 'object' && 
                      'type' in libValue && 
                      libValue.type === VAR_TYPE_FLOAT && 
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
            else if (valueType === VAR_TYPE_STRING && 'value' in localValue) {
              const localString = localValue.value;
              
              for (const libVar of libraryVariables) {
                // Para cada modo disponível na variável da biblioteca
                for (const libModeId in libVar.valuesByMode) {
                  const libValue = libVar.valuesByMode[libModeId];
                  
                  // Se for uma string, compara os valores
                  if (libValue && 
                      typeof libValue === 'object' && 
                      'type' in libValue && 
                      libValue.type === VAR_TYPE_STRING && 
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
    
    // Estrutura para mapear variáveis locais para variáveis da biblioteca com base nos valores
    interface ValueMatch {
      localVarId: string;
      localVar: Variable;
      libraryVarKey: string;
      modeId: string;
    }
    
    const valueMatches: ValueMatch[] = [];
    
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
            const valueType = localValue.type as VariableValueType;
            
            // Caso seja uma referência a outra variável
            if (valueType === VAR_TYPE_ALIAS && 'id' in localValue) {
              const referencedVarId = localValue.id as string;
              
              // Buscar a variável referenciada
              const referencedVar = figma.variables.getVariableById(referencedVarId);
              
              if (referencedVar) {
                // Procurar variáveis na biblioteca com o mesmo nome da variável referenciada
                const matchingLibraryVars = libraryVariables.filter(v => 
                  v.name === referencedVar.name
                );
                
                if (matchingLibraryVars.length > 0) {
                  // Usar a primeira correspondência encontrada
                  valueMatches.push({
                    localVarId: localVar.id,
                    localVar: localVar,
                    libraryVarKey: matchingLibraryVars[0].key,
                    modeId: mode.modeId
                  });
                }
              }
            }
            // Caso seja um valor de cor
            else if (valueType === VAR_TYPE_COLOR && 
                    'r' in localValue && 
                    'g' in localValue && 
                    'b' in localValue) {
              // Buscar variáveis de cor na biblioteca que tenham o mesmo valor RGB
              const localRgb = `${localValue.r},${localValue.g},${localValue.b}`;
              let found = false;
              
              for (const libVar of libraryVariables) {
                if (found) break;
                
                // Para cada modo disponível na variável da biblioteca
                for (const libModeId in libVar.valuesByMode) {
                  const libValue = libVar.valuesByMode[libModeId];
                  
                  // Se for uma cor, compara os valores RGB
                  if (libValue && 
                      typeof libValue === 'object' && 
                      'type' in libValue && 
                      libValue.type === VAR_TYPE_COLOR &&
                      'r' in libValue && 
                      'g' in libValue && 
                      'b' in libValue) {
                    const libRgb = `${libValue.r},${libValue.g},${libValue.b}`;
                    
                    // Se os valores RGB forem iguais
                    if (localRgb === libRgb) {
                      valueMatches.push({
                        localVarId: localVar.id,
                        localVar: localVar,
                        libraryVarKey: libVar.key,
                        modeId: mode.modeId
                      });
                      
                      found = true;
                      break;
                    }
                  }
                }
              }
            }
            // Caso seja um valor de número
            else if (valueType === VAR_TYPE_FLOAT && 'value' in localValue) {
              const localFloat = localValue.value;
              let found = false;
              
              for (const libVar of libraryVariables) {
                if (found) break;
                
                // Para cada modo disponível na variável da biblioteca
                for (const libModeId in libVar.valuesByMode) {
                  const libValue = libVar.valuesByMode[libModeId];
                  
                  // Se for um número, compara os valores
                  if (libValue && 
                      typeof libValue === 'object' && 
                      'type' in libValue && 
                      libValue.type === VAR_TYPE_FLOAT && 
                      'value' in libValue && 
                      libValue.value === localFloat) {
                    valueMatches.push({
                      localVarId: localVar.id,
                      localVar: localVar,
                      libraryVarKey: libVar.key,
                      modeId: mode.modeId
                    });
                    
                    found = true;
                    break;
                  }
                }
              }
            }
            // Caso seja um valor de string
            else if (valueType === VAR_TYPE_STRING && 'value' in localValue) {
              const localString = localValue.value;
              let found = false;
              
              for (const libVar of libraryVariables) {
                if (found) break;
                
                // Para cada modo disponível na variável da biblioteca
                for (const libModeId in libVar.valuesByMode) {
                  const libValue = libVar.valuesByMode[libModeId];
                  
                  // Se for uma string, compara os valores
                  if (libValue && 
                      typeof libValue === 'object' && 
                      'type' in libValue && 
                      libValue.type === VAR_TYPE_STRING && 
                      'value' in libValue && 
                      libValue.value === localString) {
                    valueMatches.push({
                      localVarId: localVar.id,
                      localVar: localVar,
                      libraryVarKey: libVar.key,
                      modeId: mode.modeId
                    });
                    
                    found = true;
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
    
    console.log(`Encontradas ${valueMatches.length} correspondências de valores para substituição`);
    
    // Executar a substituição das variáveis com base nos matches encontrados
    let substituidas = 0;
    let erros = 0;
    
    // Agrupar as correspondências por variável local
    const matchesByVar = new Map<string, ValueMatch[]>();
    
    for (const match of valueMatches) {
      if (!matchesByVar.has(match.localVarId)) {
        matchesByVar.set(match.localVarId, []);
      }
      matchesByVar.get(match.localVarId)?.push(match);
    }
    
    // Para cada variável local que tem pelo menos uma correspondência
    for (const [localVarId, matches] of matchesByVar.entries()) {
      try {
        if (matches.length === 0) continue;
        
        const localVar = matches[0].localVar; // Todas as correspondências têm a mesma variável local
        const localVarName = localVar.name;
        console.log(`Processando variável local: "${localVarName}" (ID: ${localVar.id})`);
        
        // Verificar todos os modos da variável
        for (const mode of localCollection.modes) {
          // Verificar se há uma correspondência específica para este modo
          const modeMatch = matches.find(m => m.modeId === mode.modeId);
          
          if (modeMatch) {
            try {
              // Em vez de buscar por nome, usamos diretamente a variável da biblioteca correspondente
              // que já foi identificada pela correspondência de valores
              const libraryVarKey = modeMatch.libraryVarKey;
              
              console.log(`Tentando substituir variável local "${localVarName}" pelo key da biblioteca: ${libraryVarKey}`);
              
              // Tenta importar a variável da biblioteca primeiro
              try {
                console.log(`Importando variável da biblioteca com key: ${libraryVarKey}`);
                
                const importedVar = await figma.variables.importVariableByKeyAsync(libraryVarKey);
                
                if (!importedVar) {
                  throw new Error(`Não foi possível importar a variável com key ${libraryVarKey}`);
                }
                
                console.log(`Variável importada com sucesso. ID local: ${importedVar.id}, Nome: ${importedVar.name}`);
                
                // Agora usamos o ID da variável importada para a referência
                await localVar.setValueForMode(mode.modeId, {
                  type: 'VARIABLE_ALIAS',
                  id: importedVar.id
                });
                
                substituidas++;
                console.log(`Modo ${mode.name} da variável ${localVar.name} substituído com sucesso pela variável ${importedVar.name} (ID: ${importedVar.id})`);
              } catch (importError) {
                console.warn(`Erro ao importar e substituir variável: ${importError}`);
                erros++;
              }
            } catch (modeError) {
              console.warn(`Erro ao processar modo ${mode.name} da variável ${localVar.name}:`, modeError);
              erros++;
            }
          }
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

// Quando a UI está pronta, enviar as bibliotecas disponíveis
figma.ui.onmessage = async (msg) => {
  console.log('Mensagem recebida do UI:', msg);

  try {
    switch (msg.type) {
      case 'ui-ready':
        await carregarBibliotecas();
        break;

      case 'get-libraries':
        await carregarBibliotecas();
        break;

      case 'get-collections':
        await carregarColecoesDaBiblioteca(msg.libraryId, msg.target);
        break;

      case 'get-collections-for-display':
        await carregarColecoesDaBiblioteca(msg.libraryId, 'display');
        break;

      case 'update-collections': // Antigo 'update-variables'
        await atualizarColecoes(msg.libraryId, msg.collectionId);
        break;
        
      case 'update-variables': // Nova funcionalidade para atualizar variáveis nos nós
        await atualizarVariaveisNosNos(msg.libraryId, msg.collectionId, msg.scope);
        break;
        
      default:
        console.warn('Tipo de mensagem desconhecido:', msg.type);
    }
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
    figma.ui.postMessage({
      type: 'error',
      error: `Erro: ${error}`,
      context: msg.type // Passa o contexto do erro
    });
  }
};

// Função para atualizar coleções (antigo substituirVariáveis)
async function atualizarColecoes(libraryId: string, collectionId: string) {
  try {
    console.log(`Atualizando coleções. Library ID: ${libraryId}, Collection ID: ${collectionId}`);
    
    // Obter a biblioteca pelo ID
    const bibliotecas = await figma.variables.getAvailableLibraryVariableCollectionsAsync();
    const biblioteca = bibliotecas.find(lib => lib.libraryId === libraryId);
    
    if (!biblioteca) {
      throw new Error('Biblioteca não encontrada');
    }
    
    // Encontrar a coleção local pelo ID
    const localCollection = figma.variables.getVariableCollectionById(collectionId);
    if (!localCollection) {
      throw new Error('Coleção local não encontrada');
    }
    
    // Obter as variáveis da biblioteca e as variáveis locais
    const libraryVariables = await figma.variables.getVariablesInLibraryAsync(libraryId);
    const localVariables = figma.variables.getLocalVariables();
    const localVarsInCollection = localVariables.filter(v => v.variableCollectionId === collectionId);
    
    // Resultado da atualização
    const resultado = await substituirVariaveis(localCollection, libraryVariables, localVarsInCollection);
    
    // Enviar resultado para a UI
    figma.ui.postMessage({
      type: 'update-collections-result',
      success: true,
      updatedCount: resultado
    });
    
  } catch (error) {
    console.error('Erro ao atualizar coleções:', error);
    figma.ui.postMessage({
      type: 'update-collections-result',
      success: false,
      error: `Erro ao atualizar coleções: ${error}`
    });
  }
}

// Função para atualizar variáveis nos nós (nova funcionalidade)
async function atualizarVariaveisNosNos(libraryId: string, collectionId: string, scope: string) {
  try {
    console.log(`Atualizando variáveis nos nós. Library ID: ${libraryId}, Collection ID: ${collectionId}, Scope: ${scope}`);
    
    // Obter a biblioteca pelo ID
    const bibliotecas = await figma.variables.getAvailableLibraryVariableCollectionsAsync();
    const biblioteca = bibliotecas.find(lib => lib.libraryId === libraryId);
    
    if (!biblioteca) {
      throw new Error('Biblioteca não encontrada');
    }
    
    // Obter a coleção da biblioteca pelo ID
    const libCollections = await figma.variables.getVariableCollectionsAsync(libraryId);
    const libCollection = libCollections.find(c => c.id === collectionId);
    
    if (!libCollection) {
      throw new Error('Coleção na biblioteca não encontrada');
    }
    
    // Obter as variáveis da biblioteca na coleção especificada
    const allLibVariables = await figma.variables.getVariablesInLibraryAsync(libraryId);
    const libraryVariables = allLibVariables.filter(v => v.variableCollectionId === collectionId);
    
    if (!libraryVariables || libraryVariables.length === 0) {
      throw new Error('Nenhuma variável encontrada na coleção da biblioteca');
    }
    
    console.log(`Encontradas ${libraryVariables.length} variáveis na coleção da biblioteca`);
    
    // Determinar quais nós processar com base no escopo
    let nodes: SceneNode[] = [];
    
    switch (scope) {
      case 'selection':
        nodes = figma.currentPage.selection;
        if (nodes.length === 0) {
          throw new Error('Nenhum elemento selecionado. Selecione ao menos um elemento para atualizar.');
        }
        break;
        
      case 'page':
        nodes = figma.currentPage.children;
        break;
        
      case 'document':
        // Obter todos os nós de todas as páginas
        nodes = figma.root.children.flatMap(page => page.children);
        break;
        
      default:
        throw new Error(`Escopo inválido: ${scope}`);
    }
    
    console.log(`Processando ${nodes.length} nós no escopo "${scope}"`);
    
    // Contadores para feedback
    let nodesAtualizados = 0;
    let variaveisAtualizadas = 0;
    
    // Processar cada nó
    for (const node of nodes) {
      let nodeAtualizado = false;
      
      // Processar variáveis de preenchimento (fill)
      if ('fills' in node && node.fills) {
        const variaveisAtualizadasNoFill = await atualizarVariaveisEmPaint(node, 'fills', libraryVariables);
        if (variaveisAtualizadasNoFill > 0) {
          nodeAtualizado = true;
          variaveisAtualizadas += variaveisAtualizadasNoFill;
        }
      }
      
      // Processar variáveis de stroke
      if ('strokes' in node && node.strokes) {
        const variaveisAtualizadasNoStroke = await atualizarVariaveisEmPaint(node, 'strokes', libraryVariables);
        if (variaveisAtualizadasNoStroke > 0) {
          nodeAtualizado = true;
          variaveisAtualizadas += variaveisAtualizadasNoStroke;
        }
      }
      
      // Processar variáveis de efeitos
      if ('effects' in node && node.effects) {
        const variaveisAtualizadasNosEfeitos = await atualizarVariaveisEmEfeitos(node, libraryVariables);
        if (variaveisAtualizadasNosEfeitos > 0) {
          nodeAtualizado = true;
          variaveisAtualizadas += variaveisAtualizadasNosEfeitos;
        }
      }
      
      if (nodeAtualizado) {
        nodesAtualizados++;
      }
      
      // Se for um FrameNode, ComponentNode, etc., processar os filhos recursivamente
      if ('children' in node) {
        // Chamar recursivamente para cada filho
        const { nodes: childrenUpdated, variables: childrenVarsUpdated } = 
          await atualizarVariaveisEmNosFilhos(node.children, libraryVariables);
        
        nodesAtualizados += childrenUpdated;
        variaveisAtualizadas += childrenVarsUpdated;
      }
    }
    
    // Enviar resultado para a UI
    figma.ui.postMessage({
      type: 'update-variables-result',
      success: true,
      nodesCount: nodesAtualizados,
      updatedCount: variaveisAtualizadas
    });
    
  } catch (error) {
    console.error('Erro ao atualizar variáveis nos nós:', error);
    figma.ui.postMessage({
      type: 'update-variables-result',
      success: false,
      error: `Erro ao atualizar variáveis nos nós: ${error}`
    });
  }
}

// Função auxiliar para atualizar variáveis em nós filhos (recursivamente)
async function atualizarVariaveisEmNosFilhos(
  nodes: readonly SceneNode[],
  libraryVariables: VariableReference[]
): Promise<{ nodes: number, variables: number }> {
  let nodesAtualizados = 0;
  let variaveisAtualizadas = 0;
  
  for (const node of nodes) {
    let nodeAtualizado = false;
    
    // Processar variáveis de preenchimento (fill)
    if ('fills' in node && node.fills) {
      const variaveisAtualizadasNoFill = await atualizarVariaveisEmPaint(node, 'fills', libraryVariables);
      if (variaveisAtualizadasNoFill > 0) {
        nodeAtualizado = true;
        variaveisAtualizadas += variaveisAtualizadasNoFill;
      }
    }
    
    // Processar variáveis de stroke
    if ('strokes' in node && node.strokes) {
      const variaveisAtualizadasNoStroke = await atualizarVariaveisEmPaint(node, 'strokes', libraryVariables);
      if (variaveisAtualizadasNoStroke > 0) {
        nodeAtualizado = true;
        variaveisAtualizadas += variaveisAtualizadasNoStroke;
      }
    }
    
    // Processar variáveis de efeitos
    if ('effects' in node && node.effects) {
      const variaveisAtualizadasNosEfeitos = await atualizarVariaveisEmEfeitos(node, libraryVariables);
      if (variaveisAtualizadasNosEfeitos > 0) {
        nodeAtualizado = true;
        variaveisAtualizadas += variaveisAtualizadasNosEfeitos;
      }
    }
    
    if (nodeAtualizado) {
      nodesAtualizados++;
    }
    
    // Processar nós filhos recursivamente
    if ('children' in node) {
      const { nodes: childrenUpdated, variables: childrenVarsUpdated } = 
        await atualizarVariaveisEmNosFilhos(node.children, libraryVariables);
      
      nodesAtualizados += childrenUpdated;
      variaveisAtualizadas += childrenVarsUpdated;
    }
  }
  
  return { nodes: nodesAtualizados, variables: variaveisAtualizadas };
}

// Função auxiliar para atualizar variáveis em propriedades de paint (fills, strokes)
async function atualizarVariaveisEmPaint(
  node: SceneNode, 
  property: 'fills' | 'strokes',
  libraryVariables: VariableReference[]
): Promise<number> {
  let variaveisAtualizadas = 0;
  
  if (!(property in node)) return 0;
  
  const paints = node[property] as Paint[];
  if (!paints || !Array.isArray(paints)) return 0;
  
  // Criar uma cópia do array de paints para modificar
  const updatedPaints = [...paints];
  let paintModificado = false;
  
  for (let i = 0; i < updatedPaints.length; i++) {
    const paint = updatedPaints[i];
    
    if (paint.type === 'SOLID') {
      // Verificar se a cor usa uma variável
      if (paint.boundVariables && paint.boundVariables.color) {
        const varId = (paint.boundVariables.color as VariableAlias).id;
        
        // Encontrar a variável local
        const localVariable = figma.variables.getVariableById(varId);
        
        if (localVariable) {
          // Tentar encontrar uma variável equivalente na biblioteca
          const varEquivalente = await encontrarVariavelEquivalenteNaBiblioteca(
            localVariable, 
            libraryVariables
          );
          
          if (varEquivalente) {
            try {
              // Importar a variável da biblioteca primeiro
              const importedVar = await figma.variables.importVariableByKeyAsync(varEquivalente.key);
              
              if (importedVar) {
                // Atualizar a referência para a variável importada da biblioteca
                updatedPaints[i] = {
                  ...paint,
                  boundVariables: {
                    ...paint.boundVariables,
                    color: {
                      type: 'VARIABLE_ALIAS',
                      id: importedVar.id
                    }
                  }
                };
                
                paintModificado = true;
                variaveisAtualizadas++;
                console.log(`Variável de cor atualizada em ${node.name}`);
              }
            } catch (error) {
              console.warn(`Erro ao importar variável ${varEquivalente.key}:`, error);
            }
          }
        }
      }
    }
    
    // Adicionar outros tipos de paint conforme necessário (gradientes, etc.)
  }
  
  // Aplicar as mudanças se houver alguma atualização
  if (paintModificado) {
    node[property] = updatedPaints;
  }
  
  return variaveisAtualizadas;
}

// Função para atualizar variáveis em efeitos
async function atualizarVariaveisEmEfeitos(
  node: SceneNode & { effects?: Effect[] },
  libraryVariables: VariableReference[]
): Promise<number> {
  let variaveisAtualizadas = 0;
  
  if (!node.effects || !Array.isArray(node.effects)) return 0;
  
  // Criar uma cópia do array de efeitos para modificar
  const updatedEffects = [...node.effects];
  let effectsModificados = false;
  
  for (let i = 0; i < updatedEffects.length; i++) {
    const effect = updatedEffects[i];
    
    // Verificar variáveis em efeitos do tipo DROP_SHADOW ou INNER_SHADOW
    if ((effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') && 
        effect.boundVariables && effect.boundVariables.color) {
      
      const varId = (effect.boundVariables.color as VariableAlias).id;
      
      // Encontrar a variável local
      const localVariable = figma.variables.getVariableById(varId);
      
      if (localVariable) {
        // Tentar encontrar uma variável equivalente na biblioteca
        const varEquivalente = await encontrarVariavelEquivalenteNaBiblioteca(
          localVariable, 
          libraryVariables
        );
        
        if (varEquivalente) {
          try {
            // Importar a variável da biblioteca primeiro
            const importedVar = await figma.variables.importVariableByKeyAsync(varEquivalente.key);
            
            if (importedVar) {
              // Atualizar a referência para a variável importada da biblioteca
              updatedEffects[i] = {
                ...effect,
                boundVariables: {
                  ...effect.boundVariables,
                  color: {
                    type: 'VARIABLE_ALIAS',
                    id: importedVar.id
                  }
                }
              };
              
              effectsModificados = true;
              variaveisAtualizadas++;
              console.log(`Variável de cor em efeito atualizada em ${node.name}`);
            }
          } catch (error) {
            console.warn(`Erro ao importar variável ${varEquivalente.key}:`, error);
          }
        }
      }
    }
  }
  
  // Aplicar as mudanças se houver alguma atualização
  if (effectsModificados) {
    node.effects = updatedEffects;
  }
  
  return variaveisAtualizadas;
}

// Função para encontrar uma variável equivalente na biblioteca com base no valor
async function encontrarVariavelEquivalenteNaBiblioteca(
  localVariable: Variable,
  libraryVariables: VariableReference[]
): Promise<VariableReference | null> {
  // Obter os valores da variável local para cada modo
  for (const mode of localVariable.collection.modes) {
    try {
      // Obter o valor da variável local neste modo
      const valorLocal = localVariable.valuesByMode[mode.modeId];
      
      // Se o valor for uma referência a outra variável, pular
      if (valorLocal && typeof valorLocal === 'object' && 'type' in valorLocal && valorLocal.type === 'VARIABLE_ALIAS') {
        continue;
      }
      
      // Buscar variáveis na biblioteca com valor equivalente
      for (const libVarRef of libraryVariables) {
        try {
          // Obter a variável completa da biblioteca
          const libVar = await figma.variables.getVariableByIdInLibraryAsync(libVarRef.id, libVarRef.libraryId);
          
          if (!libVar) continue;
          
          // Verificar os valores para cada modo da biblioteca
          for (const libMode of libVar.collection.modes) {
            const valorLib = libVar.valuesByMode[libMode.modeId];
            
            // Se o valor for um alias, pular
            if (valorLib && typeof valorLib === 'object' && 'type' in valorLib && valorLib.type === 'VARIABLE_ALIAS') {
              continue;
            }
            
            // Comparar os valores (conversão para string para comparação simplificada)
            const valorLocalStr = JSON.stringify(valorLocal);
            const valorLibStr = JSON.stringify(valorLib);
            
            if (valorLocalStr === valorLibStr) {
              // Encontrou uma correspondência!
              console.log(`Variável equivalente encontrada: ${libVar.name} (${libVarRef.key})`);
              return libVarRef;
            }
          }
        } catch (error) {
          console.warn(`Erro ao verificar variável da biblioteca:`, error);
        }
      }
    } catch (error) {
      console.warn(`Erro ao processar modo ${mode.name}:`, error);
    }
  }
  
  return null; // Nenhuma correspondência encontrada
} 