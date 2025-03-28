// Função para aplicar diretamente o strokeWeight com uma abordagem especial
async function aplicarStrokeWeight(node: SceneNode, variavel: Variable): Promise<boolean> {
  console.log("Aplicando strokeWeight com abordagem especial para", node.name);
  
  try {
    // Verificar se o nó suporta strokeWeight
    if (!('strokeWeight' in node)) {
      console.log("Nó não suporta strokeWeight");
      return false;
    }
    
    // Passo 1: Obter valor resolvido da variável
    let valorStroke = 1; // Valor padrão
    try {
      if (variavel.variableCollectionId) {
        const colecao = figma.variables.getVariableCollectionById(variavel.variableCollectionId);
        if (colecao && colecao.defaultModeId && variavel.valuesByMode) {
          const modoAtual = colecao.defaultModeId;
          if (variavel.valuesByMode[modoAtual] !== undefined) {
            const valor = variavel.valuesByMode[modoAtual];
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
    
    console.log(`Valor resolvido da variável de stroke: ${valorStroke}`);
    
    // Passo 2: Guardar strokes e valor original
    const temStrokes = 'strokes' in node && Array.isArray((node as any).strokes);
    const strokesOriginais = temStrokes ? [...(node as any).strokes] : null;
    const strokeWeightOriginal = (node as any).strokeWeight;
    
    // Passo 3: Aplicar método direto
    try {
      (node as any).setBoundVariable('strokeWeight', variavel);
      console.log("Variável aplicada com sucesso via setBoundVariable");
      return true;
    } catch (err) {
      console.warn("Erro ao aplicar strokeWeight via setBoundVariable:", err);
    }
    
    // Passo 4: Tentar método de boundVariables
    try {
      if (!(node as any).boundVariables) {
        (node as any).boundVariables = {};
      }
      (node as any).boundVariables.strokeWeight = {
        type: 'VARIABLE_ALIAS',
        id: variavel.id
      };
      console.log("Variável aplicada com sucesso via boundVariables");
      
      // Forçar update modificando e restaurando o valor
      (node as any).strokeWeight = strokeWeightOriginal + 0.1;
      (node as any).strokeWeight = strokeWeightOriginal;
      
      return true;
    } catch (err) {
      console.warn("Erro ao aplicar strokeWeight via boundVariables:", err);
    }
    
    // Passo 5: Abordagem de último recurso - aplicar valor e forçar update
    try {
      // Aplicar o valor diretamente
      (node as any).strokeWeight = valorStroke;
      
      // Tentar aplicar a variável novamente
      if (!(node as any).boundVariables) {
        (node as any).boundVariables = {};
      }
      (node as any).boundVariables.strokeWeight = {
        type: 'VARIABLE_ALIAS',
        id: variavel.id
      };
      
      // Se tem strokes, tentar forçar update removendo e recolocando
      if (temStrokes && strokesOriginais) {
        (node as any).strokes = [];
        (node as any).strokes = strokesOriginais;
      }
      
      console.log("Aplicado strokeWeight como último recurso");
      return true;
    } catch (err) {
      console.error("Erro na abordagem de último recurso:", err);
      return false;
    }
  } catch (error) {
    console.error("Erro ao aplicar strokeWeight:", error);
    return false;
  }
}

export default aplicarStrokeWeight; 