// Interface que define a estrutura da biblioteca
interface BibliotecaInfo {
  id: string;
  name: string;
  library: string;
  type: string;
}

// Interface que define a estrutura de uma coleção
interface ColecaoInfo {
  id: string;
  name: string;
  type?: string;
}

console.log("UI carregada");

// Elementos DOM
const listaElement = document.getElementById('lista-bibliotecas') as HTMLDivElement;
const loadingElement = document.getElementById('loading') as HTMLDivElement;
const emptyStateElement = document.getElementById('empty-state') as HTMLDivElement;
const statusElement = document.getElementById('status') as HTMLDivElement;
const reloadButton = document.getElementById('reload-button') as HTMLButtonElement;
const componentsContainer = document.getElementById('components-container') as HTMLDivElement;
const errorContainer = document.getElementById('error-container') as HTMLDivElement;
const infoContainer = document.getElementById('info-container') as HTMLDivElement;
const refreshButton = document.getElementById('refresh-button') as HTMLButtonElement;
const librarySelect = document.getElementById('library-select') as HTMLSelectElement;
const collectionsLoading = document.getElementById('collections-loading') as HTMLDivElement;
const collectionsList = document.getElementById('collections-list') as HTMLDivElement;
const collectionsEmpty = document.getElementById('collections-empty') as HTMLDivElement;

console.log("Elementos DOM:", { listaElement, loadingElement, emptyStateElement, statusElement, reloadButton, componentsContainer, errorContainer, infoContainer, refreshButton, librarySelect, collectionsLoading, collectionsList, collectionsEmpty });

// Função para mostrar mensagem de status
function showStatus(message: string) {
  statusElement.textContent = message;
  console.log("Status:", message);
}

// Função para limpar a lista
function clearList() {
  while (listaElement.firstChild) {
    listaElement.removeChild(listaElement.firstChild);
  }
}

// Função para solicitar bibliotecas
function requestLibraries() {
  showStatus("Solicitando bibliotecas...");
  loadingElement.style.display = "block";
  listaElement.style.display = "none";
  emptyStateElement.style.display = "none";
  clearList();
  parent.postMessage({ pluginMessage: { type: 'obterBibliotecas' } }, '*');
}

// Adiciona evento ao botão de recarregar
reloadButton.addEventListener('click', () => {
  showStatus("Recarregando...");
  requestLibraries();
});

// Solicita as bibliotecas assim que a UI inicializar
window.onload = () => {
  console.log("window.onload disparado");
  showStatus("Inicializando...");
  requestLibraries();
};

