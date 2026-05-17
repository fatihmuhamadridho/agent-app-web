// libs/DateFns.ts
export type DateInput = Date | string | number;

export class DateFns {
  // ======================================================
  // Internal Helpers
  // ======================================================

  private static toDate(value: DateInput): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  }

  private static pad(num: number, len = 2): string {
    return String(num).padStart(len, '0');
  }

  // ======================================================
  // FORMAT
  // Supports:
  // dd, d, MM, M, MMM, MMMM, yyyy, yy
  // HH, H, mm, m, ss, s
  // ======================================================

  static format(value: DateInput, pattern: string): string {
    const d = this.toDate(value);

    const tokens: Record<string, string> = {
      dd: this.pad(d.getDate()),
      d: String(d.getDate()),

      MM: this.pad(d.getMonth() + 1),
      M: String(d.getMonth() + 1),

      MMM: d.toLocaleString('en', { month: 'short' }), // Jan
      MMMM: d.toLocaleString('en', { month: 'long' }), // January

      yyyy: String(d.getFullYear()),
      yy: String(d.getFullYear()).slice(-2),

      HH: this.pad(d.getHours()),
      H: String(d.getHours()),

      mm: this.pad(d.getMinutes()),
      m: String(d.getMinutes()),

      ss: this.pad(d.getSeconds()),
      s: String(d.getSeconds()),
    };

    return pattern.replaceAll(/yyyy|yy|MMMM|MMM|MM|M|dd|d|HH|H|mm|m|ss|s/g, (match) => tokens[match]);
  }

  static formatShort(value: DateInput): string {
    return this.format(value, 'dd MMM yyyy');
  }

  // ======================================================
  // PARSING
  // ======================================================

  static parseISO(iso: string): Date {
    return new Date(iso);
  }

  static parseDate(value: string): Date {
    return new Date(value);
  }

  // ======================================================
  // ADD + SUBTRACT
  // ======================================================

  static addDays(value: DateInput, days: number) {
    const d = this.toDate(value);
    d.setDate(d.getDate() + days);
    return d;
  }

  static addMonths(value: DateInput, months: number) {
    const d = this.toDate(value);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  static addYears(value: DateInput, years: number) {
    const d = this.toDate(value);
    d.setFullYear(d.getFullYear() + years);
    return d;
  }

  static subDays(value: DateInput, days: number) {
    return this.addDays(value, -days);
  }

  // ======================================================
  // START / END OF
  // ======================================================

  static startOfDay(value: DateInput) {
    const d = this.toDate(value);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  static endOfDay(value: DateInput) {
    const d = this.toDate(value);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  static startOfMonth(value: DateInput) {
    const d = this.toDate(value);
    d.setDate(1);
    return this.startOfDay(d);
  }

  static endOfMonth(value: DateInput) {
    const d = this.toDate(value);
    d.setMonth(d.getMonth() + 1, 0);
    return this.endOfDay(d);
  }

  // ======================================================
  // DIFFERENCE
  // ======================================================

  static differenceInDays(a: DateInput, b: DateInput): number {
    const d1 = this.startOfDay(a).getTime();
    const d2 = this.startOfDay(b).getTime();
    return Math.floor((d1 - d2) / (1000 * 60 * 60 * 24));
  }

  static differenceInHours(a: DateInput, b: DateInput): number {
    return Math.floor((this.toDate(a).getTime() - this.toDate(b).getTime()) / (1000 * 60 * 60));
  }

  static differenceInMinutes(a: DateInput, b: DateInput): number {
    return Math.floor((this.toDate(a).getTime() - this.toDate(b).getTime()) / (1000 * 60));
  }

  // ======================================================
  // COMPARISON
  // ======================================================

  static isBefore(a: DateInput, b: DateInput): boolean {
    return this.toDate(a).getTime() < this.toDate(b).getTime();
  }

  static isAfter(a: DateInput, b: DateInput): boolean {
    return this.toDate(a).getTime() > this.toDate(b).getTime();
  }

  static isSameDay(a: DateInput, b: DateInput): boolean {
    const d1 = this.toDate(a);
    const d2 = this.toDate(b);
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  }

  // ======================================================
  // INTERVAL HELPERS
  // ======================================================

  static isBetween(value: DateInput, start: DateInput, end: DateInput): boolean {
    const t = this.toDate(value).getTime();
    return t >= this.toDate(start).getTime() && t <= this.toDate(end).getTime();
  }

  // ======================================================
  // WEEKEND CHECK
  // ======================================================

  static isWeekend(value: DateInput): boolean {
    const day = this.toDate(value).getDay();
    return day === 0 || day === 6; // Sun or Sat
  }

  // ======================================================
  // TIME AGO
  // ======================================================

  static timeAgo(value: DateInput): string {
    const now = new Date();
    const date = this.toDate(value);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
}
