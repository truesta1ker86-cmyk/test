import { expectedItems } from './expected-receipts';
describe('Expected quantities by product', () => {
  it('keeps individual quantities and uses the bulk value only for untouched rows', () => {
    expect(expectedItems(new Set(['A', 'B', 'C']), { A: 7, B: 12 }, 20)).toEqual([
      { offer_id: 'A', expected_qty: 7 },
      { offer_id: 'B', expected_qty: 12 },
      { offer_id: 'C', expected_qty: 20 },
    ]);
  });
  it('excludes stock that has already arrived in 1C', () => {
    expect(expectedItems(new Set(['A', 'B']), {}, 4, { A: 1, B: 0 })).toEqual([
      { offer_id: 'B', expected_qty: 4 },
    ]);
  });
  it('rejects empty, zero and fractional row quantities', () => {
    for (const value of [null, 0, 1.5])
      expect(() => expectedItems(new Set(['A']), { A: value }, 4)).toThrow();
  });
});
