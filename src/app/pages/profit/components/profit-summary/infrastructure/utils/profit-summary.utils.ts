export const number = (value: unknown): number =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

export const text = (value: unknown): string => (value == null ? '' : String(value));
