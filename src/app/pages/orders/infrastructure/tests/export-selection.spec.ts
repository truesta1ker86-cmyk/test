import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkspaceApi } from '../services/workspace-api.service';
import type { ListQuery } from '../interfaces/contracts.interfaces';

describe('Operational export selection', () => {
  const query: ListQuery = {
    q: '',
    status: '',
    scheme: '',
    lifecycle: '',
    start: '',
    end: '',
    page: 1,
    page_size: 50,
    sort: 'date_desc',
    column_filters: '{}',
  };
  function setup() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return { api: TestBed.inject(WorkspaceApi), http: TestBed.inject(HttpTestingController) };
  }
  function page(items: unknown[], number = 1, more = false) {
    return {
      items,
      meta: { page: number, page_size: 100, total: 2, has_more: more },
      summary: {},
      statuses: [],
      snapshot_at: '',
    };
  }
  const order = (id: number) => ({
    id,
    posting_number: 'P-' + id,
    scheme: 'fbs',
    status: 'delivered',
    in_process_at: '2026-10-10T10:00:00Z',
    total_price: 100,
    items: [],
  });

  it('omits the client column-filter field from an unfiltered export', () => {
    const { api, http } = setup();
    api.export('orders', query).subscribe();
    const request = http.expectOne('/v2/api/workspace-v2/export');
    expect(request.request.body.column_filters).toBeUndefined();
    expect(request.request.body.entity).toBe('orders');
    request.flush(new Blob());
    http.verify();
  });

  it.each(['csv', 'xlsx'] as const)(
    'exports %s with precisely the ids matched by the column engine',
    (format) => {
      const { api, http } = setup();
      api
        .export(
          'orders',
          { ...query, column_filters: '{"posting_number":{"values":["P-2"]}}' },
          format,
        )
        .subscribe();
      http
        .expectOne((r) => r.url.endsWith('/orders') && r.params.get('page') === '1')
        .flush(page([order(1)], 1, true));
      http
        .expectOne((r) => r.url.endsWith('/orders') && r.params.get('page') === '2')
        .flush(page([order(2)], 2));
      const request = http.expectOne('/v2/api/workspace-v2/export');
      expect(request.request.body.row_ids).toEqual([2]);
      expect(request.request.body.format).toBe(format === 'xlsx' ? 'xlsx' : undefined);
      expect(request.request.body.column_filters).toBeUndefined();
      request.flush(new Blob());
      http.verify();
    },
  );

  it('preserves an empty selection instead of exporting the entire shop', () => {
    const { api, http } = setup();
    api
      .export('returns', { ...query, column_filters: '{"offer_id":{"values":["missing"]}}' })
      .subscribe();
    http
      .expectOne((r) => r.url.endsWith('/returns'))
      .flush(page([{ id: 11, return_id: 1, offer_id: 'A', returns_amount: 50 }]));
    const request = http.expectOne('/v2/api/workspace-v2/export');
    expect(request.request.body.row_ids).toEqual([]);
    request.flush(new Blob());
    http.verify();
  });

  it('does not silently export extra rows when an older API omits row identities', () => {
    const { api, http } = setup();
    let message = '';
    api
      .export('orders', { ...query, column_filters: '{"posting_number":{"text":"P"}}' })
      .subscribe({ error: (error: Error) => (message = error.message) });
    http.expectOne((r) => r.url.endsWith('/orders')).flush(page([{ ...order(1), id: undefined }]));
    expect(message).toContain('обновление API V2');
    http.expectNone('/v2/api/workspace-v2/export');
    http.verify();
  });
});
