import { TestBed } from '@angular/core/testing';
import { FilterService } from './filter.service';
import { FilterConfig } from '../interfaces/filter.interfaces';

describe('Employer FilterService with v1 selections', () => {
  function setup(configs: FilterConfig[]) {
    TestBed.configureTestingModule({ providers: [FilterService] });
    const service = TestBed.inject(FilterService);
    service.setConfigs(configs);
    return service;
  }
  it('preserves an empty selection and resets a filter without a default', () => {
    const service = setup([{ key: 'values', label: 'Значения', type: 'multiselect', order: 0 }]);
    service.updateFilter('values', []);
    expect(service.validValues()).toEqual({ values: [] });
    service.resetFilter('values');
    expect(service.validValues()).toEqual({});
  });
  it('uses the same dependency condition for disabling and updates', () => {
    const service = setup([
      { key: 'scheme', label: 'Схема', type: 'select', order: 0, defaultValue: 'FBO' },
      {
        key: 'warehouse',
        label: 'Склад',
        type: 'select',
        order: 1,
        dependsOn: 'scheme',
        dependsOnValue: 'FBS',
      },
    ]);
    expect(service.isDisabled('warehouse')).toBe(true);
    service.updateFilter('warehouse', 'A');
    expect(service.getValue('warehouse')).toBeUndefined();
    service.updateFilter('scheme', 'FBS');
    expect(service.isDisabled('warehouse')).toBe(false);
    service.updateFilter('warehouse', 'A');
    expect(service.validValues()['warehouse']).toBe('A');
    service.updateFilter('scheme', 'FBO');
    expect(service.validValues()['warehouse']).toBeUndefined();
  });
  it('retains groups, validation and caller configuration order', () => {
    const configs: FilterConfig[] = [
      {
        key: 'max',
        label: 'До',
        type: 'text',
        order: 2,
        group: 'price',
        validation: (v) => Number(v) >= 0,
      },
      { key: 'min', label: 'От', type: 'text', order: 1, group: 'price' },
    ];
    const service = setup(configs);
    expect(configs[0].key).toBe('max');
    expect(service.groupedConfigs()['price'].map((c) => c.key)).toEqual(['min', 'max']);
    service.updateFilter('max', '-1');
    expect(service.validValues()).toEqual({});
    expect(service.getError('max')).toBe('Некорректное значение');
  });
});
