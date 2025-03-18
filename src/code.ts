/// <reference types="@figma/plugin-typings" />

// Definição dos tipos necessários
interface BibliotecaInfo {
  id: string;
  name: string;
  library: string;
  type: string;
}

console.log("Plugin iniciado");

// Verifica acesso às APIs necessárias
if (!figma.currentPage) {
  figma.notify("Erro: Não foi possível acessar a página atual");
  figma.closePlugin();
}

// Mostra a interface do usuário
figma.showUI(__html__, { width: 450, height: 500 });
console.log("UI exibida");

// Função para listar bibliotecas únicas conectadas ao arquivo
async function carregarBibliotecas(): Promise<void> {
  try {
    console.log("Iniciando carregamento de bibliotecas...");
    
    // Usamos um Map para garantir que cada biblioteca apareça apenas uma vez
    // A chave é o nome da biblioteca, o valor é a informação da biblioteca
    const bibliotecasMap = new Map<string, BibliotecaInfo>();

    // Função segura para serializar um objeto
    const serializarSeguro = (obj: any): string => {
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
    };
    
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
  
  // Fecha o plugin se solicitado
  if (msg.type === 'fechar') {
    console.log("Fechando plugin");
    figma.closePlugin();
  }
}; 