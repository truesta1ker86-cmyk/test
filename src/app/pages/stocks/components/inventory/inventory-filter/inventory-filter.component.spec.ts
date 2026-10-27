import { InventoryFilterModule } from './inventory-filter.module';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { InventoryFilterComponent } from './inventory-filter.component';
import { FilterMultiselectComponent } from '../../../../../shared/directives/filter-panel/components/filter-multiselect/filter-multiselect.component';
import { Select } from 'primeng/select';

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
    const fixture = TestBed.createComponent(InventoryFilterComponent);
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
      .queryAll(By.directive(FilterMultiselectComponent))
      .map((node) => node.componentInstance as FilterMultiselectComponent);
    expect(fields.map((field) => field.label)).toEqual(
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
    const brand = fields.find((field) => field.label === 'Бренд')!;
    (brand as any).updateValue(['b']);
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
  it('renders dropdowns outside the scrolling grid while keeping them inside the popup', () => {
    const { fixture, component } = setup();
    component.opened.set(true);
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('.stock-filter-panel');
    const grid = fixture.nativeElement.querySelector('.stock-filter-grid');
    const overlays = fixture.nativeElement.querySelector('.stock-filter-overlays');
    const selects = fixture.debugElement.queryAll(By.directive(Select));
    expect(selects.length).toBeGreaterThan(2);
    for (const select of selects) {
      expect(select.componentInstance.appendTo()).toBe(overlays);
    }
    expect(panel.contains(grid)).toBe(true);
    expect(grid.contains(panel)).toBe(false);
    expect(panel.contains(overlays)).toBe(true);
    expect(grid.contains(overlays)).toBe(false);
  });
});

beforeEach(() => TestBed.configureTestingModule({ imports: [InventoryFilterModule] }));