// Recebe mensagens do código principal
window.onmessage = async (event) => {
  try {
    const message = event.data.pluginMessage;
    
    if (!message) {
      showError("Mensagem inválida recebida do plugin");
      return;
    }
    
    // Tratamento de erros
    if (message.type === 'error') {
      showError(message.message);
      return;
    }
    
    // Recebendo as bibliotecas
    if (message.type === 'libraries-data') {
      const libraries = message.libraries || [];
      showInfo(message.message || "");
      
      // Limpar e preencher o select com as bibliotecas
      librarySelect.innerHTML = '';
      
      // Adicionar opção padrão
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = libraries.length > 0 
        ? 'Selecione uma biblioteca...' 
        : 'Nenhuma biblioteca disponível';
      librarySelect.appendChild(defaultOption);
      
      // Adicionar opções para cada biblioteca
      libraries.forEach((library: BibliotecaInfo) => {
        const option = document.createElement('option');
        option.value = library.id;
        option.textContent = library.name;
        librarySelect.appendChild(option);
      });
      
      // Mostrar bibliotecas no container principal
      componentsContainer.innerHTML = '';
      hideError();
      
      if (!libraries || libraries.length === 0) {
        componentsContainer.innerHTML = '<p class="no-components">Não foram encontradas bibliotecas neste arquivo</p>';
        return;
      }
      
      libraries.forEach((library: BibliotecaInfo) => {
        if (!library) return; // Pula bibliotecas inválidas
        
        const libraryElement = document.createElement('div');
        libraryElement.className = 'component-item';
        
        // Adicionar etiqueta do tipo de biblioteca
        const labelElement = document.createElement('span');
        labelElement.className = 'library-label';
        labelElement.textContent = library.type || 'Biblioteca';
        libraryElement.appendChild(labelElement);
        
        // Nome da biblioteca
        const nameElement = document.createElement('div');
        nameElement.className = 'component-name';
        nameElement.textContent = library.name || 'Biblioteca sem nome';
        libraryElement.appendChild(nameElement);
        
        // ID da biblioteca
        const idElement = document.createElement('div');
        idElement.className = 'component-id';
        idElement.textContent = `ID: ${library.id || 'Desconhecido'}`;
        libraryElement.appendChild(idElement);
        
        // Tipo da biblioteca
        if (library.library) {
          const typeElement = document.createElement('div');
          typeElement.className = 'library-name';
          typeElement.textContent = library.library;
          libraryElement.appendChild(typeElement);
        }
        
        componentsContainer.appendChild(libraryElement);
      });
    }
    
    // Recebendo as coleções de uma biblioteca
    if (message.type === 'collections-data') {
      const collections = message.collections || [];
      
      clearCollectionsList();
      
      if (collections.length === 0) {
        showCollectionsEmpty();
        return;
      }
      
      // Mostrar as coleções
      collections.forEach((collection: ColecaoInfo) => {
        const collectionElement = document.createElement('div');
        collectionElement.className = 'collection-item';
        
        const nameElement = document.createElement('div');
        nameElement.className = 'collection-name';
        nameElement.textContent = collection.name;
        collectionElement.appendChild(nameElement);
        
        if (collection.type) {
          const typeElement = document.createElement('div');
          typeElement.className = 'collection-type';
          typeElement.textContent = collection.type;
          collectionElement.appendChild(typeElement);
        }
        
        collectionsList.appendChild(collectionElement);
      });
      
      showCollectionsList();
    }
  } catch (error: any) {
    console.error("Erro ao processar mensagem:", error);
    showError("Erro ao processar dados: " + (error.message || "erro desconhecido"));
  }
};

// Função para mostrar erro
function showError(message?: string) {
  errorContainer.textContent = message || "Ocorreu um erro desconhecido";
  errorContainer.style.display = "block";
}

// Função para esconder erro
function hideError() {
  errorContainer.style.display = "none";
}

// Função para mostrar informação
function showInfo(message?: string) {
  infoContainer.textContent = message || "";
  infoContainer.style.display = message ? "block" : "none";
}

// Função para mostrar o loading das coleções
function showCollectionsLoading() {
  collectionsLoading.classList.remove('hidden');
  collectionsList.classList.add('hidden');
  collectionsEmpty.classList.add('hidden');
}

// Função para mostrar a lista vazia
function showCollectionsEmpty() {
  collectionsLoading.classList.add('hidden');
  collectionsList.classList.add('hidden');
  collectionsEmpty.classList.remove('hidden');
}

// Função para mostrar a lista de coleções
function showCollectionsList() {
  collectionsLoading.classList.add('hidden');
  collectionsList.classList.remove('hidden');
  collectionsEmpty.classList.add('hidden');
}

// Função para limpar a lista de coleções
function clearCollectionsList() {
  while (collectionsList.firstChild) {
    collectionsList.removeChild(collectionsList.firstChild);
  }
}

// Evento para o botão de recarregar
refreshButton.addEventListener('click', () => {
  componentsContainer.innerHTML = '<p class="no-components">Procurando bibliotecas...</p>';
  librarySelect.innerHTML = '<option value="">Carregando bibliotecas...</option>';
  hideError();
  showInfo("");
  showCollectionsLoading();
  parent.postMessage({ pluginMessage: { type: 'recarregar' } }, '*');
});

// Evento para o seletor de bibliotecas
librarySelect.addEventListener('change', () => {
  const selectedLibraryId = librarySelect.value;
  
  if (!selectedLibraryId) {
    showCollectionsLoading();
    return;
  }
  
  // Limpar e mostrar loading
  clearCollectionsList();
  showCollectionsLoading();
  collectionsLoading.textContent = "Carregando coleções...";
  
  // Solicitar coleções da biblioteca selecionada
  parent.postMessage({ 
    pluginMessage: { 
      type: 'carregarColecoes', 
      libraryId: selectedLibraryId
    } 
  }, '*');
});

