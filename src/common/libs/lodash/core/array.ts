type AnyRecord = Record<string, unknown>;

export const ArrayUtils = {
  chunk<T>(arr: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  },

  uniq<T>(arr: T[]): T[] {
    return [...new Set(arr)];
  },

  uniqBy<T>(arr: T[], iteratee: keyof T | ((item: T) => unknown)): T[] {
    const seen = new Set<string>();
    return arr.filter((item) => {
      const value = typeof iteratee === 'function' ? iteratee(item) : (item as AnyRecord)[iteratee as string];
      const key = JSON.stringify(value);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },

  flattenDeep<T>(arr: T[]): T[] {
    return arr.reduce<T[]>((acc, val) => {
      if (Array.isArray(val)) {
        acc.push(...this.flattenDeep(val as T[]));
      } else {
        acc.push(val);
      }
      return acc;
    }, []);
  },

  difference<T>(arr1: T[], arr2: T[]): T[] {
    const set2 = new Set(arr2);
    return arr1.filter((x) => !set2.has(x));
  },

  groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
    return arr.reduce<Record<string, T[]>>((acc, item) => {
      const value = (item as AnyRecord)[key as string];
      let group: string;
      if (typeof value === 'string') {
        group = value;
      } else if (value === null || value === undefined) {
        group = '';
      } else if (typeof value === 'object') {
        try {
          group = JSON.stringify(value);
        } catch {
          group = Object.prototype.toString.call(value);
        }
      } else {
        group = String(value);
      }
      acc[group] = acc[group] || [];
      acc[group].push(item);
      return acc;
    }, {});
  },
};
