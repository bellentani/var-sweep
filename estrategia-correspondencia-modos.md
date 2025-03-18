# Estratégia para correspondência de modos entre biblioteca e coleção local

Este documento explica como a função `substituirVariaveisEmColecao` deve ser implementada para garantir que os valores corretos de cada modo sejam aplicados.

## Problemas atuais

Atualmente, o código apresenta alguns erros devido a referências inconsistentes de variáveis:

1. Referências a variáveis inexistentes como `importedVar`, `variaveis_alteradas` e `variaveis_com_erro`
2. Tentativas de usar funções que não estão definidas no escopo global, como `encontrarModoCorrespondente`
3. Problemas com referências a `libCollection` que não estão claras

## Solução proposta

A solução deve seguir estas diretrizes:

1. **Agrupamento de correspondências por ID local**
   - Agrupar as correspondências pelo ID da variável local para evitar processamento duplicado

2. **Função para encontrar modos correspondentes**
   - A função `encontrarModoCorrespondente` deve estar definida dentro da função principal
   - Esta função deve comparar nomes de modos (ex: Light/Claro, Dark/Escuro, Default/Padrão)

3. **Processo de substituição**
   - Para cada variável local:
     - Encontrar sua correspondência na biblioteca
     - Importar a variável correspondente da biblioteca
     - Para cada modo da variável local:
       - Encontrar o modo correspondente na biblioteca
       - Se encontrar, usar o valor específico desse modo
       - Se não encontrar, usar referência à variável

4. **Tratamento de erros e backup**
   - Fazer backup do valor original antes de cada alteração
   - Em caso de erro, restaurar o valor original

## Pseudocódigo de implementação

```javascript
async function substituirVariaveisEmColecao(matches) {
  // Contadores para acompanhamento
  let variaveisAlteradas = 0;
  let variaveisComErro = 0;
  
  // Agrupar correspondências por ID local
  const matchesByLocalId = {};
  for (const match of matches) {
    if (!matchesByLocalId[match.localId]) {
      matchesByLocalId[match.localId] = [];
    }
    matchesByLocalId[match.localId].push(match);
  }
  
  // Processar cada variável local
  for (const localId in matchesByLocalId) {
    // Obter variável local e coleção
    const localVar = figma.variables.getVariableById(localId);
    const localCollection = figma.variables.getVariableCollectionById(localVar.variableCollectionId);
    
    // Obter correspondência na biblioteca
    const match = matchesByLocalId[localId][0];
    const libVar = libraryVariables.find(v => v.name === match.libraryName);
    
    // Importar variável da biblioteca
    const importedVariable = await figma.variables.importVariableByKeyAsync(libVar.key);
    
    // Função auxiliar para encontrar modos correspondentes
    function encontrarModoCorrespondente(modoLocal, modosBiblioteca) {
      // Buscar correspondência por nome exato
      const modoMesmoNome = modosBiblioteca.find(m => 
        m.name.toLowerCase() === modoLocal.name.toLowerCase());
      
      if (modoMesmoNome) return modoMesmoNome.modeId;
      
      // Comparações para casos comuns (Light/Claro, Dark/Escuro, etc.)
      const nomeModoLower = modoLocal.name.toLowerCase();
      
      // Correspondência para modo Light/Claro
      if (nomeModoLower === 'light' || nomeModoLower === 'claro') {
        const modoLight = modosBiblioteca.find(m => 
          m.name.toLowerCase() === 'light' || m.name.toLowerCase() === 'claro');
        if (modoLight) return modoLight.modeId;
      }
      
      // Correspondência para modo Dark/Escuro
      if (nomeModoLower === 'dark' || nomeModoLower === 'escuro') {
        const modoDark = modosBiblioteca.find(m => 
          m.name.toLowerCase() === 'dark' || m.name.toLowerCase() === 'escuro');
        if (modoDark) return modoDark.modeId;
      }
      
      return null; // Sem correspondência encontrada
    }
    
    // Obter os modos da biblioteca
    const modosBiblioteca = libCollectionRef && libCollectionRef.modes ? libCollectionRef.modes : [];
    
    // Para cada modo da coleção local
    for (const mode of localCollection.modes) {
      // Backup do valor original
      const valorOriginal = localVar.valuesByMode[mode.modeId];
      
      // Tentar encontrar o modo correspondente na biblioteca
      const modoCorrespondente = modosBiblioteca.length > 0 ? 
        encontrarModoCorrespondente(mode, modosBiblioteca) : null;
      
      try {
        if (modoCorrespondente && 
            importedVariable.valuesByMode && 
            importedVariable.valuesByMode.hasOwnProperty(modoCorrespondente)) {
          // Usar o valor específico do modo correspondente
          localVar.setValueForMode(mode.modeId, importedVariable.valuesByMode[modoCorrespondente]);
        } else {
          // Usar referência à variável importada
          const novoValor = {
            type: "VARIABLE_ALIAS",
            id: importedVariable.id
          };
          localVar.setValueForMode(mode.modeId, novoValor);
        }
        variaveisAlteradas++;
      } catch (error) {
        variaveisComErro++;
        // Tentar restaurar o valor original
        try {
          localVar.setValueForMode(mode.modeId, valorOriginal);
        } catch (restoreError) {
          console.error("Não foi possível restaurar o valor original");
        }
      }
    }
  }
  
  return { variaveisAlteradas, variaveisComErro };
}
```

## Observações

1. Ao implementar isso no código real, certifique-se de que os nomes das variáveis (como `variaveisAlteradas` e `variaveisComErro`) sejam consistentes em todo o código.

2. A função `encontrarModoCorrespondente` deve ser definida dentro da função principal para evitar problemas de escopo.

3. Para cada modo, é importante usar o valor específico do modo correspondente na biblioteca, em vez de simplesmente usar uma referência à variável. Isso garante que cada modo (Light, Dark, etc.) tenha o valor apropriado.

4. Sempre faça backup dos valores originais para permitir a restauração em caso de erro. 