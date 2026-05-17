export const StringUtils = {
  upperCase(text: string) {
    return text.toUpperCase();
  },

  lowerCase(text: string) {
    return text.toLowerCase();
  },

  capitalize(text: string) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  },

  titleCase(text: string) {
    if (!text) return '';
    return text
      .toLowerCase()
      .split(/\s+/)
      .map((w) => this.capitalize(w))
      .join(' ');
  },

  sanitize(text: string) {
    return text
      .replaceAll(/([a-z])([A-Z])/g, '$1 $2')
      .replaceAll(/[\W_]+/g, ' ')
      .trim()
      .toLowerCase();
  },

  kebabCase(text: string) {
    return this.sanitize(text).replaceAll(/\s+/g, '-');
  },

  snakeCase(text: string) {
    return this.sanitize(text).replaceAll(/\s+/g, '_');
  },

  camelCase(text: string) {
    const parts = this.sanitize(text).split(' ');
    return parts.map((w, i) => (i === 0 ? w : this.capitalize(w))).join('');
  },

  pascalCase(text: string) {
    return this.sanitize(text)
      .split(' ')
      .map((w) => this.capitalize(w))
      .join('');
  },
};
