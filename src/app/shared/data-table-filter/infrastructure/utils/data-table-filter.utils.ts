export function filterSearch(value: string): string {
  return value.trim().toLocaleLowerCase('ru').replaceAll('ё', 'е');
}

export function filterValueLabel(value: string): string {
  return value === '__empty__' ? '(Пусто / нет данных)' : value;
}

export function filterPosition(
  anchor: DOMRect,
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  const left = Math.max(12, Math.min(anchor.right - width, viewportWidth - width - 12));
  const below = anchor.bottom + 6;
  const top = below + height <= viewportHeight - 12 ? below : Math.max(12, anchor.top - height - 6);
  return { left, top };
}
