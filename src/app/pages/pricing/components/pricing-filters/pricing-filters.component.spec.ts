import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { Api } from '../../../../core/infrastructure/services/api.service';
import { FilterMultiselectComponent } from '../../../../shared/directives/filter-panel/components/filter-multiselect/filter-multiselect.component';
import { FilterSelectComponent } from '../../../../shared/directives/filter-panel/components/filter-select/filter-select.component';
import { PricingFiltersModule } from './pricing-filters.module';
import { PricingFilters } from './pricing-filters.component';
import { parsePricingQuery } from '../../infrastructure/utils/pricing-query.utils';

describe('Pricing filters through original controls and FilterService', () => {
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
  async function setup() {
    const saved = parsePricingQuery({ brand: '["Сохранённый бренд"]', ship_method: 'fbo' });
    TestBed.configureTestingModule({
      imports: [PricingFiltersModule],
      providers: [
        {
          provide: Api,
          useValue: {
            pricingViews: () =>
              of({ items: [{ id: 'saved', name: 'Отбор', query: saved, default: false }] }),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(PricingFilters);
    fixture.componentRef.setInput(
      'query',
      parsePricingQuery({
        brand: '["Docke"]',
        category: '["Водосток"]',
        results: 'failed',
        page_size: '500',
      }),
    );
    fixture.componentRef.setInput('facets', {
      brand: ['Docke', 'Другой бренд'],
      category: ['Водосток'],
      plan_ship_method: ['rfbs', 'fbs'],
      ship_method: ['fbo', 'fbs'],
    });
    fixture.componentInstance.open();
    await fixture.whenStable();
    const control = (key: string) =>
      fixture.debugElement
        .queryAll(By.directive(FilterMultiselectComponent))
        .map((n) => n.componentInstance as FilterMultiselectComponent)
        .find((c) => c.key === key)!;
    return { fixture, page: fixture.componentInstance, control };
  }
  it('keeps facets independent and preserves the two shipping schemes and result scope', async () => {
    const { fixture, page, control } = await setup();
    const applied = vi.fn();
    page.applied.subscribe(applied);
    (control('brand') as any).updateValue(['Другой бренд']);
    (control('plan_ship_method') as any).updateValue(['rfbs']);
    (control('ship_method') as any).updateValue(['fbo']);
    await fixture.whenStable();
    page.apply();
    expect(applied).toHaveBeenLastCalledWith(
      expect.objectContaining({
        brand: '["Другой бренд"]',
        category: '["Водосток"]',
        plan_ship_method: '["rfbs"]',
        ship_method: '["fbo"]',
        results: 'failed',
        page_size: 500,
        page: 1,
      }),
    );
    expect(fixture.nativeElement.querySelectorAll('app-stock-choice')).toHaveLength(0);
  });
  it('loads a saved query through the actual original select and resets its controls', async () => {
    const { fixture, page, control } = await setup();
    const saved = fixture.debugElement
      .queryAll(By.directive(FilterSelectComponent))
      .map((n) => n.componentInstance as FilterSelectComponent)
      .find((c) => c.key === 'viewId')!;
    (saved as any).updateValue('saved');
    await fixture.whenStable();
    expect(page.viewId).toBe('saved');
    expect(page.draft().brand).toBe('["Сохранённый бренд"]');
    expect(control('brand').value).toEqual(['Сохранённый бренд']);
    page.reset();
    await fixture.whenStable();
    expect(control('brand').value).toEqual([]);
    expect(page.value()).toMatchObject({ brand: '', results: 'failed', page_size: 500 });
  });
  it('blocks a reversed margin range without applying a query', async () => {
    const { page } = await setup();
    const applied = vi.fn();
    page.applied.subscribe(applied);
    page.set('margin_min', '20');
    page.set('margin_max', '10');
    page.apply();
    expect(applied).not.toHaveBeenCalled();
    expect(page.error()).toContain('превышать');
  });
  it('uses server choices and supplies the existing scheme values independently of refs', async () => {
    const { fixture, page, control } = await setup();
    fixture.componentRef.setInput('facets', {});
    fixture.componentRef.setInput('choices', {
      brand: [{ value: 'Docke', label: 'Бренд Docke', count: 2 }],
    });
    await fixture.whenStable();
    expect(control('brand').filterConfig?.options).toContainEqual(
      expect.objectContaining({ value: 'Docke', label: 'Бренд Docke' }),
    );
    expect(page.options('plan_ship_method').map((option) => option.value)).toEqual([
      'FBS',
      'FBO',
      'RFBS',
    ]);
    expect(page.options('ship_method').map((option) => option.value)).toEqual([
      'FBS',
      'FBO',
      'RFBS',
    ]);
  });
  it('keeps the server shipping values and labels without adding duplicate aliases', async () => {
    const { fixture, page } = await setup();
    const schemes = [
      { value: 'РФБС', label: 'РФБС' },
      { value: 'ПВЗ', label: 'ПВЗ' },
    ];
    fixture.componentRef.setInput('choices', { ship_method: schemes });
    await fixture.whenStable();
    expect(page.options('ship_method')).toEqual(schemes);
  });
});
