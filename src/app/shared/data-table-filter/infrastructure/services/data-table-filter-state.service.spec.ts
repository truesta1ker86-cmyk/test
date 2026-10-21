import { TestBed } from '@angular/core/testing';
import { FilterService } from '../../../directives/filter-panel/infrastructure/services/filter.service';
import { DataTableFilterState } from './data-table-filter-state.service';

describe('Shared table filter draft', () => {
  function setup() {
    TestBed.configureTestingModule({ providers: [FilterService, DataTableFilterState] });
    const state = TestBed.inject(DataTableFilterState);
    state.open(true);
    return state;
  }
  it('represents all except one without enumerating unloaded pages', () => {
    const state = setup();
    state.toggle('PAGE-2', false);
    expect(state.checked('PAGE-1')).toBe(true);
    expect(state.checked('PAGE-2')).toBe(false);
    expect(state.apply(['PAGE-1', 'PAGE-2'], false, true)).toEqual({
      values: null,
      excluded_values: ['PAGE-2'],
      text: '',
      operator: 'contains',
      min: '',
      max: '',
    });
    state.toggle('PAGE-2', true);
    expect(state.apply([], false, true)).toBeNull();
  });
  it('keeps no values distinct from reset and preserves selection across pages', () => {
    const state = setup();
    state.all(false);
    expect(state.apply([], false, true)?.values).toEqual([]);
    state.toggle('FIRST', true);
    state.selectFound(['SECOND']);
    expect(state.apply(['SECOND'], false, true)?.values).toEqual(['FIRST', 'SECOND']);
    state.all(true);
    expect(state.apply([], false, true)).toBeNull();
  });
  it('copies the committed rule, validates bounds and restores it when reopened', () => {
    const state = setup();
    const rule = {
      values: ['A'],
      text: 'saved',
      operator: 'not_contains' as const,
      min: '',
      max: '',
    };
    state.open(true, rule);
    state.filters.updateFilters({ text: 'draft', min: '10,5', max: '20' });
    expect(state.apply(['A', 'B'], true, true)?.min).toBe('10.5');
    expect(rule.text).toBe('saved');
    state.filters.updateFilter('max', '2');
    expect(state.apply([], true, true)).toBeUndefined();
    state.open(true, rule);
    expect(state.filters.getValue('text')).toBe('saved');
  });
  it('preserves the intersection of an explicit selection and exclusions', () => {
    const state = setup();
    state.open(false, {
      values: ['A', 'B'],
      excluded_values: ['B'],
      text: '',
      operator: 'contains',
      min: '',
      max: '',
    });
    expect(state.checked('A')).toBe(true);
    expect(state.checked('B')).toBe(false);
    expect(state.apply(['A', 'B'], true, true)?.values).toEqual(['A']);
  });
});
