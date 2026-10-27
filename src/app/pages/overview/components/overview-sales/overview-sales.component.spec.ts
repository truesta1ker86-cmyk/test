import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OverviewSalesModule } from './overview-sales.module';
import { OverviewSales } from './overview-sales.component';
import type { SalesDynamics } from './infrastructure/interfaces/sales-dynamics.interfaces';
import { salesChartData } from './infrastructure/utils/sales-chart.utils';

const endpoint = '/v2/api/workspace-v2/sales-dynamics';
function result(days = 30): SalesDynamics {
  const timeline = [2, 0, 3].map((units, index) => ({
    date: '2026-10-' + (18 + index),
    units,
    revenue: ['20.30', '0.00', '60.00'][index],
  }));
  return {
    days,
    timeline,
    total_units: 5,
    total_revenue: '80.30',
    best_day: timeline[2],
    sales_basis: 'delivered_orders',
    sales_date_field: 'in_process_at',
    snapshot_at: '2026-10-20T12:00:00',
  };
}

function setup() {
  TestBed.configureTestingModule({
    imports: [OverviewSalesModule],
    // Canvas drawing is verified in the browser; jsdom checks state and content.
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: PLATFORM_ID, useValue: 'server' },
    ],
  });
  const fixture = TestBed.createComponent(OverviewSales);
  fixture.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  const initial = http.expectOne((r) => r.url === endpoint && r.params.get('days') === '30');
  return { fixture, page: fixture.componentInstance, http, initial };
}

describe('overview delivered-sales dynamics', () => {
  it('shows saved totals, an accessible daily table and zero days in the chart', async () => {
    const { fixture, page, http, initial } = setup();
    expect(fixture.nativeElement.textContent).toContain('Загружаем динамику');
    initial.flush(result());
    fixture.detectChanges();
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('.sales-period [aria-pressed="true"]').textContent.trim(),
    ).toBe('30 дней');
    expect(page.chartData()?.datasets[0].data).toEqual([2, 0, 3]);
    expect(salesChartData(result()).labels).toEqual(['18.10', '19.10', '20.10']);
    expect(fixture.nativeElement.textContent).toContain('80,30');
    expect(fixture.nativeElement.textContent).toContain('20.10.2026 · 3 шт.');
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('canvas').getAttribute('aria-label')).toContain(
      'Точные значения',
    );
    http.verify();
  });

  it('cancels a slow prior period and displays only the newly selected period', () => {
    const { fixture, page, http, initial } = setup();
    (fixture.nativeElement.querySelector('.sales-period button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(initial.cancelled).toBe(true);
    http.expectOne((r) => r.url === endpoint && r.params.get('days') === '7').flush(result(7));
    fixture.detectChanges();
    expect(page.days()).toBe(7);
    expect(page.data()?.days).toBe(7);
    expect(page.loading()).toBe(false);
    (
      fixture.nativeElement.querySelector('.sales-period button:last-child') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    http.expectOne((r) => r.url === endpoint && r.params.get('days') === '90').flush(result(90));
    fixture.detectChanges();
    expect(page.days()).toBe(90);
    http.verify();
  });

  it('retries a failed read without changing the selected period', () => {
    const { fixture, page, http, initial } = setup();
    initial.flush(
      { detail: 'Снимок временно недоступен' },
      { status: 503, statusText: 'Unavailable' },
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Снимок временно недоступен',
    );
    (fixture.nativeElement.querySelector('.sales-error button') as HTMLButtonElement).click();
    fixture.detectChanges();
    http.expectOne((r) => r.url === endpoint && r.params.get('days') === '30').flush(result());
    fixture.detectChanges();
    expect(page.error()).toBe('');
    expect(page.data()?.total_units).toBe(5);
    http.verify();
  });

  it('refreshes the same period from the page and shows a truthful empty state', () => {
    const { fixture, page, http, initial } = setup();
    initial.flush(result());
    fixture.detectChanges();
    fixture.componentRef.setInput('refresh', 1);
    fixture.detectChanges();
    const empty = result();
    empty.total_units = 0;
    empty.total_revenue = '0';
    empty.timeline = empty.timeline.map((day) => ({ ...day, units: 0, revenue: '0' }));
    empty.best_day = empty.timeline[0];
    http.expectOne((r) => r.url === endpoint && r.params.get('days') === '30').flush(empty);
    fixture.detectChanges();
    expect(page.peak()).toBe('—');
    expect(fixture.nativeElement.textContent).toContain(
      'За выбранный период доставленных продаж нет.',
    );
    http.verify();
  });
});
