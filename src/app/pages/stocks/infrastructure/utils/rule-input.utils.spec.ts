import { normalizedRule } from './rule-input.utils';
import type { Rule } from '../interfaces/contracts.interfaces';

const rule: Rule = {
  offer_id: 'A',
  warehouse_id: 'W',
  share: '1500.1234567890123456789',
  quantum: 1,
  target_qty: 10,
  maintain_target: false,
  enabled: true,
};

describe('Stock rule input', () => {
  it('preserves exact large shares and clears the inactive fixed target', () => {
    expect(normalizedRule(rule).share).toBe(rule.share);
    expect(normalizedRule(rule).target_qty).toBeNull();
  });
  it('keeps a deliberate fixed zero and clears the inactive share', () => {
    expect(normalizedRule({ ...rule, maintain_target: true, target_qty: 0 })).toMatchObject({
      share: null,
      target_qty: 0,
      enabled: true,
    });
  });
  it('rejects invalid fields without imposing a percentage ceiling', () => {
    expect(() => normalizedRule({ ...rule, quantum: 1.5 })).toThrow();
    expect(() => normalizedRule({ ...rule, share: '-0.1' })).toThrow();
    expect(() => normalizedRule({ ...rule, share: '' })).toThrow();
    expect(normalizedRule({ ...rule, share: '150000' }).share).toBe('150000');
  });
});
