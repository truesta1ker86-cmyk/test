import type { CatalogRow } from '../../../products/infrastructure/interfaces/contracts.interfaces';
import { MappingCandidate, MappingDraft } from '../interfaces/mapping-logic.interfaces';

export function rowDraft(row: CatalogRow): MappingDraft {
  const identity = row.onec_code || row.sku_1c || '';
  return {
    offer_id: row.offer_id,
    identity,
    units: String(row.units_per_item || 1),
    originalIdentity: identity,
    originalUnits: row.units_per_item || 1,
    expected_version: row.version || '',
    name: row.name || row.offer_id,
  };
}

export function mappingUnits(raw: string): number {
  const value = Number(raw.replace(',', '.'));
  if (!Number.isInteger(value) || value < 1 || value > 1000000)
    throw new Error('Укажите целое количество от 1 до 1 000 000.');
  return value;
}

export function mappingIdentity(
  raw: string,
  candidates: MappingCandidate[],
  original = '',
  explicitCode?: string,
): string {
  const value = raw.trim();
  if (!value) return '';
  if (explicitCode === value && candidates.some((c) => c.onec_code === explicitCode))
    return explicitCode;
  const matches = candidates.filter((c) => c.onec_code === value || c.sku_1c === value);
  if (matches.length > 1) throw new Error('Несколько товаров с таким артикулом. Выберите код 1С.');
  if (matches.length === 1) return matches[0].onec_code || matches[0].sku_1c;
  if (value === original) return value;
  throw new Error('Значение не найдено в локальном снимке 1С. Выберите точный товар.');
}

export function inferMappingUnits(name: string, offer: string, identity: string): number {
  const matches = [...name.matchAll(/(\d{1,6})\s*шт\.?/giu)];
  const byName = matches.length ? Number(matches[matches.length - 1][1]) : 0;
  const escaped = identity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const byOffer =
    identity && identity !== offer
      ? Number(offer.match(new RegExp(`^${escaped}-(\\d{1,6})(?:rFBS)?$`, 'i'))?.[1] || 0)
      : 0;
  if (byName && byOffer && byName !== byOffer)
    throw new Error(`Конфликт: в названии ${byName} шт., в артикуле ${byOffer} шт.`);
  if (!byName && !byOffer)
    throw new Error('Количество не найдено в названии или суффиксе артикула.');
  return byName || byOffer;
}

export function parseMappingPaste(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((v) => v.replace(/^[ \r]+|[ \r]+$/g, ''))
    .filter((v) => v.trim().length > 0);
  if (!lines.length || lines.length > 5000) throw new Error('Вставьте от 1 до 5000 строк.');
  const seen = new Set<string>();
  return lines.flatMap((line, i) => {
    const parts = line.split(line.includes('\t') ? '\t' : ';').map((v) => v.trim());
    const offer_id = parts[0];
    if (!i && ['offer_id', 'артикул', 'артикул ozon'].includes(offer_id.toLowerCase())) return [];
    if (!offer_id || parts.length < 2 || parts.length > 3)
      throw new Error(
        `Строка ${i + 1}: нужны артикул Ozon, код / артикул 1С и необязательный квант.`,
      );
    if (seen.has(offer_id)) throw new Error(`Строка ${i + 1}: артикул ${offer_id} повторяется.`);
    seen.add(offer_id);
    return [{ offer_id, identity: parts[1], units: parts[2] ? mappingUnits(parts[2]) : null }];
  });
}
