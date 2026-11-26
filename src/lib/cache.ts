const memoryStore = new Map<string, { data: unknown; timestamp: number }>();

export function getCachedData<T>(key: string): T | null {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  return entry.data as T;
}

export function setCachedData<T>(key: string, data: T): void {
  memoryStore.set(key, { data, timestamp: Date.now() });
}

export function clearCachedData(key?: string): void {
  if (key) {
    memoryStore.delete(key);
  } else {
    memoryStore.clear();
  }
}