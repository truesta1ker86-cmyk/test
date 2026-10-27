import {
  periodCaption,
  periodDate,
  periodIso,
  recentDays,
  recentMonth,
} from './period-picker.utils';

describe('Period calendar date boundaries', () => {
  const today = new Date(2026, 9, 27, 12);
  it('counts presets inclusively and serializes local dates without UTC shifting', () => {
    expect(recentDays(7, today).map(periodIso)).toEqual(['2026-10-21', '2026-10-27']);
    expect(recentDays(30, today).map(periodIso)).toEqual(['2026-09-28', '2026-10-27']);
  });
  it('selects completed months and caps the current month at today', () => {
    expect(recentMonth(0, today).map(periodIso)).toEqual(['2026-10-01', '2026-10-27']);
    expect(recentMonth(1, today).map(periodIso)).toEqual(['2026-09-01', '2026-09-30']);
  });
  it('rejects invalid calendar dates and displays the V1 date caption', () => {
    expect(periodDate('2026-02-30')).toBeNull();
    expect(periodCaption('2026-09-28', '2026-10-27')).toBe('Период: 28.09.2026 – 27.10.2026');
  });
});
