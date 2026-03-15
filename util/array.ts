export function ensureArray<T>(itemOrArray: T | T[]): T[] {
  return Array.isArray(itemOrArray) ? itemOrArray : [itemOrArray];
}
