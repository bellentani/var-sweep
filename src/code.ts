/// <reference types="@figma/plugin-typings" />

// Definição dos tipos necessários
interface BibliotecaInfo {
  id: string;
  name: string;
  library: string;
  type: string;
  component?: string;
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

// Função para obter bibliotecas usando a API teamLibrary
async function carregarBibliotecas(): Promise<void> {
  try {
    console.log("Iniciando carregamento de bibliotecas...");
    
    // Acessamos o teamLibrary já que temos a permissão
    if (!figma.teamLibrary) {
      console.log("API figma.teamLibrary não está disponível");
      throw new Error("API de bibliotecas não disponível");
    }
    
    console.log("API de teamLibrary disponível, tentando carregar bibliotecas...");
    
    // Array para armazenar informações sobre bibliotecas
    const bibliotecas: BibliotecaInfo[] = [];
    
    // MÉTODO 1: Tentar obter as bibliotecas disponíveis
    try {
      console.log("Tentando obter bibliotecas via getAvailableLibraries...");
      // @ts-ignore - Chamada para API que pode não estar na tipagem
      const libs: any[] = await figma.teamLibrary.getAvailableLibrariesAsync();
      console.log("Bibliotecas obtidas via getAvailableLibrariesAsync:", libs);
      
      if (libs && libs.length > 0) {
        libs.forEach((lib: any) => {
          bibliotecas.push({
            id: lib.key || lib.id,
            name: lib.name,
            library: "Biblioteca de Equipe",
            type: "teamLibrary"
          });
        });
      }
    } catch (err) {
      console.warn("Erro ao obter bibliotecas via getAvailableLibrariesAsync:", err);
    }
    
    // MÉTODO 1.5: Obter coleções de variáveis das bibliotecas
    try {
      console.log("Tentando obter coleções de variáveis via getAvailableLibraryVariableCollectionsAsync...");
      // @ts-ignore - Chamada para API que pode não estar na tipagem
      const variableCollections: any[] = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
      console.log("Coleções de variáveis obtidas:", variableCollections);
      
      if (variableCollections && variableCollections.length > 0) {
        variableCollections.forEach((collection: any) => {
          // Verificamos se essa biblioteca já foi adicionada para evitar duplicatas
          const existingLib = bibliotecas.find(b => b.id === (collection.libraryKey || collection.id));
          if (!existingLib) {
            bibliotecas.push({
              id: collection.libraryKey || collection.id,
              name: collection.libraryName || collection.name || "Coleção de Variáveis",
              library: "Biblioteca de Variáveis",
              type: "variableCollection"
            });
          }
        });
      }
    } catch (err) {
      console.warn("Erro ao obter coleções de variáveis:", err);
    }
    
    // MÉTODO 2: Alternativo - procurar bibliotecas de componentes
    try {
      // Vamos verificar se há componentes de bibliotecas em uso
      // Também podemos tentar usar a nova API para obter os componentes
      console.log("Tentando método alternativo com getComponentSetsAsync...");
      // @ts-ignore
      const componentSets: any[] = await figma.teamLibrary.getComponentSetsAsync();
      console.log("ComponentSets obtidos:", componentSets);
      
      if (componentSets && componentSets.length > 0) {
        componentSets.forEach((compSet: any) => {
          bibliotecas.push({
            id: compSet.key || compSet.id,
            name: compSet.name,
            library: compSet.library?.name || "Biblioteca de Componentes",
            type: "componentSet"
          });
        });
      }
    } catch (err) {
      console.warn("Erro ao obter component sets:", err);
    }
    
    // MÉTODO 3: Procurar instâncias de componentes no documento
    try {
      console.log("Procurando componentes de bibliotecas no documento atual...");
      const instances = figma.currentPage.findAllWithCriteria({types: ['INSTANCE']});
      console.log(`Encontradas ${instances.length} instâncias de componentes`);
      
      const componentesMap = new Map<string, BibliotecaInfo>();
      
      instances.forEach(instance => {
        try {
          const comp = instance as InstanceNode;
          // Verifica se o componente principal é remoto (de uma biblioteca)
          if (comp.mainComponent && comp.mainComponent.remote === true) {
            const libId = comp.mainComponent.key?.split(';')[0] || '';
            if (!componentesMap.has(libId) && libId) {
              componentesMap.set(libId, {
                id: libId,
                name: comp.mainComponent.name.split('/')[0] || 'Biblioteca desconhecida',
                library: "Biblioteca de componente",
                type: "remoteComponent",
                component: comp.mainComponent.name
              });
            }
          }
        } catch (err) {
          console.warn("Erro ao processar instância:", err);
        }
      });
      
      // Adiciona os componentes encontrados à lista de bibliotecas
      componentesMap.forEach(comp => {
        bibliotecas.push(comp);
      });
    } catch (err) {
      console.warn("Erro ao procurar componentes no documento:", err);
    }
    
    // MÉTODO 4: Verificar estilos para encontrar bibliotecas
    try {
      console.log("Verificando estilos para identificar bibliotecas...");
      const paintStyles = figma.getLocalPaintStyles();
      const textStyles = figma.getLocalTextStyles();
      const effectStyles = figma.getLocalEffectStyles();
      
      console.log(`Encontrados ${paintStyles.length} estilos de cor, ${textStyles.length} estilos de texto, ${effectStyles.length} estilos de efeito`);
      
      const estilosMap = new Map<string, BibliotecaInfo>();
      
      // Função para processar estilos
      const processarEstilos = (estilos: BaseStyle[], tipo: string) => {
        estilos.forEach(estilo => {
          if (estilo.remote) {
            // Tenta extrair o ID da biblioteca
            const libId = estilo.key?.split(';')[0] || '';
            if (!estilosMap.has(libId) && libId) {
              estilosMap.set(libId, {
                id: libId,
                name: estilo.name.split('/')[0] || 'Biblioteca de estilos',
                library: `Biblioteca de ${tipo}`,
                type: "styleLibrary"
              });
            }
          }
        });
      };
      
      processarEstilos(paintStyles, "cores");
      processarEstilos(textStyles, "textos");
      processarEstilos(effectStyles, "efeitos");
      
      // Adiciona os estilos encontrados à lista de bibliotecas
      estilosMap.forEach(estilo => {
        bibliotecas.push(estilo);
      });
    } catch (err) {
      console.warn("Erro ao verificar estilos:", err);
    }
    
    // Se não encontramos nenhuma biblioteca, mostramos uma mensagem
    if (bibliotecas.length === 0) {
      console.log("Nenhuma biblioteca encontrada por nenhum método");
      figma.ui.postMessage({
        type: 'libraries-data',
        message: "Não foi possível encontrar bibliotecas conectadas a este documento. Tente usar bibliotecas para que elas apareçam aqui.",
        libraries: []
      });
      return;
    }
    
    // Exibimos as bibliotecas encontradas
    console.log("Bibliotecas encontradas:", bibliotecas);
    figma.ui.postMessage({
      type: 'libraries-data',
      message: `Encontradas ${bibliotecas.length} bibliotecas usando ${bibliotecas.map(b => b.type).join(', ')}`,
      libraries: bibliotecas
    });
    
  } catch (error: any) {
    console.error("Erro ao carregar bibliotecas:", error);
    figma.ui.postMessage({
      type: 'error',
      message: "Ocorreu um erro ao tentar listar as bibliotecas: " + (error.message || String(error))
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