// Mostra status inicial
showStatus("Aguardando início...");

// Fecha o plugin quando clicar fora
document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  if (target.id === 'close-button') {
    parent.postMessage({ pluginMessage: { type: 'fechar' } }, '*');
  }
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  // Informa ao plugin que a UI está pronta
  parent.postMessage({ pluginMessage: { type: 'ui-ready' } }, '*');
  
  // Configurar a navegação entre abas
  setupTabs();
  
  // Configurar os listeners para os botões e selects
  setupEventListeners();
});

// Configuração da navegação entre abas
function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      // Remover a classe 'active' de todas as abas
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      
      // Adicionar a classe 'active' à aba clicada
      tab.classList.add('active');
      
      // Mostrar o conteúdo correspondente
      const tabId = tab.getAttribute('data-tab');
      const tabPane = document.getElementById(tabId);
      if (tabPane) {
        tabPane.classList.add('active');
      }
    });
  });
}

// Configurar listeners para botões e selects
function setupEventListeners() {
  // Elementos da aba Update Collections
  const libSelect = document.getElementById('lib-select') as HTMLSelectElement;
  const collectionSelect = document.getElementById('collection-select') as HTMLSelectElement;
  const updateCollectionBtn = document.getElementById('update-collection-btn') as HTMLButtonElement;
  const updateStatus = document.getElementById('update-status') as HTMLDivElement;
  
  // Elementos da aba List Libraries
  const libraryList = document.getElementById('library-list') as HTMLUListElement;
  const refreshButton = document.getElementById('refresh-button') as HTMLButtonElement;
  const errorContainer = document.getElementById('error-container') as HTMLDivElement;
  const infoContainer = document.getElementById('info-container') as HTMLDivElement;
  
  // Manipulador do select de biblioteca na aba Update Collections
  if (libSelect) {
    libSelect.addEventListener('change', () => {
      const libraryId = libSelect.value;
      if (!libraryId) {
        collectionSelect.innerHTML = '<option value="">Selecione uma biblioteca primeiro</option>';
        return;
      }
      
      collectionSelect.innerHTML = '<option value="">Carregando coleções...</option>';
      
      parent.postMessage({ 
        pluginMessage: { 
          type: 'get-collections', 
          libraryId 
        } 
      }, '*');
    });
  }
  
  // Manipulador do botão de atualizar coleções
  if (updateCollectionBtn) {
    updateCollectionBtn.addEventListener('click', () => {
      const libraryId = libSelect.value;
      const collectionId = collectionSelect.value;
      
      if (!libraryId || !collectionId) {
        updateStatus.textContent = 'Selecione uma biblioteca e uma coleção primeiro.';
        return;
      }
      
      updateStatus.textContent = 'Processando substituição de variáveis...';
      
      parent.postMessage({ 
        pluginMessage: { 
          type: 'update-collections', 
          libraryId,
          collectionId
        } 
      }, '*');
    });
  }
  
  // Manipulador do botão de recarregar na aba List Libraries
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      errorContainer.style.display = 'none';
      infoContainer.style.display = 'none';
      libraryList.innerHTML = '<li class="loading">Carregando bibliotecas...</li>';
      
      parent.postMessage({ 
        pluginMessage: { 
          type: 'get-libraries' 
        } 
      }, '*');
    });
  }
  
  // Carregar bibliotecas inicialmente
  parent.postMessage({ 
    pluginMessage: { 
      type: 'get-libraries' 
    } 
  }, '*');
}

