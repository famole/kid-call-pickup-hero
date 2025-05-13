
/**
 * Validates if a string is a proper UUID
 * @param id The string to validate
 * @returns boolean indicating if the string is a valid UUID
 */
export const isValidUUID = (id: string): boolean => {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};
