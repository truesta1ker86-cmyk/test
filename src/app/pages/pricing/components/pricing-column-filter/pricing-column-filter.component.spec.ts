import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { Api } from '../../../../core/infrastructure/services/api.service';
import { DataTableFilterComponent } from '../../../../shared/data-table-filter/components/data-table-filter/data-table-filter.component';
import {
  parsePricingQuery,
  pricingScopeFilters,
} from '../../infrastructure/utils/pricing-query.utils';
import { PricingColumnFilterModule } from './pricing-column-filter.module';
import { PricingColumnFilter } from './pricing-column-filter.component';

describe('Pricing adapter for the shared table filter', () => {
  const original = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
  beforeAll(() =>
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value() {
        this.open = true;
      },
    }),
  );
  afterAll(() =>
    original
      ? Object.defineProperty(HTMLDialogElement.prototype, 'showModal', original)
      : Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal'),
  );
  function setup(column_filters = '{}') {
    const response = new Subject<{ values: string[]; counts?: Record<string, number> }>();
    const api = { pricingColumnValues: vi.fn(() => response) };
    TestBed.configureTestingModule({
      imports: [PricingColumnFilterModule],
      providers: [{ provide: Api, useValue: api }],
    });
    const fixture = TestBed.createComponent(PricingColumnFilter);
    fixture.componentRef.setInput('field', 'price');
    fixture.componentRef.setInput('label', 'Цена');
    fixture.componentRef.setInput('numeric', true);
    const query = parsePricingQuery({
      column_filters,
      plan_ship_method: 'rfbs',
      ship_method: 'fbo',
      brand: 'Docke',
    });
    fixture.componentRef.setInput('query', query);
    const change = vi.fn();
    fixture.componentInstance.changed.subscribe(change);
    fixture.detectChanges();
    const component = fixture.debugElement.query(By.directive(DataTableFilterComponent))
      .componentInstance as DataTableFilterComponent;
    return { fixture, component, response, api, query, change };
  }
  it('uses the original server scope without changing plan and API shipping selectors', async () => {
    const { fixture, component, response, api, query } = setup();
    const before = structuredClone(query);
    component.open();
    await fixture.whenStable();
    expect(api.pricingColumnValues).toHaveBeenCalledWith('price', pricingScopeFilters(query));
    expect(component.optionsBusy()).toBe(true);
    response.next({ values: ['10', '20'] });
    await fixture.whenStable();
    expect(component.optionsBusy()).toBe(false);
    expect(query).toEqual(before);
    expect(component.state.checked('10')).toBe(true);
  });
  it('keeps choices outside the response while adding all found values', async () => {
    const { fixture, component, response, change } = setup(
      JSON.stringify({
        price: { values: ['30'], text: '', operator: 'contains', min: '', max: '' },
      }),
    );
    component.open();
    response.next({ values: ['10', '20'] });
    await fixture.whenStable();
    expect(component.allValues()).toEqual(['10', '20', '30']);
    component.filters.updateFilter('choice_search', '20');
    component.selectFound();
    component.apply();
    expect(change.mock.lastCall![0].value.values).toEqual(['30', '20']);
  });
  it('blocks an empty subset rather than silently widening it to every price', async () => {
    const { fixture, component, response, change } = setup();
    component.open();
    response.next({ values: ['10', '20'] });
    await fixture.whenStable();
    component.state.all(false);
    component.apply();
    expect(change).not.toHaveBeenCalled();
    expect(component.error()).toContain('Все значения');
    component.state.all(true);
    component.apply();
    expect(change).toHaveBeenLastCalledWith({ field: 'price', value: null });
  });
  it('keeps exclusion and numeric bounds in the existing pricing API contract', async () => {
    const { fixture, component, response, change } = setup();
    component.open();
    response.next({ values: ['10', '20'] });
    await fixture.whenStable();
    component.state.toggle('10', false);
    component.filters.updateFilter('min', '10,5');
    component.filters.updateFilter('max', '20');
    component.apply();
    expect(change.mock.lastCall![0].value).toEqual({
      values: [],
      excluded_values: ['10'],
      text: '',
      operator: 'contains',
      min: '10.5',
      max: '20',
    });
    component.open();
    response.next({ values: ['10', '20'] });
    await fixture.whenStable();
    component.filters.updateFilter('min', '50');
    component.filters.updateFilter('max', '20');
    component.apply();
    expect(component.error()).toContain('диапазон');
  });
  it('updates visible shared controls without losing a condition typed during loading', async () => {
    const { fixture, component, response } = setup();
    component.open();
    await fixture.whenStable();
    component.filters.updateFilter('text', 'Условие');
    response.next({ values: ['10', '20'], counts: { '10': 2, '20': 1 } });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-filter-text[key=text] input').value).toBe(
      'Условие',
    );
    expect(fixture.nativeElement.querySelectorAll('.values-list input').length).toBe(3);
    expect(fixture.nativeElement.querySelector('app-filter-multiselect')).toBeNull();
    expect(fixture.nativeElement.querySelector('.values-list').textContent).toContain('(2)');
  });
  it('cancels edits and late requests, and reset emits the original null rule', async () => {
    const { fixture, component, response, change } = setup();
    component.open();
    component.filters.updateFilter('text', 'Черновик');
    component.close();
    response.next({ values: ['STALE'] });
    await fixture.whenStable();
    expect(change).not.toHaveBeenCalled();
    component.open();
    response.next({ values: ['10'] });
    await fixture.whenStable();
    expect(component.filters.getValue('text')).toBe('');
    component.reset();
    expect(change).toHaveBeenLastCalledWith({ field: 'price', value: null });
  });
  it('keeps all-values mode valid for an empty source', async () => {
    const { fixture, component, response, change } = setup();
    component.open();
    response.next({ values: [] });
    await fixture.whenStable();
    component.apply();
    expect(change).toHaveBeenLastCalledWith({ field: 'price', value: null });
  });
});
