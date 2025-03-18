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

// Função segura para acessar propriedades que podem ser undefined
function getProp(obj: any, path: string, defaultValue: any = ''): any {
  try {
    const travel = (regexp: RegExp) =>
      String.prototype.split
        .call(path, regexp)
        .filter(Boolean)
        .reduce((res, key) => (res !== null && res !== undefined ? res[key] : res), obj);
    const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
    return result === undefined || result === null ? defaultValue : result;
  } catch (e) {
    return defaultValue;
  }
}

// Função para obter bibliotecas usando a API teamLibrary
async function carregarBibliotecas(): Promise<void> {
  try {
    console.log("Iniciando carregamento de bibliotecas...");
    
    // Array para armazenar informações sobre bibliotecas
    const bibliotecas: BibliotecaInfo[] = [];
    
    // Abordagem simplificada - tente usar APIs mais estáveis primeiro
    try {
      // Vamos tentar uma abordagem mais simples primeiro
      console.log("Tentando abordagem simplificada...");
      
      // 1. Verificar componentes no documento atual (esta é a abordagem mais segura)
      try {
        console.log("Procurando componentes de bibliotecas no documento atual...");
        const instances = figma.currentPage.findAllWithCriteria({types: ['INSTANCE']});
        console.log(`Encontradas ${instances.length} instâncias de componentes`);
        
        const componentesMap = new Map<string, BibliotecaInfo>();
        
        for (const instance of instances) {
          try {
            const comp = instance as InstanceNode;
            // Verificações de segurança extras
            if (!comp || !comp.mainComponent) continue;
            
            // Verificar se o componente é remoto de forma segura
            const isRemote = getProp(comp.mainComponent, 'remote', false);
            if (!isRemote) continue;
            
            // Obter o ID da biblioteca com verificação de segurança
            const key = getProp(comp.mainComponent, 'key', '');
            const libId = key ? key.split(';')[0] : '';
            
            if (!libId || componentesMap.has(libId)) continue;
            
            // Obter o nome do componente com verificação de segurança
            const compName = getProp(comp.mainComponent, 'name', 'Componente desconhecido');
            const libName = compName.includes('/') ? compName.split('/')[0] : 'Biblioteca desconhecida';
            
            componentesMap.set(libId, {
              id: libId,
              name: libName,
              library: "Biblioteca de componente",
              type: "remoteComponent",
              component: compName
            });
          } catch (err) {
            console.warn("Erro ao processar instância (ignorando e continuando):", err);
            // Continue tentando com outros componentes
          }
        }
        
        // Adicionar componentes encontrados à lista de bibliotecas
        componentesMap.forEach(comp => {
          bibliotecas.push(comp);
        });
      } catch (err) {
        console.warn("Erro ao procurar componentes no documento (continuando com outros métodos):", err);
      }
      
      // 2. Verificar estilos locais para referências a bibliotecas
      try {
        console.log("Verificando estilos para identificar bibliotecas...");
        
        // Função segura para buscar estilos
        const getStylesSafely = (method: () => BaseStyle[]): BaseStyle[] => {
          try {
            return method();
          } catch (e) {
            console.warn(`Erro ao buscar estilos: ${e}`);
            return [];
          }
        };
        
        const paintStyles = getStylesSafely(() => figma.getLocalPaintStyles());
        const textStyles = getStylesSafely(() => figma.getLocalTextStyles());
        const effectStyles = getStylesSafely(() => figma.getLocalEffectStyles());
        
        console.log(`Encontrados ${paintStyles.length} estilos de cor, ${textStyles.length} estilos de texto, ${effectStyles.length} estilos de efeito`);
        
        const estilosMap = new Map<string, BibliotecaInfo>();
        
        // Função para processar estilos com segurança
        const processarEstilos = (estilos: BaseStyle[], tipo: string) => {
          for (const estilo of estilos) {
            try {
              // Verificar se o estilo é remoto de forma segura
              const isRemote = getProp(estilo, 'remote', false);
              if (!isRemote) continue;
              
              // Obter a chave com verificação de segurança
              const key = getProp(estilo, 'key', '');
              const libId = key ? key.split(';')[0] : '';
              
              if (!libId || estilosMap.has(libId)) continue;
              
              const estiloName = getProp(estilo, 'name', 'Estilo desconhecido');
              const libName = estiloName.includes('/') ? estiloName.split('/')[0] : 'Biblioteca de estilos';
              
              estilosMap.set(libId, {
                id: libId,
                name: libName,
                library: `Biblioteca de ${tipo}`,
                type: "styleLibrary"
              });
            } catch (err) {
              console.warn(`Erro ao processar estilo (ignorando e continuando):`, err);
              // Continue com outros estilos
            }
          }
        };
        
        // Processar cada tipo de estilo separadamente
        processarEstilos(paintStyles, "cores");
        processarEstilos(textStyles, "textos");
        processarEstilos(effectStyles, "efeitos");
        
        // Adicionar estilos encontrados à lista de bibliotecas
        estilosMap.forEach(estilo => {
          bibliotecas.push(estilo);
        });
      } catch (err) {
        console.warn("Erro ao verificar estilos (continuando com outros métodos):", err);
      }
    } catch (err) {
      console.warn("Erro na abordagem simplificada:", err);
    }
    
    // Só tentar APIs menos estáveis se não encontramos nada ainda
    if (bibliotecas.length === 0) {
      console.log("Nenhuma biblioteca encontrada com métodos básicos, tentando APIs avançadas...");
      
      // Verificar se teamLibrary está disponível
      if (figma.teamLibrary) {
        try {
          console.log("Tentando obter bibliotecas via API teamLibrary...");
          
          // Tentar getAvailableLibrariesAsync de forma segura
          try {
            console.log("Tentando getAvailableLibrariesAsync...");
            // @ts-ignore
            const libs = await figma.teamLibrary.getAvailableLibrariesAsync();
            
            if (libs && Array.isArray(libs) && libs.length > 0) {
              console.log("Bibliotecas obtidas via getAvailableLibrariesAsync:", libs);
              
              libs.forEach((lib: any) => {
                try {
                  const id = getProp(lib, 'key', '') || getProp(lib, 'id', '');
                  const name = getProp(lib, 'name', 'Biblioteca sem nome');
                  
                  if (id) {
                    bibliotecas.push({
                      id,
                      name,
                      library: "Biblioteca de Equipe",
                      type: "teamLibrary"
                    });
                  }
                } catch (err) {
                  console.warn("Erro ao processar biblioteca (ignorando):", err);
                }
              });
            }
          } catch (err) {
            console.warn("Erro ao usar getAvailableLibrariesAsync:", err);
          }
          
          // Tentar getAvailableLibraryVariableCollectionsAsync de forma segura
          try {
            console.log("Tentando getAvailableLibraryVariableCollectionsAsync...");
            // @ts-ignore
            const collections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
            
            if (collections && Array.isArray(collections) && collections.length > 0) {
              console.log("Coleções de variáveis obtidas:", collections);
              
              collections.forEach((collection: any) => {
                try {
                  const id = getProp(collection, 'libraryKey', '') || getProp(collection, 'id', '');
                  const name = getProp(collection, 'libraryName', '') || 
                               getProp(collection, 'name', 'Coleção de Variáveis');
                  
                  // Verificar se já existe esta biblioteca
                  const existe = bibliotecas.some(b => b.id === id);
                  
                  if (id && !existe) {
                    bibliotecas.push({
                      id,
                      name,
                      library: "Biblioteca de Variáveis",
                      type: "variableCollection"
                    });
                  }
                } catch (err) {
                  console.warn("Erro ao processar coleção de variáveis (ignorando):", err);
                }
              });
            }
          } catch (err) {
            console.warn("Erro ao usar getAvailableLibraryVariableCollectionsAsync:", err);
          }
        } catch (err) {
          console.warn("Erro ao acessar API teamLibrary:", err);
        }
      } else {
        console.log("API teamLibrary não está disponível");
      }
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
      message: `Encontradas ${bibliotecas.length} bibliotecas`,
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