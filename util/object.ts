export type NonNullishValues<T> = {
  [K in keyof T as T[K] extends null | undefined ? never : K]: T[K];
};

type Entries<T> = { [K in keyof T]: [K, T[K]] }[keyof T][];

export function entries<T extends Record<string, unknown>>(obj: T): Entries<T> {
  return Object.entries(obj) as Entries<T>;
}

export function fromEntries<K extends string, V>(
  entries: ReadonlyArray<readonly [K, V]>,
): Record<K, V> {
  return Object.fromEntries(entries) as Record<K, V>;
}

export function isEmptyObject<T extends Record<string, unknown>>(
  obj: T,
): boolean {
  return Object.entries(obj).length < 1;
}

export function removeNullishValueEntries<T extends Record<string, unknown>>(
  obj: T,
): NonNullishValues<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value != null),
  ) as NonNullishValues<T>;
}
