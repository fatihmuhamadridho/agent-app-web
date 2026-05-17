export const NumberUtils = {
  clamp(num: number, min: number, max: number) {
    return Math.min(Math.max(num, min), max);
  },

  inRange(num: number, start: number, end?: number) {
    if (end === undefined) {
      end = start;
      start = 0;
    }
    return num >= start && num < end;
  },

  random(min = 0, max = 1) {
    const a = Number(min);
    const b = Number(max);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new TypeError('random expects finite numbers');
    }

    const low = Math.min(a, b);
    const high = Math.max(a, b);
    const range = high - low + 1;

    const unit = (() => {
      const globalCrypto = typeof globalThis === 'undefined' ? undefined : globalThis.crypto;
      if (globalCrypto?.getRandomValues) {
        const buf = new Uint32Array(1);
        globalCrypto.getRandomValues(buf);
        return buf[0] / 0xffffffff;
      }
      throw new Error('Secure random source unavailable');
    })();
    return Math.floor(unit * range) + low;
  },
};
