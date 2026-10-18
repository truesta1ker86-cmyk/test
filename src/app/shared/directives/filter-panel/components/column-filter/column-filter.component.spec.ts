import { ColumnFilterModule } from './column-filter.module';
import { TestBed } from '@angular/core/testing';
import { ColumnFilterComponent, parseColumnRules } from '../../filter-panel';

describe('Financial column selection', () => {
  const originalShowModal = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'showModal',
  );
  beforeAll(() =>
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      },
    }),
  );
  afterAll(() =>
    originalShowModal
      ? Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal)
      : Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal'),
  );

  function setup() {
    const fixture = TestBed.createComponent(ColumnFilterComponent);
    fixture.componentRef.setInput('field', 'cost');
    fixture.componentRef.setInput('label', 'Себестоимость');
    fixture.componentRef.setInput('options', ['100', '300']);
    const change = vi.fn();
    fixture.componentInstance.changed.subscribe(change);
    return { component: fixture.componentInstance, change };
  }
  it('distinguishes choosing no values from removing the filter', () => {
    const { component, change } = setup();
    component.open();
    component.filters.updateFilter('values', []);
    component.apply();
    expect(change).toHaveBeenLastCalledWith({
      field: 'cost',
      rule: { values: [], text: '', operator: 'contains', min: '', max: '' },
    });
    component.open();
    component.filters.updateFilter('values', component.allValues());
    component.apply();
    expect(change).toHaveBeenLastCalledWith({ field: 'cost', rule: null });
  });
  it('normalizes decimal bounds and blocks a reversed range', () => {
    const { component, change } = setup();
    component.open();
    component.filters.updateFilter('min', ' 10,5 ');
    component.filters.updateFilter('max', '20');
    component.apply();
    expect(change.mock.calls[0][0].rule.min).toBe('10.5');
    change.mockClear();
    component.open();
    component.filters.updateFilter('min', '50');
    component.filters.updateFilter('max', '20');
    component.apply();
    expect(change).not.toHaveBeenCalled();
    expect(component.error()).toContain('диапазон');
  });
  it('keeps a malformed URL from crashing the table', () => {
    expect(parseColumnRules('{')).toEqual({});
    expect(parseColumnRules('null')).toEqual({});
  });
  it('updates the original rendered controls with OnPush and keeps header state local', async () => {
    const fixture = TestBed.createComponent(ColumnFilterComponent);
    fixture.componentRef.setInput('field', 'name');
    fixture.componentRef.setInput('label', 'Номенклатура');
    fixture.componentRef.setInput('options', ['Товар A', 'Товар B']);
    const component = fixture.componentInstance;
    component.open();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-filter-multiselect p-select')).not.toBeNull();
    component.filters.updateFilter('text', 'Товар A');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-filter-text input').value).toBe('Товар A');
    const second = TestBed.createComponent(ColumnFilterComponent);
    second.componentRef.setInput('field', 'name');
    second.componentRef.setInput('label', 'Номенклатура');
    second.componentInstance.open();
    expect(second.componentInstance.filters).not.toBe(component.filters);
    expect(second.componentInstance.filters.getValue('text')).toBe('');
    second.destroy();
    fixture.destroy();
  });
  it('shows all values checked for an unrestricted filter without treating an empty option list as a restriction', () => {
    const { component, change } = setup();
    component.open();
    expect(component.filters.getValue('values')).toEqual(['100', '300']);
    component.apply();
    expect(change).toHaveBeenLastCalledWith({ field: 'cost', rule: null });
    const empty = TestBed.createComponent(ColumnFilterComponent);
    empty.componentRef.setInput('field', 'name');
    empty.componentRef.setInput('label', 'Номенклатура');
    const output = vi.fn();
    empty.componentInstance.changed.subscribe(output);
    empty.componentInstance.open();
    empty.componentInstance.filters.updateFilter('text', 'Товар');
    empty.componentInstance.apply();
    expect(output.mock.lastCall![0].rule).toEqual({
      values: null,
      text: 'Товар',
      operator: 'contains',
      min: '',
      max: '',
    });
  });
  it('uses the default text operator if the optional select is cleared', () => {
    const { component, change } = setup();
    component.open();
    component.filters.updateFilter('operator', null);
    component.filters.updateFilter('text', '100');
    component.apply();
    expect(change.mock.lastCall![0].rule.operator).toBe('contains');
  });
});

beforeEach(() => TestBed.configureTestingModule({ imports: [ColumnFilterModule] }));
