import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WorkspaceApi } from '../../../orders/infrastructure/services/workspace-api.service';
import type { Overview } from '../../../orders/infrastructure/interfaces/contracts.interfaces';
import { OverviewPageModule } from './overview-page.module';
import { OverviewPage } from './overview-page.component';

async function setup() {
  const snapshot: Overview = {
    products: 0,
    recent_orders: [],
    status: {
      name: 'Shop',
      last_synced_at: null,
      is_active: false,
      totals: { orders: 1000, returns: 2, stocks_rows: 0, finance_rows: 12 },
      integrations: {
        onec_state: 'error',
        onec_last_snapshot_at: null,
        marketplace_state: 'paused',
        ai_state: 'disabled',
      },
      last_errors: [],
    },
    operations: Array.from({ length: 8 }, (_, i) => ({
      entity: 'stocks',
      status: i === 0 ? 'error' : 'success',
      affected: i,
      completed_at: '2026-10-27T12:00:00',
      error: i === 0 ? 'Снимок недоступен' : null,
    })),
  };
  TestBed.configureTestingModule({
    imports: [OverviewPageModule],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: WorkspaceApi, useValue: { overview: () => of(snapshot) } },
      { provide: PLATFORM_ID, useValue: 'server' },
    ],
  });
  const fixture = TestBed.createComponent(OverviewPage);
  fixture.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  http
    .expectOne((r) => r.url.endsWith('/sales-dynamics'))
    .flush({
      days: 30,
      timeline: [],
      total_units: 0,
      total_revenue: '0',
      best_day: null,
      snapshot_at: null,
    });
  await fixture.whenStable();
  http.verify();
  return {
    fixture,
    page: fixture.componentInstance,
    root: fixture.nativeElement as HTMLElement,
    snapshot,
  };
}

describe('Store overview', () => {
  it('renders saved counts without claiming that an unavailable 1C connection is healthy', async () => {
    const { page, root, fixture, snapshot } = await setup();
    expect(root.querySelectorAll('.overview-totals > a')).toHaveLength(5);
    expect(root.querySelector('.overview-totals')?.textContent).toContain(
      (1000).toLocaleString('ru-RU'),
    );
    expect(root.querySelector('.exchange-state')?.textContent?.trim()).toBe('Ошибка обмена с 1С');
    expect(root.querySelector('.exchange-connection.ready')).toBeNull();
    expect(root.querySelectorAll('.exchange-statuses .loaded')).toHaveLength(1);
    page.data.set({
      ...snapshot,
      status: {
        ...snapshot.status,
        integrations: { ...snapshot.status.integrations, onec_state: 'ready' },
      },
    });
    await fixture.whenStable();
    expect(root.querySelector('.exchange-connection.ready')).not.toBeNull();
  });
  it('expands the received operation history and retains failure details', async () => {
    const { root, fixture } = await setup();
    expect(root.querySelectorAll('.overview-history tbody tr')).toHaveLength(5);
    expect(root.querySelector('.overview-history')?.textContent).toContain('Снимок недоступен');
    expect(root.querySelector('.operation-status.failed')).not.toBeNull();
    (root.querySelector('.overview-history .overview-link') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(root.querySelectorAll('.overview-history tbody tr')).toHaveLength(8);
  });
});
