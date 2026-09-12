import type { OperatorRegistry } from './filter.types';


export const BUILTIN_OPERATORS: OperatorRegistry = new Map([
  ['equals', (a, b) => a === b],
  ['notEquals', (a, b) => a !== b],
  ['includes', (a, b) => a.includes(b)],
  ['notIncludes', (a, b) => !a.includes(b)],
  ['startsWith', (a, b) => a.startsWith(b)],
  ['endsWith', (a, b) => a.endsWith(b)],
  [
    'oneOf',
    (a, b) =>
      b
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
        .includes(a),
  ],
  [
    'notOneOf',
    (a, b) =>
      !b
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
        .includes(a),
  ],
  ['greater', (a, b) => Number(a) > Number(b)],
  ['greaterEq', (a, b) => Number(a) >= Number(b)],
  ['less', (a, b) => Number(a) < Number(b)],
  ['lessEq', (a, b) => Number(a) <= Number(b)],
  [
    'between',
    (a, b) => {
      const [min, max] = b.split(',').map(Number);
      const num = Number(a);
      return Number.isFinite(num) && num >= min && num <= max;
    },
  ],
  [
    'regex',
    (a, b) => {
      try {
        return new RegExp(b).test(a);
      } catch {
        return false;
      }
    },
  ],
]);

/** Глобальный реестр — можно дополнять своими операторами. */
export const OPERATORS: OperatorRegistry = new Map(BUILTIN_OPERATORS);

/** Зарегистрировать свой оператор. */
export function registerOperator(name: string, fn: (a: string, b: string) => boolean): void {
  OPERATORS.set(name, fn);
}

/** Удалить оператор (для тестов). */
export function unregisterOperator(name: string): boolean {
  return OPERATORS.delete(name);
}

/** Получить оператор по имени. */
export function getOperator(name: string): ((a: string, b: string) => boolean) | null {
  return OPERATORS.get(name) ?? null;
}
