/**
 * Normalizes text for search by removing accents and converting to lowercase
 * This allows searching for "jose" to match "José" and "maria" to match "María"
 */
export const normalizeForSearch = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove combining diacritical marks
};

/**
 * Checks if a search term matches a target string using normalized comparison
 */
export const matchesSearch = (target: string | null | undefined, searchTerm: string): boolean => {
  if (!searchTerm.trim()) return true;
  if (!target) return false;
  
  const normalizedTarget = normalizeForSearch(target);
  const normalizedSearch = normalizeForSearch(searchTerm.trim());
  
  return normalizedTarget.includes(normalizedSearch);
};