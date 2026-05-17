export class LocalStorageService {
  private readonly isServer: boolean;

  constructor(opts?: { isServer?: boolean }) {
    this.isServer = opts?.isServer ?? globalThis.window === undefined;
  }

  set(key: string, value: string) {
    if (this.isServer) return;
    localStorage.setItem(key, value);
  }

  get(key: string): string | null {
    if (this.isServer) return null;
    return localStorage.getItem(key);
  }

  delete(key: string) {
    if (this.isServer) return;
    localStorage.removeItem(key);
  }

  clear() {
    if (this.isServer) return;
    localStorage.clear();
  }

  setJSON<T>(key: string, value: T) {
    if (this.isServer) return;
    localStorage.setItem(key, JSON.stringify(value));
  }

  getJSON<T>(key: string): T | null {
    const raw = this.get(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      console.error(`[LocalStorageService] Failed to parse JSON for key "${key}":`, error);
      return null;
    }
  }
}

export const localStorageService = new LocalStorageService();
