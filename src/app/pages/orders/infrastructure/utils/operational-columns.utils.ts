import { applyFilter } from '../../../../shared/filtering/infrastructure/utils/filter.engine.utils';
import type {
  Entity,
  FilterSchema,
  FilterValues,
} from '../../../../shared/filtering/infrastructure/types/filter.types';
import type {
  ColumnRule,
  ColumnRules,
} from '../../../../shared/directives/filter-panel/infrastructure/column-rule.model';
import { date, number } from '../../../../core/infrastructure/utils/format.utils';
import { status } from './format.utils';
import type { ListPage } from '../interfaces/contracts.interfaces';
import { ORDER_COLUMN_KEYS, RETURN_COLUMN_KEYS } from '../constants/operational-columns.constants';

function parseRules(raw: string, fields: string[]): ColumnRules {
  const value: unknown = JSON.parse(raw || '{}');
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Некорректный фильтр столбцов.');
  for (const [key, rawRule] of Object.entries(value)) {
    if (!fields.includes(key) || !rawRule || typeof rawRule !== 'object' || Array.isArray(rawRule))
      throw new Error('Неизвестный столбец отбора.');
    const rule = rawRule as Partial<ColumnRule>;
    if (
      rule.values != null &&
      (!Array.isArray(rule.values) || !rule.values.every((v) => typeof v === 'string'))
    )
      throw new Error('Некорректные значения столбца.');
    if (rule.text != null && typeof rule.text !== 'string')
      throw new Error('Некорректный текст отбора.');
    if (rule.operator != null && !['contains', 'not_contains'].includes(rule.operator))
      throw new Error('Неизвестный оператор отбора.');
    for (const bound of [rule.min, rule.max])
      if (
        bound != null &&
        (typeof bound !== 'string' ||
          (bound.trim() && (key !== 'amount' || !Number.isFinite(Number(bound.replace(',', '.'))))))
      )
        throw new Error('Проверьте диапазон суммы.');
    if (
      rule.min?.trim() &&
      rule.max?.trim() &&
      Number(rule.min.replace(',', '.')) > Number(rule.max.replace(',', '.'))
    )
      throw new Error('Начало диапазона больше конца.');
  }
  return value as ColumnRules;
}

/** Adapt the existing column controls to the original matcher after listAll.
 * Preserve the API rows, lifecycle totals, quantities and order-action rules.
 */
export function applyOperationalColumns(
  data: ListPage,
  entity: 'orders' | 'returns',
  raw = '',
): ListPage {
  const fields = entity === 'orders' ? ORDER_COLUMN_KEYS : RETURN_COLUMN_KEYS;
  const rules = parseRules(raw, fields);
  const projected: Entity[] = data.items.map((row, index) => {
    const order = 'items' in row;
    const amount = number(order ? row.total_price : row.returns_amount);
    const created = date(order ? row.created_at || row.in_process_at : row.returned_at);
    const values: Entity = {
      index,
      posting_number: row.posting_number,
      status: row.status ? status(row.status, order ? row.scheme : undefined) : null,
      amount: amount === null ? null : String(amount),
      date: order ? created : created.split(',')[0],
    };
    if (order) {
      values['scheme'] =
        row.scheme?.toLowerCase() === 'rfbs' ? 'realFBS' : row.scheme?.toUpperCase();
      values['items'] = row.items
        .map((item) => `${item.name || ''} ${item.offer_id || ''} × ${item.quantity}`)
        .join('\n');
    } else values['offer_id'] = row.offer_id;
    for (const field of fields)
      if (values[field] == null || values[field] === '' || values[field] === '—')
        values[field] = '__empty__';
    return values;
  });
  const matching = (exclude?: string) => {
    const schema: FilterSchema<Entity> = {},
      values: FilterValues<Entity> = {};
    for (const [field, rule] of Object.entries(rules)) {
      if (field === exclude) continue;
      if (rule.values != null) {
        const selected = new Set(rule.values);
        schema[field + ':values'] = {
          path: field,
          predicate: (ctx) => selected.has(String(ctx.entityValue)),
        };
        values[field + ':values'] = 'active';
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
        values[field + ':' + bound] = rule[bound].trim().replace(',', '.');
      }
    }

    return applyFilter(projected, schema, values);
  };
  const items = matching().map((row) => data.items[Number(row['index'])]);

  const column_values = Object.fromEntries(
    fields.map((field) => [
      field,
      [...new Set(matching(field).map((row) => String(row[field])))].sort((a, b) =>
        a.localeCompare(b, 'ru', { numeric: true }),
      ),
    ]),
  );

  return {
    ...data,
    items,
    column_values,
    meta: { ...data.meta },
  };
}
