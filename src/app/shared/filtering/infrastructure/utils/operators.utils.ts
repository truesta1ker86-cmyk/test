import { OPERATORS } from '../constants/operators.constants';

export function registerOperator(name: string, fn: (a: string, b: string) => boolean): void {
  OPERATORS.set(name, fn);
}

export function unregisterOperator(name: string): boolean {
  return OPERATORS.delete(name);
}

export function getOperator(name: string): ((a: string, b: string) => boolean) | null {
  return OPERATORS.get(name) ?? null;
}
