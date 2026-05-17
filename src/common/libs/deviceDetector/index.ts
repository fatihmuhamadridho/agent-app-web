type BrowserGlobal = typeof globalThis & {
  window?: Window;
  navigator?: Navigator;
};

export class DeviceDetector {
  private readonly ua: string;

  constructor(userAgent?: string) {
    const browser = globalThis as BrowserGlobal;
    const win = browser.window;
    const nav = browser.navigator;

    if (!win) {
      this.ua = userAgent || '';
      return;
    }
    this.ua = userAgent || nav?.userAgent || '';
  }

  private isRealMobileUA() {
    return /Mobi|Android|iPhone/i.test(this.ua);
  }

  private isRealTabletUA() {
    return /iPad|Tablet/i.test(this.ua);
  }

  private hasTouch() {
    const browser = globalThis as BrowserGlobal;
    const nav = browser.navigator;
    return Boolean(nav?.maxTouchPoints && nav.maxTouchPoints > 0);
  }

  private isDevToolsEmulation() {
    const browser = globalThis as BrowserGlobal;
    const nav = browser.navigator;
    if (!nav) return false;

    // Chrome DevTools spoof detection
    const isFakeMobileUA = /Android 6\.0; Nexus 5 Build\/MRA58N/i.test(this.ua);

    const platform = nav.platform?.toLowerCase() ?? '';
    const isDesktopPlatform = platform.includes('mac') || platform.includes('win') || platform.includes('linux');

    // Treat DevTools mobile UA on desktop platform as desktop even if hover is not reported
    if (isFakeMobileUA && isDesktopPlatform) return true;

    return isFakeMobileUA && isDesktopPlatform;
  }

  getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (this.isDevToolsEmulation()) {
      return 'desktop';
    }

    if (this.isRealTabletUA()) return 'tablet';
    if (this.isRealMobileUA()) return 'mobile';

    const browser = globalThis as BrowserGlobal;
    const win = browser.window;
    if (win) {
      if (this.hasTouch() && win.innerWidth < 768) return 'mobile';
      if (this.hasTouch() && win.innerWidth < 1024) return 'tablet';
    }

    return 'desktop';
  }

  getOS() {
    const ua = this.ua;
    if (/Windows NT/i.test(ua)) return 'Windows';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
    if (/Mac OS X/i.test(ua)) return 'MacOS';
    if (/Android/i.test(ua)) return 'Android';
    if (/Linux/i.test(ua)) return 'Linux';
    return 'Unknown';
  }

  getBrowser() {
    const ua = this.ua;
    if (/Edg/i.test(ua)) return 'Edge';
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return 'Chrome';
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
    if (/Firefox/i.test(ua)) return 'Firefox';
    return 'Unknown';
  }

  getDeviceLabel() {
    const type = this.getDeviceType();
    const os = this.getOS();

    if (type === 'mobile' && os === 'Android') return 'Android Phone';
    if (type === 'mobile' && os === 'iOS') return 'iPhone';
    if (type === 'tablet' && os === 'Android') return 'Android Tablet';
    if (type === 'tablet' && os === 'iOS') return 'iPad';
    if (os === 'Windows') return 'Windows PC';
    if (os === 'MacOS') return 'Mac';
    return 'Unknown Device';
  }

  getInfo() {
    return {
      userAgent: this.ua,
      deviceType: this.getDeviceType(),
      os: this.getOS(),
      browser: this.getBrowser(),
      deviceLabel: this.getDeviceLabel(),
      emulationDetected: this.isDevToolsEmulation(),
    };
  }
}
