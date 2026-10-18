import { TestBed } from '@angular/core/testing';
import { MappingCandidate } from './interfaces/mapping-logic.interfaces';
import { MappingDrafts } from '../components/mapping-workspace/infrastructure/services/mapping-drafts.service';
import {
  mappingIdentity,
  mappingUnits,
  inferMappingUnits,
  parseMappingPaste,
} from './utils/mapping-logic.utils';

describe('v1 mapping rules', () => {
  const candidates = [
    { onec_code: '001', sku_1c: 'SHARED' },
    { onec_code: '002', sku_1c: 'SHARED' },
    { onec_code: '003', sku_1c: 'UNIQUE' },
  ] as MappingCandidate[];
  it('requires exact codes for duplicate articles and code/article collisions', () => {
    expect(() => mappingIdentity('SHARED', candidates)).toThrow();
    expect(mappingIdentity('002', candidates)).toBe('002');
    expect(() =>
      mappingIdentity('003', [
        ...candidates,
        { onec_code: '004', sku_1c: '003' } as MappingCandidate,
      ]),
    ).toThrow();
    expect(mappingIdentity('MISSING', candidates, 'MISSING')).toBe('MISSING');
    expect(() => mappingIdentity('UNKNOWN', candidates)).toThrow();
  });
  it('recognizes last name quantity and rFBS suffix, rejects conflicts and missing units', () => {
    expect(inferMappingUnits('Комплект 3 шт. + пакет 50 шт.', 'X', 'SKU')).toBe(50);
    expect(inferMappingUnits('Саморез', 'SKU-50rFBS', 'SKU')).toBe(50);
    expect(() => inferMappingUnits('50 шт.', 'SKU-20', 'SKU')).toThrow(/Конфликт/);
    expect(() => inferMappingUnits('Желоб 3 м', 'SKU', 'SKU')).toThrow(/не найдено/);
  });
  it('parses header, tabs, explicit clearing and omitted quantities without silent duplicates', () => {
    expect(parseMappingPaste('offer_id; sku_1c; quant\nA; 001; 50\nB\t\t')).toEqual([
      { offer_id: 'A', identity: '001', units: 50 },
      { offer_id: 'B', identity: '', units: null },
    ]);
    expect(() => parseMappingPaste('A;001;1\nA;002;2')).toThrow();
    expect(() => parseMappingPaste('A;001;1.5')).toThrow();
  });
  it('keeps original bounds for physical unit counts', () => {
    expect(mappingUnits('1000000')).toBe(1000000);
    for (const v of ['0', '-1', '1.5', '1000001', 'NaN', ''])
      expect(() => mappingUnits(v)).toThrow();
  });
  it('isolates unsaved drafts per shop', () => {
    TestBed.configureTestingModule({ providers: [MappingDrafts] });
    const store = TestBed.inject(MappingDrafts);
    store.scope(4).set(new Map([['A', {} as never]]));
    expect(store.scope(5)().size).toBe(0);
    expect(store.scope(4)().size).toBe(1);
  });
});
