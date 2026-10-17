import {
  percentageToShare,
  shareToPercentage,
  changedCell,
  putCell,
  estimateCell,
} from './matrix-state';
import type { MatrixCell, Rule } from './contracts';

describe('Stock matrix changes', () => {
  const saved: Rule = {
    id: 1,
    offer_id: 'A',
    warehouse_id: 'W',
    share: '0.5',
    quantum: 1,
    enabled: true,
    maintain_target: false,
    target_qty: null,
  };
  it('preserves decimal percentages without binary arithmetic', () => {
    expect(percentageToShare('150,125')).toBe('1.50125');
    expect(shareToPercentage('0.3333')).toBe('33.33');
    expect(percentageToShare('0')).toBe('0');
    expect(() => percentageToShare('-1')).toThrow();
  });
  it('removes the draft when a cell is returned to its saved state', () => {
    const changed = { ...saved, share: '0.8' } as MatrixCell;
    const edits = putCell([], changed, saved);
    expect(edits).toHaveLength(1);
    expect(putCell(edits, { ...changed, share: '0.5000' }, saved)).toEqual([]);
  });
  it('treats zero percent as a saved rule, and leaves other pairs intact', () => {
    const other = { ...saved, warehouse_id: 'W2', share: '1' } as MatrixCell;
    const zero = { ...saved, share: '0' } as MatrixCell;
    expect(changedCell(zero, null)).toBe(true);
    expect(putCell([other], zero, saved).map((c) => c.warehouse_id)).toEqual(['W2', 'W']);
  });
  it('distinguishes fixed quantity, disabled rules and rounding', () => {
    expect(changedCell({ ...saved, enabled: false } as MatrixCell, saved)).toBe(true);
    expect(changedCell({ ...saved, quantum: 3 } as MatrixCell, saved)).toBe(true);
    expect(
      changedCell(
        { ...saved, maintain_target: true, target_qty: 0, share: null } as MatrixCell,
        saved,
      ),
    ).toBe(true);
  });
  it('estimates in base units before pack and output rounding, matching C++', () => {
    expect(estimateCell(31, 2, { ...saved, quantum: 3 })).toBe('6');
    expect(estimateCell(null, 2, saved)).toBeNull();
    expect(estimateCell(null, 2, { ...saved, enabled: false })).toBe('0');
    expect(
      estimateCell(31, 2, { ...saved, maintain_target: true, target_qty: 17, quantum: 4 }),
    ).toBe('17');
    expect(estimateCell(31, 1, { ...saved, share: '1.5' })).toBe('46');
  });
});
