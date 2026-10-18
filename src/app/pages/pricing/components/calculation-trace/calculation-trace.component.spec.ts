import { PricingCalculationTraceModule } from './calculation-trace.module';
import { TestBed } from '@angular/core/testing';
import { PricingCalculationTrace } from './calculation-trace.component';

describe('Saved v1 calculation trace', () => {
  it('shows API margin and plan scenarios from their saved inputs without substituting missing costs', () => {
    const fixture = TestBed.createComponent(PricingCalculationTrace);
    fixture.componentRef.setInput('trace', {
      actual_margin: {
        selected_margin: '.683',
        actual_cost: null,
        sale_price: '1200',
        ozon_expenses_low: '254',
      },
      minimum_price: {
        formula_result: '594',
        working_result: '594',
        variables: { cost: '300' },
        using_planned_logistics: { min_price: '594', price: '849' },
        using_marketplace_api_max: { min_price: '630', price: '900' },
      },
      working_price: { expression: '=min_price/price_divisor', result: '849' },
    });
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.amount(component.trace().actual_margin!, 'actual_cost')).toBeNull();
    expect(component.scenarios()[0].values['price']).toBe('849');
    expect(component.scenarios()[1].values['price']).toBe('900');
    expect(fixture.nativeElement.textContent).toContain('прибыль / начислено после Ozon');
    expect(fixture.nativeElement.textContent).toContain('68,3');
  });
});

beforeEach(() => TestBed.configureTestingModule({ imports: [PricingCalculationTraceModule] }));
