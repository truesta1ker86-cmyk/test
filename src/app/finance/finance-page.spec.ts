import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EMPTY } from 'rxjs';
import { FinancePage, validFinanceDates } from './finance-page';

describe('Financial view adapters', () => {
  function setup(view: string, report: Record<string, unknown>, q = '') {
    TestBed.configureTestingModule({
      imports: [FinancePage],
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
