export class SessionStorageService {
  private readonly isServer: boolean;

  constructor(opts?: { isServer?: boolean }) {
    this.isServer = opts?.isServer ?? globalThis.window === undefined;
  }

  set(key: string, value: string) {
    if (this.isServer) return;
    sessionStorage.setItem(key, value);
  }

  get(key: string): string | null {
    if (this.isServer) return null;
    return sessionStorage.getItem(key);
  }

  delete(key: string) {
    if (this.isServer) return;
    sessionStorage.removeItem(key);
  }

  clear() {
    if (this.isServer) return;
    sessionStorage.clear();
  }

  setJSON<T>(key: string, value: T) {
    if (this.isServer) return;
    sessionStorage.setItem(key, JSON.stringify(value));
  }

  getJSON<T>(key: string): T | null {
    const raw = this.get(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      console.error(`[SessionStorageService] Failed to parse JSON for key "${key}":`, error);
      return null;
    }
  }
}

export const sessionStorageService = new SessionStorageService();
