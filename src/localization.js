// Localization system for Aplica Variables Sweep plugin
// Contains translations for all UI elements in English and Portuguese

const translations = {
  'en': {
    // General
    'language_code': 'EN',
    'language_name': 'English',
    
    // Tabs
    'update_collections': 'Update Collections',
    'update_variables': 'Update Variables',
    'list_libraries': 'List Libraries',
    
    // Update Collections tab
    'update_collections_title': 'Update Collections',
    'reference_library': 'Reference Library:',
    'local_collection': 'Local Collection:',
    'select_library': 'Select Library',
    'select_collection': 'Select Collection',
    'select_local_collection': 'Select Local Collection',
    'update_button': 'Update Collections',
    'no_libraries': 'No libraries available',
    'select_library_first': 'Please select a library first',
    'no_collections': 'No collections available in this library',
    'preview_title': 'Preview:',
    'preview_matches': 'Preview Matches',
    'no_matches_found': 'No matches found',
    'matches_found': 'Matches found:',
    'local_variable': 'Local Variable',
    'library_variable': 'Library Variable',
    'loading_libraries': 'Loading libraries...',
    'loading_local_collections': 'Loading local collections...',
    'no_preview_yet': 'Nothing to preview yet. Select an external library and a local collection to see the matches.',
    'select_external_library_help': 'Select the external library with the variables you want to use as reference',
    'select_local_collection_help': 'Select the local collection whose variables will be replaced',
    'no_local_collections': 'No local collection found. Create local variable collections first.',
    
    // Update Variables tab
    'update_variables_title': 'Update Variables',
    'scope_selection': 'Scope',
    'current_selection': 'Current Selection',
    'current_page': 'Current Page',
    'search_variables': 'Search Variables',
    'replace_variables': 'Replace Variables',
    'select_library_collection': 'Select Library and Collection',
    'select_scope': 'Select Scope',
    
    // List Libraries tab
    'list_libraries_title': 'Aplica Variables Sweep',
    'all_libraries': 'All libraries:',
    'searching_libraries': 'Searching libraries...',
    'reload': 'Reload',
    'library_id': 'Library ID',
    'library_type': 'Type',
    'component_library': 'Component Library',
    'variable_library': 'Variable Library',
    
    // Settings
    'settings': 'Settings',
    'settings_title': 'Settings',
    'language': 'Language / Idioma',
    'cancel': 'Cancel',
    'save': 'Save',
    'settings_saved': 'Settings saved successfully',
    
    // Messages
    'processing': 'Processing...',
    'no_selection': 'No elements selected',
    'select_elements': 'Please select elements to process',
    'no_variables_found': 'No variables found',
    'variables_found': 'Variables found:',
    'success': 'Success',
    'error': 'Error',
    'loading': 'Loading...',
    'updating': 'Updating...',
    'searching': 'Searching...',
    
    // Confirmation dialog
    'confirm': 'Confirm',
    'confirm_replace': 'Are you sure you want to replace these variables?',
    'yes': 'Yes',
    'no': 'No',
    
    // Error messages
    'error_no_library': 'Error: No library selected',
    'error_no_collection': 'Error: No collection selected',
    'error_no_variables': 'Error: No variables found to replace',
    'error_api': 'API Error: Could not complete the operation',
    
    // Success messages
    'success_updated': 'Successfully updated {count} variables',
    'success_replaced': 'Successfully replaced {count} variables',
    
    // Footer
    'version': 'v{version}',
    'version_with_lang': 'v{version} | {lang}'
  },
  'pt-br': {
    // General
    'language_code': 'PT',
    'language_name': 'Português',
    
    // Tabs
    'update_collections': 'Atualizar Collections',
    'update_variables': 'Atualizar Variáveis',
    'list_libraries': 'Listar Bibliotecas',
    
    // Update Collections tab
    'update_collections_title': 'Atualizar Collections',
    'reference_library': 'Biblioteca de referência:',
    'local_collection': 'Coleção local:',
    'select_library': 'Selecionar Biblioteca',
    'select_collection': 'Selecionar Coleção',
    'select_local_collection': 'Selecionar Coleção Local',
    'update_button': 'Atualizar Collections',
    'no_libraries': 'Nenhuma biblioteca disponível',
    'select_library_first': 'Por favor, selecione uma biblioteca primeiro',
    'no_collections': 'Nenhuma coleção disponível nesta biblioteca',
    'preview_title': 'Pré-visualização:',
    'preview_matches': 'Visualizar Correspondências',
    'no_matches_found': 'Nenhuma correspondência encontrada',
    'matches_found': 'Correspondências encontradas:',
    'local_variable': 'Variável Local',
    'library_variable': 'Variável da Biblioteca',
    'loading_libraries': 'Carregando bibliotecas...',
    'loading_local_collections': 'Carregando coleções locais...',
    'no_preview_yet': 'Ainda não há nada para pré-visualizar. Selecione uma biblioteca externa e uma coleção local para ver as correspondências.',
    'select_external_library_help': 'Selecione a biblioteca externa com as variáveis que deseja usar como referência',
    'select_local_collection_help': 'Selecione a coleção local cujas variáveis serão substituídas',
    'no_local_collections': 'Nenhuma coleção local encontrada. Crie coleções de variáveis locais primeiro.',
    
    // Update Variables tab
    'update_variables_title': 'Atualizar Variáveis',
    'scope_selection': 'Escopo',
    'current_selection': 'Seleção Atual',
    'current_page': 'Página Atual',
    'search_variables': 'Buscar Variáveis',
    'replace_variables': 'Substituir Variáveis',
    'select_library_collection': 'Selecionar Biblioteca e Coleção',
    'select_scope': 'Selecionar Escopo',
    
    // List Libraries tab
    'list_libraries_title': 'Aplica Variables Sweep',
    'all_libraries': 'Todas as bibliotecas:',
    'searching_libraries': 'Procurando bibliotecas...',
    'reload': 'Recarregar',
    'library_id': 'ID da Biblioteca',
    'library_type': 'Tipo',
    'component_library': 'Biblioteca de Componentes',
    'variable_library': 'Biblioteca de Variáveis',
    
    // Settings
    'settings': 'Configurações',
    'settings_title': 'Configurações',
    'language': 'Idioma / Language',
    'cancel': 'Cancelar',
    'save': 'Salvar',
    'settings_saved': 'Configurações salvas com sucesso',
    
    // Messages
    'processing': 'Processando...',
    'no_selection': 'Nenhum elemento selecionado',
    'select_elements': 'Por favor, selecione elementos para processar',
    'no_variables_found': 'Nenhuma variável encontrada',
    'variables_found': 'Variáveis encontradas:',
    'success': 'Sucesso',
    'error': 'Erro',
    'loading': 'Carregando...',
    'updating': 'Atualizando...',
    'searching': 'Pesquisando...',
    
    // Confirmation dialog
    'confirm': 'Confirmar',
    'confirm_replace': 'Tem certeza que deseja substituir essas variáveis?',
    'yes': 'Sim',
    'no': 'Não',
    
    // Error messages
    'error_no_library': 'Erro: Nenhuma biblioteca selecionada',
    'error_no_collection': 'Erro: Nenhuma coleção selecionada',
    'error_no_variables': 'Erro: Nenhuma variável encontrada para substituir',
    'error_api': 'Erro de API: Não foi possível completar a operação',
    
    // Success messages
    'success_updated': 'Atualizadas com sucesso {count} variáveis',
    'success_replaced': 'Substituídas com sucesso {count} variáveis',
    
    // Footer
    'version': 'v{version}',
    'version_with_lang': 'v{version} | {lang}'
  }
};

// Function to get translation
function getTranslation(language, key, params = {}) {
  if (!translations[language] || !translations[language][key]) {
    return key; // Return the key itself if translation not found
  }
  
  let text = translations[language][key];
  
  // Replace any parameters in the text
  Object.keys(params).forEach(param => {
    text = text.replace(`{${param}}`, params[param]);
  });
  
  return text;
}

// Export the translations and helper function
export { translations, getTranslation };
