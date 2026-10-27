export function periodDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

export function periodIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function periodCaption(start: string, end: string): string {
  const format = (value: string) => value.split('-').reverse().join('.');
  return start && end ? `Период: ${format(start)} – ${format(end)}` : 'Выберите период';
}

export function moscowToday(): Date {
  const value = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return periodDate(value)!;
}

export function recentDays(days: number, today: Date): [Date, Date] {
  const end = new Date(today);
  const start = new Date(today);
  start.setDate(start.getDate() - days + 1);
  return [start, end];
}

export function recentMonth(offset: number, today: Date): [Date, Date] {
  const start = new Date(today.getFullYear(), today.getMonth() - offset, 1, 12);
  const last = new Date(start.getFullYear(), start.getMonth() + 1, 0, 12);
  return [start, last > today ? new Date(today) : last];
}

export function periodCursor(start: Date, today: Date): Date {
  const current =
    start.getFullYear() === today.getFullYear() && start.getMonth() === today.getMonth();
  return new Date(start.getFullYear(), start.getMonth() - Number(current), 1, 12);
}
