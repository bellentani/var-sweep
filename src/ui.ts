// Interface que define a estrutura da biblioteca
interface BibliotecaInfo {
  id: string;
  name: string;
}

console.log("UI carregada");

// Elementos DOM
const listaElement = document.getElementById('lista-bibliotecas') as HTMLDivElement;
const loadingElement = document.getElementById('loading') as HTMLDivElement;
const emptyStateElement = document.getElementById('empty-state') as HTMLDivElement;
const statusElement = document.getElementById('status') as HTMLDivElement;
const reloadButton = document.getElementById('reload-button') as HTMLButtonElement;

console.log("Elementos DOM:", { listaElement, loadingElement, emptyStateElement, statusElement, reloadButton });

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
window.onmessage = (event) => {
  console.log("Mensagem recebida:", event.data);
  
  // Verifica se há uma mensagem válida
  if (!event.data.pluginMessage) {
    showStatus("Erro: Mensagem inválida recebida");
    return;
  }
  
  const message = event.data.pluginMessage;

  if (message && message.type === 'listarBibliotecas') {
    console.log("Recebidas bibliotecas:", message.bibliotecas);
    
    // Esconde o loading
    loadingElement.style.display = 'none';
    
    const bibliotecas = message.bibliotecas as BibliotecaInfo[];
    
    if (!bibliotecas || bibliotecas.length === 0) {
      // Mostra estado vazio
      emptyStateElement.style.display = 'block';
      showStatus("Nenhuma biblioteca encontrada");
      console.log("Nenhuma biblioteca encontrada");
    } else {
      // Mostra a lista
      listaElement.style.display = 'block';
      showStatus(`Exibindo ${bibliotecas.length} bibliotecas`);
      console.log("Exibindo", bibliotecas.length, "bibliotecas");
      
      // Renderiza cada biblioteca
      bibliotecas.forEach(biblioteca => {
        const itemElement = document.createElement('div');
        itemElement.className = 'biblioteca-item';
        itemElement.textContent = biblioteca.name;
        listaElement.appendChild(itemElement);
        console.log("Adicionado item:", biblioteca.name);
      });
    }
  }
};

// Mostra status inicial
showStatus("Aguardando início...");

// Fecha o plugin quando clicar fora
document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  if (target.id === 'close-button') {
    parent.postMessage({ pluginMessage: { type: 'fechar' } }, '*');
  }
}); 