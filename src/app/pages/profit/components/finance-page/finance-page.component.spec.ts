import { FinancePageModule } from './finance-page.module';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { FilterTextComponent } from '../../../../shared/directives/filter-panel/components/filter-text/filter-text.component';
import { FilterDateComponent } from '../../../../shared/directives/filter-panel/components/filter-date/filter-date.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EMPTY } from 'rxjs';
import { FinancePage } from './finance-page.component';
import { validFinanceDates } from './infrastructure/utils/finance-page.utils';

describe('Financial view adapters', () => {
  it('cascades report metadata through original selectors and retains parent alternatives', () => {
    const page = setup('profit', {
      items: [],
      _filter_products: [
        { offer_id: 'A', name: 'A', category: 'C1', product_type: 'T1', brand: 'B' },
        { offer_id: 'B', name: 'B', category: 'C2', product_type: 'T2', brand: 'B' },
        { offer_id: 'C', name: 'C', category: 'C2', product_type: 'T3', brand: 'Other' },
      ],
    });
    page.category = 'C1';
    page.productType = 'T1';
    page.product = 'A';
    page.setFacet('brand', ['B']);
    expect(page.filterCategories()).toEqual(['C1', 'C2']);
    expect(page.filterTypes()).toEqual(['T1']);
    expect(page.filterProducts().map((p) => p['offer_id'])).toEqual(['A']);
    page.category = 'C2';
    page.productType = '';
    page.product = '';
    expect(page.filterTypes()).toEqual(['T2']);
    page.setFacet('brand', []);
    expect(page.filterTypes()).toEqual(['T2', 'T3']);
  });
  it('transfers original text and calendar controls to the unchanged reporting query', async () => {
    TestBed.configureTestingModule({
      imports: [FinancePageModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { queryParamMap: EMPTY } },
      ],
    });
    const fixture = TestBed.createComponent(FinancePage),
      page = fixture.componentInstance;
    page.data.set({
      view: 'profit',
      tax_regime: 'usn_6',
      snapshot_at: '',
      report: { items: [] },
      can_manage: true,
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await fixture.whenStable();
    const search = fixture.debugElement
      .queryAll(By.directive(FilterTextComponent))
      .map((n) => n.componentInstance as FilterTextComponent)
      .find((c) => c.key === 'q')!;
    (search as any).updateValue('A-001');
    for (const node of fixture.debugElement.queryAll(By.directive(FilterDateComponent))) {
      const control = node.componentInstance as FilterDateComponent;
      (control as any).updateValue(new Date(2026, 9, control.key === 'start' ? 1 : 17));
    }
    page.navigate();
    expect(navigate.mock.calls.at(-1)?.[1]?.queryParams).toMatchObject({
      q: 'A-001',
      start: '2026-10-01',
      end: '2026-10-17',
      period: 'custom',
    });
  });
  function setup(view: string, report: Record<string, unknown>, q = '') {
    TestBed.configureTestingModule({
      imports: [FinancePageModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { queryParamMap: EMPTY } },
      ],
    });
    const page = TestBed.createComponent(FinancePage).componentInstance;
    page.view.set(view);
    page.query.update((value) => ({ ...value, q }));
    page.data.set({ view, tax_regime: 'usn_6', snapshot_at: '', report, can_manage: true });
    return page;
  }
  it('combines characteristics with the selected financial hierarchy', () => {
    const page = setup('profit', { items: [] });
    page.start = '2026-10-01';
    page.end = '2026-10-18';
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    page.category = 'C';
    page.productType = 'T';
    page.product = 'A';
    page.setFacet('brand', ['B']);
    page.applyFacets();
    expect(navigate.mock.calls.at(-1)?.[1]?.queryParams).toMatchObject({
      category: 'C',
      product_type: 'T',
      product: 'A',
      facets: '{"brand":["B"]}',
    });
  });
  it('shows native weekly category/type/article nesting and selected totals', () => {
    const weeks = [{ orders_amount: '100', cancellation_rate_pct: '10' }];
    const article = { offer_id: 'A', product_name: 'A', weeks };
    const page = setup('weekly', {
      rows: [{ category: 'C', product_type: 'T', articles: [article], weeks }],
      category_rows: [{ category: 'C', weeks }],
      totals: weeks,
      _filters_applied: true,
    });
    expect(page.rows()[0].children![0].children![0].offer).toBe('A');
    expect(page.rows().at(-1)?.isTotal).toBe(true);
    expect(page.rows().at(-1)?.cells['0:orders']).toBe('100');
  });
  it('keeps four v1 columns per month and hides incomplete gross profit', () => {
    const page = setup('gross', {
      months: [{ key: '2026-10' }],
      rows: [
        {
          category: 'Категория',
          product_type: 'Тип',
          is_complete: false,
          gross_profit: '100',
          months: [
            {
              key: '2026-10',
              ozon_accrual: '200',
              cost: '100',
              gross_profit: '100',
              is_complete: false,
            },
          ],
          articles: [],
        },
      ],
    });
    expect(page.columns().filter((c) => c.group === '2026-10')).toHaveLength(4);
    expect(page.rows()[0].cells['month:2026-10:ozon_accrual']).toBe('200');
    expect(page.rows()[0].cells['month:2026-10:gross_profit']).toBeNull();
    expect(page.rows()[0].cells['gross_profit']).toBeNull();
  });
  it('retains products when the weekly search matches their category', () => {
    const page = setup(
      'weekly',
      {
        rows: [
          {
            category: 'Водосток',
            product_type: 'Трубы',
            weeks: [],
            articles: [{ offer_id: 'A', product_name: 'Белая труба', weeks: [] }],
          },
        ],
      },
      'водосток',
    );
    expect(page.rows()[0].children).toHaveLength(1);
  });
  it('does not apply a product search to shop-wide common charges', () => {
    const page = setup(
      'common',
      { rows: [{ label: 'Абонентская плата', amount: '-50', weeks: [] }] },
      'A-001',
    );
    expect(page.rows()).toHaveLength(1);
  });
  it('keeps unknown card prices empty rather than substituting seller prices', () => {
    const page = setup('market', {
      items: [{ offer_id: 'A', name: 'Товар', seller_price: '100', marketplace_card_price: null }],
    });
    expect(page.columns().some((c) => c.key === 'marketplace_card_price')).toBe(true);
    expect(page.rows()[0].cells['marketplace_card_price']).toBeNull();
  });
  it('renders market prices by fifty while retaining the full filtered result', () => {
    const page = setup('market', {
      items: Array.from({ length: 75 }, (_, i) => ({
        offer_id: 'A-' + i,
        name: 'Товар ' + i,
        seller_price: '100',
      })),
    });
    expect(page.rows()).toHaveLength(75);
    expect(page.displayedRows()).toHaveLength(50);
    page.marketPage.set(2);
    expect(page.displayedRows()).toHaveLength(25);
  });
  it('rejects nonexistent calendar dates before building or exporting a report', () => {
    expect(validFinanceDates('2026-02-29', '2026-03-02')).toBe(false);
    expect(validFinanceDates('2024-02-29', '2024-03-02')).toBe(true);
    expect(validFinanceDates('2026-11-01', '2026-10-01')).toBe(false);
  });
  it('shows the count and a separate signed total for common charges', () => {
    const page = setup('common', {
      rows: [{ label: 'Услуга', operation_count: 3, amount: '-50', weeks: ['-50'] }],
      operation_count: 3,
      total: '-50',
      week_totals: ['-50'],
    });
    expect(page.columns().some((c) => c.key === 'operation_count')).toBe(true);
    expect(page.rows().at(-1)?.isTotal).toBe(true);
    expect(page.rows().at(-1)?.cells['amount']).toBe('-50');
  });
  it('retains category/type/product nesting and keeps period totals outside detail sorting', () => {
    const page = setup('weekly', {
      periods: [],
      categories: [
        {
          category: 'Водосток',
          weeks: [],
          types: [
            {
              category: 'Водосток',
              product_type: 'Желоба',
              weeks: [],
              articles: [{ offer_id: 'A', product_name: 'Товар', weeks: [] }],
            },
          ],
        },
      ],
    });
    expect(page.rows()[0].children![0].children![0].offer).toBe('A');
  });
});
