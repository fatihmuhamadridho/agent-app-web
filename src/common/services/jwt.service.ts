export class JwtService {
  static decode<T = Record<string, unknown>>(token?: string): T | null {
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length < 2) return null;

    const base64 = parts[1].replaceAll('-', '+').replaceAll('_', '/');

    try {
      const json = this.base64Decode(base64);
      return JSON.parse(json) as T;
    } catch (error) {
      console.warn('[JwtService] Failed to decode token', error);
      return null;
    }
  }

  private static base64Decode(base64: string): string {
    if (globalThis.window !== undefined && typeof globalThis.atob === 'function') {
      return decodeURIComponent(
        Array.prototype.map
          .call(globalThis.atob(base64), (c: string) => '%' + ('00' + (c.codePointAt(0) ?? 0).toString(16)).slice(-2))
          .join('')
      );
    }
    return Buffer.from(base64, 'base64').toString('utf-8');
  }
}
