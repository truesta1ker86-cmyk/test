import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { Api } from '../../../../core/infrastructure/services/api.service';
import { FilterMultiselectComponent } from '../../../../shared/directives/filter-panel/components/filter-multiselect/filter-multiselect.component';
import {
  parsePricingQuery,
  pricingScopeFilters,
} from '../../infrastructure/utils/pricing-query.utils';
import { PricingColumnFilterModule } from './pricing-column-filter.module';
import { PricingColumnFilter } from './pricing-column-filter.component';

describe('Pricing header using employer filter mechanisms', () => {
  const original = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
  beforeAll(() =>
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      },
    }),
  );
  afterAll(() =>
    original
      ? Object.defineProperty(HTMLDialogElement.prototype, 'showModal', original)
      : Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal'),
  );
  function setup(column_filters = '{}') {
    const response = new Subject<{ values: string[] }>();
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
    return { fixture, component: fixture.componentInstance, response, api, query, change };
  }
  it('requests the existing server scope without mixing plan and API shipping selectors', () => {
    const { component, api, query, response } = setup();
    const before = structuredClone(query);
    component.open();
    expect(api.pricingColumnValues).toHaveBeenCalledWith('price', pricingScopeFilters(query));
    expect(component.busy()).toBe(true);
    response.next({ values: ['10', '20'] });
    expect(component.busy()).toBe(false);
    expect(query).toEqual(before);
    expect([...component.selected()]).toEqual(['10', '20']);
    component.apply();
  });
  it('keeps previously selected values outside the current response while narrowing to search results', () => {
    const { component, response, change } = setup(
      JSON.stringify({
        price: { values: ['30'], text: '', operator: 'contains', min: '', max: '' },
      }),
    );
    component.open();
    response.next({ values: ['10', '20'] });
    expect(component.options()).toEqual(['10', '20', '30']);
    expect([...component.selected()]).toEqual(['30']);
    component.search = '20';
    component.selectFound();
    component.apply();
    expect(change.mock.lastCall![0].value.values).toEqual(['30', '20']);
  });
  it('blocks an empty subset instead of silently interpreting it as all prices', () => {
    const { component, response, change } = setup();
    component.open();
    response.next({ values: ['10', '20'] });
    component.toggleAll(false);
    component.apply();
    expect(change).not.toHaveBeenCalled();
    expect(component.error()).toContain('Все значения');
    component.toggleAll(true);
    component.apply();
    expect(change).toHaveBeenLastCalledWith({ field: 'price', value: null });
  });
  it('uses FilterService validation and preserves decimal bounds', () => {
    const { component, response, change } = setup();
    component.open();
    response.next({ values: [] });
    component.filters.updateFilter('min', '10,5');
    component.filters.updateFilter('max', '20');
    component.apply();
    expect(change.mock.lastCall![0].value.min).toBe('10.5');
    change.mockClear();
    component.open();
    component.filters.updateFilter('min', '50');
    component.filters.updateFilter('max', '20');
    component.apply();
    expect(change).not.toHaveBeenCalled();
    expect(component.error()).toContain('диапазон');
  });
  it('renders original controls and refreshes their options without losing a typed condition', async () => {
    const { fixture, component, response } = setup();
    component.open();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-filter-multiselect p-select')).not.toBeNull();
    component.filters.updateFilter('text', 'Введено во время загрузки');
    response.next({ values: ['10', '20'] });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-filter-text[key=text] input').value).toBe(
      'Введено во время загрузки',
    );
    const control = fixture.debugElement.query(By.directive(FilterMultiselectComponent))
      .componentInstance as FilterMultiselectComponent;
    expect(control.filterConfig?.options?.map((option) => option.value)).toEqual(['10', '20']);
    expect(component.all()).toBe(true);
    component.filters.updateFilter('values', ['20']);
    await fixture.whenStable();
    expect(component.all()).toBe(false);
    expect([...component.selected()]).toEqual(['20']);
  });
  it('cancels edits without publishing them and reset emits the existing null rule', () => {
    const { component, response, change } = setup();
    component.open();
    response.next({ values: ['10'] });
    component.filters.updateFilter('text', 'Черновик');
    component.opened.set(false);
    expect(change).not.toHaveBeenCalled();
    component.open();
    expect(component.filters.getValue('text')).toBe('');
    component.reset();
    expect(change).toHaveBeenLastCalledWith({ field: 'price', value: null });
  });
  it('keeps the all-values mode valid for an empty source response', () => {
    const { component, response, change } = setup();
    component.open();
    response.next({ values: [] });
    component.apply();
    expect(change).toHaveBeenLastCalledWith({ field: 'price', value: null });
  });
});
