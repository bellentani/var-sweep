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
    
    // MÉTODO 2: Tentar obter bibliotecas de componentes
    try {
      console.log("2. Buscando bibliotecas de componentes...");
      // @ts-ignore - API pode não estar nas tipagens
      const libraries = await figma.teamLibrary.getAvailableLibrariesAsync();
      
      if (libraries && Array.isArray(libraries)) {
        console.log(`Encontradas ${libraries.length} bibliotecas de componentes`);
        console.log("Estrutura:", serializarSeguro(libraries));
        
        // Percorre as bibliotecas
        for (let i = 0; i < libraries.length; i++) {
          try {
            const lib = libraries[i] as any;
            
            // O nome da biblioteca geralmente está na propriedade 'name'
            if (lib && typeof lib.name === 'string') {
              const bibliotecaName = lib.name;
              
              // Só adiciona se ainda não existir no Map
              if (!bibliotecasMap.has(bibliotecaName)) {
                const bibliotecaId = lib.key || lib.id || `lib-comp-${Date.now()}-${i}`;
                
                bibliotecasMap.set(bibliotecaName, {
                  id: bibliotecaId,
                  name: bibliotecaName,
                  library: "Biblioteca de Componentes",
                  type: "Componentes"
                });
                
                console.log(`Adicionada biblioteca única: ${bibliotecaName} (Componentes)`);
              }
            }
          } catch (err) {
            console.warn("Erro ao processar biblioteca:", err);
          }
        }
      }
    } catch (err) {
      console.warn("Erro ao buscar bibliotecas de componentes:", err);
    }
    
    // MÉTODO 3: Buscar bibliotecas diretamente nas instâncias de componentes
    try {
      console.log("3. Buscando bibliotecas nos componentes do documento...");
      const instances = figma.currentPage.findAllWithCriteria({types: ['INSTANCE']});
      
      if (instances && instances.length > 0) {
        console.log(`Encontradas ${instances.length} instâncias de componentes`);
        
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
                bibliotecaName = instance.mainComponent.name.split('/')[0];
              }
              
              // Se não conseguiu um nome válido, usa um genérico
              if (!bibliotecaName) {
                bibliotecaName = `Biblioteca de Componente ${i+1}`;
              }
              
              // Só adiciona se ainda não existir e tiver um nome válido
              if (!bibliotecasMap.has(bibliotecaName) && bibliotecaName.length > 0) {
                const bibliotecaId = `lib-inst-${Date.now()}-${i}`;
                
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
    } catch (err) {
      console.warn("Erro ao buscar componentes no documento:", err);
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