// Manipular mensagens recebidas do código do plugin
window.onmessage = (event) => {
  const message = event.data.pluginMessage;
  
  if (!message) return;
  
  // Elementos que vamos precisar
  const libSelect = document.getElementById('lib-select') as HTMLSelectElement;
  const collectionSelect = document.getElementById('collection-select') as HTMLSelectElement;
  const updateStatus = document.getElementById('update-status') as HTMLDivElement;
  const libraryList = document.getElementById('library-list') as HTMLUListElement;
  const errorContainer = document.getElementById('error-container') as HTMLDivElement;
  const infoContainer = document.getElementById('info-container') as HTMLDivElement;
  
  switch (message.type) {
    case 'libraries-loaded':
      // Atualizar o select de bibliotecas na aba Update Collections
      if (libSelect) {
        const options = message.libraries.map((lib: any) => 
          `<option value="${lib.id}">${lib.name}</option>`
        ).join('');
        
        libSelect.innerHTML = '<option value="">Selecione uma biblioteca</option>' + options;
      }
      
      // Atualizar a lista de bibliotecas na aba List Libraries
      if (libraryList) {
        displayLibraries(message.libraries, libraryList);
      }
      break;
      
    case 'collections-loaded':
      // Atualizar o select de coleções na aba Update Collections
      if (collectionSelect) {
        const options = message.collections.map((collection: any) =>
          `<option value="${collection.id}">${collection.name}</option>`
        ).join('');
        
        collectionSelect.innerHTML = '<option value="">Selecione uma coleção</option>' + options;
      }
      break;
      
    case 'collections-for-display-loaded':
      // Manipular a exibição de coleções na aba List Libraries
      const collectionsContainer = document.getElementById(`collections-${message.libraryId}`);
      if (collectionsContainer) {
        if (message.collections.length === 0) {
          collectionsContainer.innerHTML = '<p>Nenhuma coleção encontrada nesta biblioteca.</p>';
        } else {
          let collectionsHtml = '<ul class="collections-list">';
          message.collections.forEach((collection: any) => {
            collectionsHtml += `<li>${collection.name}</li>`;
          });
          collectionsHtml += '</ul>';
          collectionsContainer.innerHTML = collectionsHtml;
        }
      }
      break;
      
    case 'update-collections-result':
      // Exibir resultado da atualização de coleções
      if (updateStatus) {
        updateStatus.textContent = message.success 
          ? `Sucesso! ${message.updatedCount} variáveis foram substituídas.` 
          : `Erro: ${message.error}`;
      }
      break;
      
    case 'error':
      // Exibir mensagens de erro gerais
      console.error('Erro recebido:', message.error);
      
      // Determinar onde exibir o erro com base no contexto
      if (message.context === 'update-collections') {
        if (updateStatus) {
          updateStatus.textContent = `Erro: ${message.error}`;
        }
      } else {
        // Usar o container de erro geral na aba List Libraries
        if (errorContainer) {
          errorContainer.style.display = 'block';
          errorContainer.textContent = message.error;
        }
      }
      break;
  }
};

// Função para exibir a lista de bibliotecas
function displayLibraries(libraries: any[], libraryList: HTMLUListElement) {
  if (!libraryList) return;
  
  if (libraries.length === 0) {
    libraryList.innerHTML = '<li class="empty-list">Nenhuma biblioteca encontrada.</li>';
    return;
  }
  
  let html = '';
  libraries.forEach(library => {
    html += `
      <li class="library-item">
        <div class="library-header">
          <h3>${library.name}</h3>
        </div>
        <button class="view-collections-btn" data-library-id="${library.id}">
          Ver Coleções
        </button>
        <div class="collections-container" id="collections-${library.id}" style="display: none;"></div>
      </li>
    `;
  });
  
  libraryList.innerHTML = html;
  
  // Adicionar handlers para os botões de ver coleções
  document.querySelectorAll('.view-collections-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const btn = e.currentTarget as HTMLElement;
      // Usando type assertion para definir explicitamente como string
      const libraryId = btn.getAttribute('data-library-id') as string;
      
      if (!libraryId) {
        console.error('Atributo data-library-id não encontrado');
        return;
      }
      
      const collectionsContainer = document.getElementById(`collections-${libraryId}`);
      
      if (collectionsContainer) {
        if (collectionsContainer.style.display === 'none') {
          // Se ainda não carregou as coleções, solicitar
          if (collectionsContainer.innerHTML === '') {
            collectionsContainer.innerHTML = '<p>Carregando coleções...</p>';
            
            parent.postMessage({ 
              pluginMessage: { 
                type: 'get-collections-for-display', 
                libraryId 
              } 
            }, '*');
          }
          
          collectionsContainer.style.display = 'block';
          btn.textContent = 'Esconder Coleções';
        } else {
          collectionsContainer.style.display = 'none';
          btn.textContent = 'Ver Coleções';
        }
      }
    });
  });
} 