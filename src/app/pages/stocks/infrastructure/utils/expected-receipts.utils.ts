export function expectedItems(
  offers: Set<string>,
  values: Record<string, number | null>,
  fallback: number,
  physical: Record<string, number> = {},
) {
  return [...offers]
    .filter((offer) => !(physical[offer] > 0))
    .map((offer_id) => {
      const expected_qty = Object.hasOwn(values, offer_id) ? values[offer_id] : fallback;
      if (expected_qty === null || !Number.isSafeInteger(expected_qty) || expected_qty < 1)
        throw new Error('Укажите целое ожидаемое количество от 1 для ' + offer_id + '.');
      return { offer_id, expected_qty };
    });
}
