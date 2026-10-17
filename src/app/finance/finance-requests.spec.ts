import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { FinancePage } from './finance-page';
describe('Local financial requests', () => {
  const initial = {
    view: 'profit',
    start: '2026-10-01',
    end: '2026-10-16',
    q: 'A-001',
    category: 'Водосточная система',
    product: 'A-001',
  };
  function setup(params: Record<string, string> = initial) {
    const route = new BehaviorSubject(convertToParamMap(params));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { queryParamMap: route } },
      ],
    });
    const fixture = TestBed.createComponent(FinancePage),
      page = fixture.componentInstance,
      http = TestBed.inject(HttpTestingController);
    return { route, fixture, page, http };
  }
  const report = {
    local_preview: true,
    view: 'profit',
    tax_regime: 'usn_6',
    snapshot_at: '2026-10-16T08:00:00Z',
    report: { items: [] },
    can_manage: true,
  };
  it('sends the same applied filters to the current-tab export', () => {
    const { page, http } = setup();
    const request = http.expectOne((r) => r.url.endsWith('/finance/report'));
    expect(request.request.params.get('product')).toBe('A-001');
    request.flush(report);
    page.exportKind = 'view';
    page.export();
    const file = http.expectOne((r) => r.url.endsWith('/finance/export'));
    expect(file.request.body).toMatchObject({
      view: 'profit',
      kind: 'view',
      start: '2026-10-01',
      end: '2026-10-16',
      product: 'A-001',
      q: 'A-001',
      category: 'Водосточная система',
    });
    file.flush(null, { status: 400, statusText: 'Test error' });
    http.verify();
  });
  it('cancels an older reload when the user changes tabs', () => {
    const { page, route, http } = setup();
    http.expectOne((r) => r.url.endsWith('/finance/report')).flush(report);
    page.reload();
    const old = http.expectOne((r) => r.url.endsWith('/finance/report'));
    route.next(convertToParamMap({ ...initial, view: 'weekly' }));
    expect(old.cancelled).toBe(true);
    http
      .expectOne((r) => r.url.endsWith('/finance/report'))
      .flush({ ...report, view: 'weekly', report: { periods: [], rows: [] } });
    expect(page.data()?.view).toBe('weekly');
    expect(page.loading()).toBe(false);
    http.verify();
  });
  it('does not request a report for an impossible calendar date from the URL', () => {
    const { page, http } = setup({ ...initial, start: '2026-02-30' });
    http.expectNone((r) => r.url.endsWith('/finance/report'));
    expect(page.error()).toContain('корректные даты');
    http.verify();
  });
});
