import { parse, serialize } from 'cookie';
import type { NextApiRequest, NextApiResponse } from 'next';

type CookieOptions = {
  maxAge?: number;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
};

const DEFAULT_COOKIE_OPTIONS: Required<Pick<CookieOptions, 'maxAge' | 'path' | 'httpOnly'>> = {
  maxAge: 60 * 60 * 24, // 1 day in seconds
  path: '/',
  httpOnly: false,
};

export class CookiesStorageService {
  private readonly isServer: boolean;

  constructor(opts?: { isServer?: boolean }) {
    this.isServer = opts?.isServer ?? globalThis.window === undefined;
  }

  set(name: string, value: string, options: CookieOptions = {}) {
    if (this.isServer) {
      throw new Error('[CookiesStorageService] set() hanya bisa digunakan di client. Gunakan setServer() untuk SSR.');
    }

    document.cookie = serialize(name, value, {
      ...DEFAULT_COOKIE_OPTIONS,
      ...options,
    });
  }

  get(name: string): string | null {
    if (this.isServer) return null;
    const cookies = parse(document.cookie || '');
    return cookies[name] || null;
  }

  delete(name: string) {
    if (this.isServer) return;

    document.cookie = serialize(name, '', {
      maxAge: -1,
      path: '/',
    });
  }

  clear() {
    if (this.isServer) return;

    const cookies = parse(document.cookie || '');
    for (const cookieName of Object.keys(cookies)) {
      document.cookie = serialize(cookieName, '', {
        maxAge: -1,
        path: '/',
      });
    }
  }

  setJSON<T>(name: string, value: T, options?: CookieOptions) {
    this.set(name, JSON.stringify(value), options);
  }

  getJSON<T>(name: string): T | null {
    const raw = this.get(name);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      console.warn(`[CookiesStorageService] Failed to parse JSON for key "${name}", clearing it`, error);
      return null;
    }
  }

  getServer(req: NextApiRequest | { headers: { cookie?: string } }, name: string): string | null {
    const cookies = parse(req?.headers?.cookie || '');
    return cookies[name] || null;
  }

  setServer(res: NextApiResponse, name: string, value: string, options: CookieOptions = {}) {
    const cookieStr = serialize(name, value, {
      ...DEFAULT_COOKIE_OPTIONS,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      ...options,
    });

    const existing = res.getHeader('Set-Cookie');
    let cookies: string[] = [];
    if (Array.isArray(existing)) {
      cookies = existing;
    } else if (existing) {
      cookies = [existing.toString()];
    }

    res.setHeader('Set-Cookie', [...cookies, cookieStr]);
  }

  deleteServer(res: NextApiResponse, name: string) {
    const cookieStr = serialize(name, '', {
      path: '/',
      maxAge: -1,
    });

    res.setHeader('Set-Cookie', cookieStr);
  }

  clearServer(req: NextApiRequest, res: NextApiResponse) {
    const cookies = parse(req?.headers?.cookie || '');
    const cleared = Object.keys(cookies).map((cookieName) =>
      serialize(cookieName, '', {
        path: '/',
        maxAge: -1,
      })
    );

    res.setHeader('Set-Cookie', cleared);
  }
}
