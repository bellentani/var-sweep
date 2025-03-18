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

// Função extremamente simplificada para listar bibliotecas
// Evitando acessos profundos a objetos que podem causar erros
async function carregarBibliotecas(): Promise<void> {
  try {
    console.log("Iniciando carregamento de bibliotecas...");
    
    // Array para armazenar informações sobre bibliotecas
    const bibliotecas: BibliotecaInfo[] = [];

    // Função segura para serializar um objeto, removendo referências circulares
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
    
    // Não podemos confiar na API, então vamos abdicar de tipagem forte
    // e vamos gerar IDs únicos para cada biblioteca
    try {
      // Obtém as coleções de variáveis
      try {
        console.log("Buscando bibliotecas de variáveis...");
        // @ts-ignore - API pode não estar nas tipagens
        const apiResult = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
        
        if (apiResult && Array.isArray(apiResult)) {
          console.log(`Encontradas ${apiResult.length} bibliotecas via API`);
          
          // Mostrar estrutura completa para diagnóstico
          try {
            console.log("Estrutura completa do objeto retornado:", serializarSeguro(apiResult));
          } catch (e) {
            console.log("Não foi possível serializar o objeto completo");
          }
          
          // Evitamos loops forEach que podem causar problemas
          for (let i = 0; i < apiResult.length; i++) {
            try {
              // Gera um ID único para esta biblioteca
              const id = `lib-${Date.now()}-${i}`;
              
              // Safe access usando propriedades primitivas
              let name;
              let type;
              
              try {
                // Tentar obter nome com segurança - diretamente do objeto
                // Usando any para evitar erros de tipagem
                const result = apiResult[i] as any;
                
                // Logs com todas as propriedades do objeto para diagnóstico
                console.log(`Propriedades do objeto ${i}:`, Object.keys(result));
                
                // Logs seguros para depuração
                const objStr = serializarSeguro(result);
                console.log(`Biblioteca ${i+1}:`, objStr); // Mostrar objeto completo
                
                // Extrair o nome da biblioteca corretamente baseado na estrutura real
                if (typeof result === 'object' && result !== null) {
                  // Prioridade para propriedades específicas que podem conter o nome da biblioteca
                  if (result.library && typeof result.library === 'object') {
                    if (typeof result.library.name === 'string') {
                      name = result.library.name;
                      console.log(`Nome obtido de library.name: ${name}`);
                    }
                  }
                  
                  // Se ainda não encontrou nome, tenta outras propriedades
                  if (!name && typeof result.libraryName === 'string') {
                    name = result.libraryName;
                    console.log(`Nome obtido de libraryName: ${name}`);
                  }
                  
                  // Se ainda não encontrou, tenta usar a propriedade key, que contém o nome como prefixo em algumas bibliotecas
                  if (!name && typeof result.key === 'string' && result.key.includes(':')) {
                    const parts = result.key.split(':');
                    if (parts.length > 0) {
                      name = parts[0];
                      console.log(`Nome obtido de key: ${name}`);
                    }
                  }
                  
                  // Se ainda não encontrou, verifica name diretamente
                  if (!name && typeof result.name === 'string') {
                    name = result.name;
                    console.log(`Nome obtido de name: ${name}`);
                  }
                  
                  // Se ainda não tiver nome, usa um valor padrão melhor
                  if (!name) {
                    // Tenta extrair o nome de qualquer propriedade que parece ser um nome
                    for (const prop of ['fileName', 'title', 'id', 'key']) {
                      if (typeof result[prop] === 'string' && result[prop].length > 0) {
                        name = result[prop];
                        console.log(`Nome obtido de propriedade alternativa ${prop}: ${name}`);
                        break;
                      }
                    }
                    
                    // Último recurso
                    if (!name) {
                      name = `Biblioteca ${i+1}`;
                      console.log(`Usando nome padrão: ${name}`);
                    }
                  }
                  
                  // Determina o tipo baseado nas propriedades disponíveis
                  if (result.variableCollection || 
                      (result.name && typeof result.name === 'string' && 
                       result.name.toLowerCase().includes('variável'))) {
                    type = "Variáveis";
                  } else if (result.componentSet || result.component || 
                           (result.name && typeof result.name === 'string' && 
                            result.name.toLowerCase().includes('componente'))) {
                    type = "Componentes";
                  } else {
                    // Verifica nomes de propriedades específicas
                    const props = Object.keys(result).join(',').toLowerCase();
                    if (props.includes('variable')) {
                      type = "Variáveis";
                    } else if (props.includes('component')) {
                      type = "Componentes";
                    } else {
                      type = "Desconhecido";
                    }
                  }
                } else {
                  name = `Biblioteca ${i+1}`;
                  type = "Desconhecido";
                }
              } catch (nameErr) {
                console.warn(`Erro ao obter nome para biblioteca ${i}:`, nameErr);
                name = `Biblioteca ${i+1}`;
                type = "Desconhecido";
              }
              
              // Adiciona à lista de bibliotecas com informações mínimas
              bibliotecas.push({
                id,
                name,
                library: `Biblioteca de ${type}`,
                type
              });
              
              console.log(`Adicionada biblioteca: ${name} (${type})`);
            } catch (itemErr) {
              console.warn(`Erro ao processar biblioteca ${i}:`, itemErr);
            }
          }
        }
      } catch (varErr) {
        console.warn("Erro ao obter bibliotecas:", varErr);
      }
    } catch (apiErr) {
      console.warn("Erro ao acessar APIs:", apiErr);
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
    console.log(`Encontradas ${bibliotecas.length} bibliotecas no total`);
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