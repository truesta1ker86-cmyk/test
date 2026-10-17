import { Order, ReturnRow } from './contracts';
import { status } from './format';
export const completedStatuses = new Set(['delivered', 'cancelled', 'not_accepted']);
export const orderStatuses = [
  'awaiting_registration',
  'acceptance_in_progress',
  'awaiting_approve',
  'awaiting_packaging',
  'awaiting_delivering',
  'delivering',
  'driver_pickup',
  'arbitration',
  'client_arbitration',
  'delivered',
  'not_accepted',
  'cancelled',
];
export function canLabel(order: Order) {
  return (
    order.scheme?.toLowerCase() === 'fbs' &&
    ['awaiting_delivering', 'awaiting_deliver'].includes(order.status?.toLowerCase() || '')
  );
}
export function canPrepare(order: Order) {
  return (
    ['fbs', 'rfbs'].includes(order.scheme?.toLowerCase() || '') &&
    order.status?.toLowerCase() === 'awaiting_packaging'
  );
}
export function orderActionLabel(order: Order) {
  return order.scheme?.toLowerCase() === 'fbs' && canPrepare(order) ? 'Собрать заказ' : 'Подробнее';
}
/** The generated v1 table sorts locally, naturally, keeping empty values last. */
export function sortOperational(
  rows: (Order | ReturnRow)[],
  entity: 'orders' | 'returns',
  field: string,
  desc: boolean,
) {
  if (!field) return rows;
  const value = (row: Order | ReturnRow): string | number | null | undefined => {
    if (field === 'amount') {
      const raw =
        entity === 'orders' ? (row as Order).total_price : (row as ReturnRow).returns_amount;
      return raw == null || raw === '' || !Number.isFinite(Number(raw)) ? null : Number(raw);
    }
    if (field === 'date') {
      const raw =
        entity === 'orders'
          ? (row as Order).in_process_at || (row as Order).created_at
          : (row as ReturnRow).returned_at;
      if (!raw) return null;
      const parsed = new Date(/Z$|[+-]\d\d:\d\d$/.test(raw) ? raw : raw + 'Z');
      return !Number.isFinite(parsed.getTime())
        ? null
        : entity === 'orders'
          ? parsed.getTime()
          : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
    }
    if (field === 'status')
      return row.status ? status(row.status, entity === 'orders' ? row.scheme : null) : null;
    if (field === 'posting_number') return row.posting_number;
    if (field === 'offer_id') return (row as ReturnRow).offer_id;
    return null;
  };
  const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });
  return [...rows].sort((a, b) => {
    const x = value(a),
      y = value(b),
      empty = (v: unknown) => v == null || v === '' || v === '—';
    if (empty(x) !== empty(y)) return empty(x) ? 1 : -1;
    const result =
      typeof x === 'number' && typeof y === 'number'
        ? x - y
        : collator.compare(String(x ?? ''), String(y ?? ''));
    return desc ? -result : result;
  });
}
