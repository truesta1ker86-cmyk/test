import { FinanceColumnRules } from '../finance/finance-column-filter';
export type TableValues = Record<string, string | number | null | undefined>;
export function matchesColumns(values: TableValues, rules: FinanceColumnRules) {
  return Object.entries(rules).every(([key, rule]) => {
    const v = values[key],
      text = v == null ? '' : String(v);
    if (rule.values !== null && !rule.values.includes(text || '__empty__')) return false;
    if (rule.text) {
      const found = text.toLocaleLowerCase('ru').includes(rule.text.toLocaleLowerCase('ru'));
      if (found === (rule.operator === 'not_contains')) return false;
    }
    for (const bound of ['min', 'max'] as const) {
      if (rule[bound].trim()) {
        const number = Number(text.replace(',', '.')),
          limit = Number(rule[bound].replace(',', '.'));
        if (
          !text ||
          !Number.isFinite(number) ||
          !Number.isFinite(limit) ||
          (bound === 'min' ? number < limit : number > limit)
        )
          return false;
      }
    }
    return true;
  });
}
export function sortTable<T>(rows: T[], value: (r: T) => unknown, desc: boolean) {
  const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });
  return [...rows].sort((a, b) => {
    const x = value(a),
      y = value(b),
      empty = (v: unknown) => v == null || v === '';
    if (empty(x) !== empty(y)) return empty(x) ? 1 : -1;
    const n = (v: unknown) =>
      typeof v === 'number' ? v : /^-?\d+(\.\d+)?$/.test(String(v)) ? Number(v) : null;
    const nx = n(x),
      ny = n(y),
      result =
        nx !== null && ny !== null ? nx - ny : collator.compare(String(x ?? ''), String(y ?? ''));
    return desc ? -result : result;
  });
}
