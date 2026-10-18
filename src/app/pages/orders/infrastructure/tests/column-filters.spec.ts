import { applyOperationalColumns } from '../utils/operational-columns.utils';
import type { ListPage, Order, ReturnRow } from '../interfaces/contracts.interfaces';

const order = (id: string, scheme: string, status: string): Order => ({
  posting_number: id,
  scheme,
  status,
  in_process_at: '2026-10-17T11:41:00',
  shipment_date: null,
  delivering_date: null,
  total_price: null,
  currency: 'RUB',
  items: [{ sku: 1, offer_id: 'ART-1', name: 'Комплект, белый', quantity: 2, price: 100 }],
  updated_at: '2026-10-17T11:41:00',
});
const page = (items: ListPage['items']): ListPage => ({
  items,
  meta: { total: items.length, page: 1, page_size: items.length, has_more: false },
  summary: { total: 100, current: 3 },
  statuses: [],
  snapshot_at: 'snapshot',
  available_label_ids: ['ready'],
});

describe('Operational columns over all loaded pages', () => {
  const rows = [
    order('pending', 'fbs', 'awaiting_packaging'),
    order('remote', 'rfbs', 'delivering'),
    order('ready', 'fbs', 'awaiting_delivering'),
  ];

  it('uses the displayed scheme and preserves server eligibility for hidden selections', () => {
    const result = applyOperationalColumns(
      page(rows),
      'orders',
      JSON.stringify({ scheme: { text: 'realFBS' } }),
    );
    expect(result.items.map((r) => r.posting_number)).toEqual(['remote']);
    expect(result.meta.total).toBe(1);
    expect(result.available_label_ids).toEqual(['ready']);
    expect(result.summary).toEqual({ total: 100, current: 3 });
    expect(result.column_values?.['scheme']).toEqual(['FBS', 'realFBS']);
  });

  it('uses Russian statuses and the displayed item composition without changing rows', () => {
    const result = applyOperationalColumns(
      page(rows),
      'orders',
      JSON.stringify({
        status: { text: 'Ожидает упаковки' },
        items: { text: 'ART-1' },
      }),
    );
    expect(result.items).toEqual([rows[0]]);
    expect(result.items[0]).toBe(rows[0]);
    expect(result.column_values?.['status']).toContain('Ожидает отгрузки');
  });

  it('distinguishes no selected values, no restriction, zero and missing amounts', () => {
    const priced = { ...rows[0], posting_number: 'zero', total_price: 0 };
    expect(
      applyOperationalColumns(page([rows[0], priced]), 'orders', '{"amount":{"min":"0"}}').items,
    ).toEqual([priced]);
    expect(applyOperationalColumns(page(rows), 'orders', '{"scheme":{"values":[]}}').items).toEqual(
      [],
    );
    expect(
      applyOperationalColumns(page(rows), 'orders', '{"scheme":{"values":null}}').items,
    ).toEqual(rows);
    expect(
      applyOperationalColumns(page(rows), 'orders', '{"amount":{"values":["__empty__"]}}').items,
    ).toEqual(rows);
  });

  it('filters returns with decimal commas and preserves their contracts', () => {
    const row: ReturnRow = {
      return_id: 1,
      posting_number: 'return',
      scheme: 'fbo',
      sku: 1,
      offer_id: 'ART-1',
      returns_amount: '12.50',
      currency: 'RUB',
      returned_at: '2026-10-17T00:00:00',
      status: 'ReturnedToSeller',
    };
    const result = applyOperationalColumns(
      page([row]),
      'returns',
      '{"amount":{"min":"12,5","max":"13"},"status":{"text":"Возвращён продавцу"}}',
    );
    expect(result.items).toEqual([row]);
    expect(result.column_values?.['amount']).toEqual(['12.5']);
  });

  it('rejects invalid URL rules instead of ignoring them', () => {
    for (const raw of [
      '{',
      '{"secret":{}}',
      '{"amount":{"min":"NaN"}}',
      '{"amount":{"min":"20","max":"10"}}',
    ])
      expect(() => applyOperationalColumns(page(rows), 'orders', raw)).toThrow();
  });
});
