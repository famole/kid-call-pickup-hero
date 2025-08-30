/**
 * Normalizes text for search by removing accents and converting to lowercase
 * This allows searching for "jose" to match "José" and "maria" to match "María"
 */
export const normalizeForSearch = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove combining diacritical marks
};

/**
 * Checks if a search term matches a target string using normalized comparison
 */
export const matchesSearch = (target: string, searchTerm: string): boolean => {
  if (!searchTerm.trim()) return true;
  
  const normalizedTarget = normalizeForSearch(target);
  const normalizedSearch = normalizeForSearch(searchTerm.trim());
  
  return normalizedTarget.includes(normalizedSearch);
};