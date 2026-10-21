import { applyFilter } from './filter.engine.utils';
import type { Entity, FilterSchema, FilterValues } from '../types/filter.types';
import type { ColumnRules } from '../../../directives/filter-panel/infrastructure/column-rule.model';

/** Translate column-control values to the original example's filter engine. */
export function selectColumns<T>(
  items: readonly T[],
  rules: ColumnRules,
  project: (item: T) => Entity,
  exclude?: string,
): T[] {
  const projected = items.map(
    (item, index) =>
      ({
        ...Object.fromEntries(
          Object.entries(project(item)).map(([key, value]) => [
            key,
            value == null || value === '' || value === '—' ? '__empty__' : value,
          ]),
        ),
        __rowIndex: index,
      }) as Entity,
  );
  const schema: FilterSchema<Entity> = {},
    values: FilterValues<Entity> = {};
  for (const [field, rule] of Object.entries(rules)) {
    if (field === exclude) continue;
    if (
      !rule ||
      typeof rule !== 'object' ||
      (rule.operator && !['contains', 'not_contains'].includes(rule.operator))
    )
      return [];
    if (rule.values != null) {
      if (!Array.isArray(rule.values)) return [];
      const selected = new Set(rule.values);
      schema[field + ':values'] = {
        path: field,
        predicate: (ctx) => selected.has(String(ctx.entityValue)),
      };
      values[field + ':values'] = 'active';
    }
    if (rule.excluded_values?.length) {
      if (
        !Array.isArray(rule.excluded_values) ||
        !rule.excluded_values.every((value) => typeof value === 'string')
      )
        return [];
      const excluded = new Set(rule.excluded_values);
      schema[field + ':excluded'] = {
        path: field,
        predicate: (ctx) => !excluded.has(String(ctx.entityValue)),
      };
      values[field + ':excluded'] = 'active';
    }
    if (rule.text?.trim()) {
      schema[field + ':text'] = {
        path: field,
        mode: rule.operator === 'not_contains' ? 'notIncludes' : 'includes',
        transform: (value) => (value === '__empty__' ? '' : value),
      };
      values[field + ':text'] = rule.text;
    }
    for (const [bound, mode] of [
      ['min', 'greaterEq'],
      ['max', 'lessEq'],
    ] as const) {
      if (!rule[bound]?.trim()) continue;
      schema[field + ':' + bound] = { path: field, mode };
      values[field + ':' + bound] = rule[bound].replace(',', '.');
    }
  }
  return applyFilter(projected, schema, values).map((row) => items[Number(row['__rowIndex'])]);
}

export function columnChoices<T>(
  items: readonly T[],
  rules: ColumnRules,
  project: (item: T) => Entity,
): Record<string, string[]> {
  const keys = new Set(items.flatMap((item) => Object.keys(project(item))));
  return Object.fromEntries(
    [...keys].map((key) => [
      key,
      [
        ...new Set(
          selectColumns(items, rules, project, key).map((item) => {
            const value = project(item)[key];
            return value == null || value === '' || value === '—' ? '__empty__' : String(value);
          }),
        ),
      ].sort((a, b) => a.localeCompare(b, 'ru', { numeric: true })),
    ]),
  );
}
