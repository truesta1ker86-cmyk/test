import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProfitSummary } from './profit-summary';

describe('v1 financial result presentation', () => {
  it('separates a balanced cached report from a freshly updated period', () => {
    const { fixture, component } = setup();
    fixture.componentRef.setInput('report', { items: [], reconciliation: { is_balanced: true } });
    expect(component.reconciliation()).toContain('не обновлялся');
    fixture.componentRef.setInput('report', {
      items: [],
      reconciliation: { is_balanced: true },
      sync: { state: 'success', last_success_at: '2026-10-16T08:00:00Z' },
    });
    expect(component.reconciliation()).toContain('Последнее успешное обновление');
  });
  const items = [
    {
      offer_id: 'A',
      product_name: 'Желоб',
      report_category: 'Водосток',
      report_type: 'Желоба',
      units_sold: 2,
      sales_revenue: '1000',
      returns: '100',
      revenue: '900',
      ozon_accrual: '700',
      cost: '300',
      ozon_commission: '120',
      acquiring: '20',
      logistics: '80',
      other_expenses: '10',
      other_income: '20',
      distribution_adjustment: '10',
      gross_profit: '400',
      tax: '54',
      profit: '346',
      margin_pct: '49.43',
      has_cost_price: true,
      is_complete: true,
    },
    {
      offer_id: 'B',
      product_name: 'Крепёж',
      report_category: 'Крепёж',
      report_type: 'Саморезы',
      units_sold: 1,
      revenue: '200',
      ozon_accrual: '150',
      cost: '0',
      gross_profit: '150',
      tax: '12',
      profit: '138',
      margin_pct: '92',
      has_cost_price: false,
      is_complete: false,
    },
  ];
  function setup() {
    TestBed.configureTestingModule({ imports: [ProfitSummary], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(ProfitSummary);
    fixture.componentRef.setInput('report', { items, totals: { revenue: '999999' } });
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }
  it('uses net sales after returns and recomputes metrics from visible rows', () => {
    const { component, fixture } = setup();
    expect(component.total('revenue')).toBe(1100);
    fixture.componentRef.setInput('query', 'Желоб');
    expect(component.total('revenue')).toBe(900);
    expect(component.total('profit')).toBe(346);
    expect(component.marketplaceCosts()).toBe(-230);
    expect(component.total('distribution_adjustment')).toBe(10);
  });
  it('filters the table and totals with category/type filters together', () => {
    const { component } = setup();
    component.setCategory('Водосток');
    component.productType.set('Желоба');
    expect(component.visible()).toHaveLength(1);
    expect(component.incomplete()).toBe(0);
    component.setCategory('Крепёж');
    expect(component.productType()).toBe('');
    expect(component.incomplete()).toBe(1);
  });
  it('does not turn missing API cost or incomplete margin into a valid zero', () => {
    const { component, fixture } = setup();
    fixture.componentRef.setInput('query', 'B');
    fixture.detectChanges();
    expect(component.costValue(component.visible()[0])).toBeNull();
    expect(component.marginValue(component.visible()[0])).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('нет себестоимости Ozon');
  });
  it('shows gross profit, negative costs and a per-product breakdown as in v1', () => {
    const { component, fixture } = setup();
    component.toggle(items[0]);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Валовая прибыль');
    expect(text).toContain('Доставки');
    expect(text).toContain('Возвраты');
    expect(component.costValue(items[0])).toBe(-300);
    expect(component.breakdown(items[0]).find((row) => row.label === 'Налог')?.value).toBe(-54);
  });
});
