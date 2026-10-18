import type { MatrixCell, Rule } from '../interfaces/contracts.interfaces';

export function decimal(raw: string | number): { digits: string; point: number } {
  const value = String(raw)
    .trim()
    .replace(/[\s\u00a0]/g, '')
    .replace(',', '.');
  const match = /^\+?(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(value);
  if (!match || !(match[1] + (match[2] || '')) || !Number.isFinite(Number(value)))
    throw new Error('Укажите неотрицательную долю.');
  return { digits: match[1] + (match[2] || ''), point: match[1].length + Number(match[3] || 0) };
}

export function shifted(raw: string | number, places: number): string {
  let { digits, point } = decimal(raw);
  point += places;
  if (point <= 0) digits = '0'.repeat(1 - point) + digits;
  if (point <= 0) point = 1;
  if (point >= digits.length) digits = digits.padEnd(point, '0');
  const whole = (digits.slice(0, point) || '0').replace(/^0+(?=\d)/, '');
  const fraction = digits.slice(point).replace(/0+$/, '');
  return whole + (fraction ? '.' + fraction : '');
}

export function percentageToShare(value: string | number): string {
  return shifted(value, -2);
}

export function shareToPercentage(value: string | number | null): string {
  return shifted(value ?? '1', 2);
}

export function changedCell(value: MatrixCell, saved: Rule | null): boolean {
  if (!saved) return true;
  return (
    value.enabled !== saved.enabled ||
    value.quantum !== saved.quantum ||
    value.maintain_target !== saved.maintain_target ||
    (value.maintain_target
      ? value.target_qty !== saved.target_qty
      : shifted(value.share ?? '1', 0) !== shifted(saved.share ?? '1', 0))
  );
}

export function putCell(drafts: MatrixCell[], value: MatrixCell, saved: Rule | null): MatrixCell[] {
  const remaining = drafts.filter(
    (row) => row.offer_id !== value.offer_id || row.warehouse_id !== value.warehouse_id,
  );
  return changedCell(value, saved) ? [...remaining, value] : remaining;
}

export function estimateCell(
  base: number | null,
  units: number,
  cell: MatrixCell | Rule | null,
): string | null {
  if (!cell) return null;
  if (!cell.enabled) return '0';
  if (cell.maintain_target) return String(cell.target_qty ?? 0);
  if (base === null || !Number.isSafeInteger(base)) return null;
  const share = decimal(cell.share ?? '1');
  let coefficient = BigInt(share.digits);
  let divisor = 1n;
  const scale = share.digits.length - share.point;
  if (scale >= 0) divisor = 10n ** BigInt(scale);
  else coefficient *= 10n ** BigInt(-scale);
  const quantum = BigInt(Math.max(1, cell.quantum || 1));
  const packages =
    (BigInt(Math.max(0, base)) * coefficient) / divisor / BigInt(Math.max(1, units || 1));
  return String((packages / quantum) * quantum);
}

export function shareFromQuantity(quantity: number, physical: number | null): string | null {
  if (physical === null || physical <= 0 || !Number.isSafeInteger(physical)) return null;
  const scale = 10n ** 24n;
  const numerator = BigInt(quantity) * scale,
    denominator = BigInt(physical);
  return shifted(((numerator + denominator - 1n) / denominator).toString() + 'e-24', 0);
}

export function targetFromPercent(
  percent: string | number,
  physical: number | null,
): number | null {
  if (physical === null || !Number.isSafeInteger(physical) || physical < 0) return null;
  const target = Number(
    estimateCell(physical, 1, {
      offer_id: '',
      warehouse_id: '',
      share: percentageToShare(percent),
      quantum: 1,
      enabled: true,
      maintain_target: false,
      target_qty: null,
    }),
  );
  if (!Number.isSafeInteger(target))
    throw new Error('Количество выходит за поддерживаемый числовой формат.');
  return target;
}

export function targetPercent(quantity: number, physical: number | null): string {
  if (physical === null || physical <= 0 || !Number.isSafeInteger(physical)) return '';
  const rounded = (BigInt(quantity) * 10000n + BigInt(physical) / 2n) / BigInt(physical);
  return shifted(rounded.toString() + 'e-2', 0);
}
