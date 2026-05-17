type PlainObject = Record<string, unknown>;
type PathKey = string;

export const ObjectUtils = {
  cloneDeep<T>(obj: T): T {
    if (typeof structuredClone === 'function') {
      return structuredClone(obj) as T;
    }
    const deepClone = (value: unknown): unknown => {
      if (value === null || typeof value !== 'object') return value;
      if (Array.isArray(value)) return value.map(deepClone);
      const result: PlainObject = {};
      for (const key of Object.keys(value)) {
        result[key] = deepClone((value as PlainObject)[key]);
      }
      return result as T;
    };
    return deepClone(obj) as T;
  },

  merge<T extends PlainObject, S extends PlainObject>(target: T, source: S): T & S {
    const output: PlainObject = { ...target };
    for (const key in source) {
      const sourceValue = source[key];
      const targetValue = output[key];
      if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
        output[key] = this.merge(
          (targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)
            ? (targetValue as PlainObject)
            : {}) as PlainObject,
          sourceValue as PlainObject
        );
      } else {
        output[key] = sourceValue;
      }
    }
    return output as T & S;
  },

  get<T = unknown>(obj: unknown, path: string, defaultValue?: T): T | unknown {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      result = (result as PlainObject | undefined)?.[key];
      if (result === undefined) return defaultValue;
    }
    return result;
  },

  set<T extends PlainObject>(obj: T, path: string, value: unknown): T {
    const keys = path.split('.');
    const result: PlainObject = { ...obj };
    let temp: PlainObject = result;

    for (const key of keys.slice(0, -1)) {
      if (!temp[key] || typeof temp[key] !== 'object' || Array.isArray(temp[key])) {
        temp[key] = {};
      }
      temp = temp[key] as PlainObject;
    }

    const lastKey = keys.at(-1) as PathKey | undefined;
    if (lastKey) {
      temp[lastKey] = value;
    }
    return result as T;
  },

  pick<T extends PlainObject, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;
    for (const key of keys) {
      if (obj[key] !== undefined) result[key] = obj[key];
    }
    return result;
  },

  omit<T extends PlainObject, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result: PlainObject = { ...obj };
    for (const key of keys) {
      delete result[key as string];
    }
    return result as Omit<T, K>;
  },
};
