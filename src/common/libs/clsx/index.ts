export type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | Record<string, boolean | undefined>
  | ClassValue[];

export function clsx(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  const process = (value: ClassValue): void => {
    if (!value) return;

    if (typeof value === 'string' || typeof value === 'number') {
      classes.push(String(value));
    } else if (Array.isArray(value)) {
      for (const v of value) process(v);
    } else if (typeof value === 'object') {
      for (const key in value) {
        if (value[key]) classes.push(key);
      }
    }
  };

  for (const input of inputs) {
    process(input);
  }

  return classes.join(' ');
}

export default clsx;
