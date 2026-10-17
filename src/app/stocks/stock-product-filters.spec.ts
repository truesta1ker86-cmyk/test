import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { StockProductFilters } from './stock-product-filters';
import { StockChoiceFilter } from './stock-choice';

describe('Stock filters drawer from v1', () => {
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
  function setup() {
    const fixture = TestBed.createComponent(StockProductFilters);
    fixture.componentRef.setInput('choices', {
      brand: [
        { value: 'a', label: 'Docke' },
        { value: 'b', label: 'Grand Line' },
      ],
    });
    fixture.componentRef.setInput('values', { brand: ['a'] });
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }
  it('contains the v1 classification fields and a working multiple-choice control', () => {
    const { fixture, component } = setup();
    const changed = vi.fn();
    component.filterChanged.subscribe(changed);
    component.opened.set(true);
    fixture.detectChanges();
    const fields = fixture.debugElement
      .queryAll(By.directive(StockChoiceFilter))
      .map((node) => node.componentInstance as StockChoiceFilter);
    expect(fields.map((field) => field.label())).toEqual(
      expect.arrayContaining([
        'Категория маркетплейса',
        'Тип маркетплейса',
        'Категория в отчёте',
        'Тип в отчёте',
        'Тип Фин',
        'Бренд',
        'Упаковка',
        'Наличие правил',
      ]),
    );
    const brand = fields.find((field) => field.label() === 'Бренд')!;
    brand.open();
    brand.toggle('a', false);
    brand.toggle('b', true);
    brand.apply();
    expect(changed).toHaveBeenCalledWith({ key: 'brand', values: ['b'] });
    expect(component.opened()).toBe(true);
  });
  it('keeps reset and product selection separate, and blocks selection while loading', () => {
    const { fixture, component } = setup();
    const select = vi.fn(),
      reset = vi.fn(),
      clear = vi.fn();
    component.selectFound.subscribe(select);
    component.filtersReset.subscribe(reset);
    component.clearSelection.subscribe(clear);
    fixture.componentRef.setInput('busy', true);
    component.selectProducts();
    expect(select).not.toHaveBeenCalled();
    fixture.componentRef.setInput('busy', false);
    component.opened.set(true);
    component.selectProducts();
    expect(select).toHaveBeenCalledOnce();
    expect(component.opened()).toBe(false);
    expect(reset).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
  });
  it('counts active fields without counting each selected value as another filter', () => {
    const { fixture, component } = setup();
    fixture.componentRef.setInput('values', { brand: ['a', 'b'], fin_type: ['Товар'] });
    fixture.componentRef.setInput('article', 'A-00');
    expect(component.activeCount()).toBe(3);
  });
});
