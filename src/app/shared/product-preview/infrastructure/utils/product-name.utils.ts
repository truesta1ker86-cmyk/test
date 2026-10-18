export const string = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';
