export const parentIdMap: Record<string | number, string> = {};

export const registerParentId = (oldId: string | number, newId: string) => {
  parentIdMap[oldId] = newId;
};

export const lookupParentId = (oldId: string | number): string | undefined => {
  return parentIdMap[oldId];
};
