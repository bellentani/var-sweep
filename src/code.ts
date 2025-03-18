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

// Função para obter bibliotecas de forma simplificada
async function carregarBibliotecas(): Promise<void> {
  try {
    console.log("Iniciando carregamento de bibliotecas...");
    
    // Array para armazenar informações sobre bibliotecas
    const bibliotecas: BibliotecaInfo[] = [];
    
    // Tentar obter coleções de variáveis - isso parece estar funcionando
    try {
      console.log("Tentando obter coleções de variáveis...");
      
      // @ts-ignore - Ignoramos erro de tipagem aqui
      const variableCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
      console.log("Coleções de variáveis obtidas:", variableCollections);
      
      if (variableCollections && Array.isArray(variableCollections) && variableCollections.length > 0) {
        for (let i = 0; i < variableCollections.length; i++) {
          try {
            const collection = variableCollections[i];
            
            // Extrair informações com segurança (usando any para evitar erros de tipagem)
            const coll = collection as any;
            const id = coll.libraryKey || coll.key || `var-collection-${i}`;
            const name = coll.libraryName || coll.name || `Coleção de Variáveis ${i+1}`;
            
            bibliotecas.push({
              id: id,
              name: name,
              library: "Biblioteca de Variáveis",
              type: "variableCollection"
            });
            
            console.log(`Adicionada biblioteca: ${name}`);
          } catch (err) {
            console.warn("Erro ao processar coleção:", err);
          }
        }
      }
    } catch (err) {
      console.warn("Erro ao obter coleções de variáveis:", err);
    }
    
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
    console.log(`Encontradas ${bibliotecas.length} bibliotecas`, bibliotecas);
    figma.ui.postMessage({
      type: 'libraries-data',
      message: `Encontradas ${bibliotecas.length} bibliotecas de variáveis`,
      libraries: bibliotecas
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Erro ao carregar bibliotecas:", errorMessage);
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