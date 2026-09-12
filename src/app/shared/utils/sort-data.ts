export function sortData<T extends object>(
  data: readonly T[],
  key: keyof T | string,
  direction: 'asc' | 'desc' = 'asc',
): T[] {
  const factor = direction === 'asc' ? 1 : -1;
  const field = key as keyof T;

  return [...data].sort((a, b) => {
    const av = (a as Record<string, unknown>)[field as string];
    const bv = (b as Record<string, unknown>)[field as string];

    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;

    return String(av).localeCompare(String(bv), 'ru', { numeric: true }) * factor;
  });
}
