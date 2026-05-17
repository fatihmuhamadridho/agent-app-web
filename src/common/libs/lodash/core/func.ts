type AnyFn<Args extends unknown[] = unknown[], R = unknown> = (...args: Args) => R;

export const FuncUtils = {
  debounce<Args extends unknown[], R>(fn: AnyFn<Args, R>, delay: number) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return (...args: Args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  throttle<Args extends unknown[], R>(fn: AnyFn<Args, R>, interval: number) {
    let lastTime = 0;
    return (...args: Args) => {
      const now = Date.now();
      if (now - lastTime >= interval) {
        fn(...args);
        lastTime = now;
      }
    };
  },
};
