// lib/utils/locationUtils.ts

/**
 * Gera um campo de location concatenado para facilitar buscas por localização
 * Combina address, neighborhood, city e description em uma string pesquisável
 */
export const generateLocationField = (property: {
  address?: string;
  neighborhood?: string;  
  city?: string;
  description?: string;
  title?: string;
}): string => {
  const locationParts = [
    property.address,
    property.neighborhood,
    property.city,
    // Incluir também partes relevantes do título e descrição para busca mais ampla
    property.title,
    property.description
  ]
    .filter(Boolean) // Remove valores nulos/undefined/vazios
    .map(part => part?.trim().toLowerCase()) // Normaliza para busca
    .filter(part => part && part.length > 0); // Remove strings vazias
  
  return locationParts.join(' ');
};

/**
 * Normaliza termos de busca para comparação
 */
export const normalizeSearchTerm = (term: string): string => {
  return term.trim().toLowerCase();
};

/**
 * Verifica se um termo de busca está contido no campo location
 */
export const locationContains = (locationField: string, searchTerm: string): boolean => {
  const normalizedLocation = normalizeSearchTerm(locationField);
  const normalizedTerm = normalizeSearchTerm(searchTerm);
  
  return normalizedLocation.includes(normalizedTerm);
};