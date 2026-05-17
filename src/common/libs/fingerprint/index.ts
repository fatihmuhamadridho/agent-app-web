type BrowserGlobal = typeof globalThis & {
  window?: Window;
  navigator?: Navigator;
  document?: Document;
};

type BrowserWindow = Window & {
  AudioContext?: typeof globalThis.AudioContext;
  webkitAudioContext?: typeof globalThis.AudioContext;
};

type WebGLDebugContext = WebGLRenderingContext & {
  getExtension(extensionName: 'WEBGL_debug_renderer_info'): WEBGL_debug_renderer_info | null;
};

export class Fingerprint {
  private getWindow(): Window | undefined {
    return (globalThis as BrowserGlobal).window;
  }

  private getNavigator(): Navigator | undefined {
    return (globalThis as BrowserGlobal).navigator;
  }

  private getDocument(): Document | undefined {
    return (globalThis as BrowserGlobal).document;
  }

  async getGPUInfo() {
    let gpuVendor = 'unknown';
    let gpuRenderer = 'unknown';

    try {
      const doc = this.getDocument();
      if (!doc?.createElement) return { gpuVendor, gpuRenderer };
      const canvas = doc.createElement('canvas');
      const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLDebugContext | null;

      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          gpuVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown';
          gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown';
        }
      }
    } catch (err) {
      console.warn('GPU detection skipped:', err);
    }

    return { gpuVendor, gpuRenderer };
  }

  async getAudioHash() {
    try {
      const win = this.getWindow() as BrowserWindow | undefined;
      const AudioCtx = win?.AudioContext || win?.webkitAudioContext;
      if (!AudioCtx) throw new Error('AudioContext unavailable');
      const audioCtx = new AudioCtx();
      const rate = audioCtx.sampleRate || 0;
      audioCtx.close?.().catch(() => {});
      return rate;
    } catch (err) {
      console.warn('Audio hash unavailable:', err);
      return 0;
    }
  }

  getCPUCores() {
    const nav = this.getNavigator();
    return nav?.hardwareConcurrency || 0;
  }

  getMemory() {
    const nav = this.getNavigator() as Navigator & { deviceMemory?: number };
    return nav?.deviceMemory || 0;
  }

  getTouchSupport() {
    const nav = this.getNavigator();
    return Boolean(nav?.maxTouchPoints && nav.maxTouchPoints > 0);
  }

  getPlatform() {
    const nav = this.getNavigator();
    const uaPlatform = (nav as Navigator & { userAgentData?: { platform?: string } })?.userAgentData?.platform;
    if (uaPlatform) return uaPlatform;

    const ua = nav?.userAgent || '';
    if (/windows/i.test(ua)) return 'Windows';
    if (/mac os x|macintosh/i.test(ua)) return 'MacOS';
    if (/android/i.test(ua)) return 'Android';
    if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
    if (/linux/i.test(ua)) return 'Linux';
    return 'unknown';
  }

  getScreenResolution() {
    const win = this.getWindow();
    if (!win?.screen) return '0x0';
    return `${win.screen.width}x${win.screen.height}`;
  }

  async getFingerprint() {
    const cpu = this.getCPUCores();
    const memory = this.getMemory();
    const touchSupport = this.getTouchSupport();
    const screenRes = this.getScreenResolution();
    const win = this.getWindow();
    const screenWidth = win?.screen?.width ?? 0;
    const screenHeight = win?.screen?.height ?? 0;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const platform = this.getPlatform();

    const { gpuVendor, gpuRenderer } = await this.getGPUInfo();
    const audioHash = await this.getAudioHash();

    const deviceType = this.detectDevice({
      cpu,
      memory,
      gpuRenderer,
      platform,
      touchSupport,
    });

    return {
      cpu,
      memory,
      touchSupport,
      screenRes,
      screenWidth,
      screenHeight,
      timezone,
      platform,
      gpuVendor,
      gpuRenderer,
      audioHash,
      deviceType,
    };
  }

  detectDevice({
    cpu,
    memory,
    gpuRenderer,
    platform,
    touchSupport,
  }: {
    cpu: number;
    memory: number;
    gpuRenderer: string;
    platform: string;
    touchSupport: boolean;
  }): 'mobile' | 'desktop' {
    let type: 'mobile' | 'desktop' = 'desktop';

    const isMobileGPU = /Adreno|Mali|Apple A/i.test(gpuRenderer) || /android|iphone|ipad/i.test(platform);

    const lowCPU = cpu > 0 && cpu <= 4;
    const lowMemory = memory > 0 && memory <= 4;

    if (lowCPU || lowMemory || isMobileGPU || touchSupport) {
      type = 'mobile';
    }

    const isDesktopGPU = /Apple M|NVIDIA|AMD|Intel/i.test(gpuRenderer) && !/Apple A/i.test(gpuRenderer);

    const isDesktopPlatform = /mac|win|linux/i.test(platform) && !/iphone|ipad|android/i.test(platform);

    if (isDesktopGPU || isDesktopPlatform) {
      type = 'desktop';
    }

    return type;
  }
}
