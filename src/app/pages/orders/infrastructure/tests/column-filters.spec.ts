import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkspaceApi } from '../services/workspace-api.service';
import type { ListQuery } from '../interfaces/contracts.interfaces';

describe('Server column filter contract', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return { api: TestBed.inject(WorkspaceApi), http: TestBed.inject(HttpTestingController) };
  }
  it('sends conditions and timezone to the API and preserves server rows and totals', () => {
    const { api, http } = setup();
    const column_filters = '{"status":{"text":"Ожидает"}}';
    let result: any;
    api
      .listPage('orders', { column_filters } as ListQuery, 1, 25)
      .subscribe((page) => (result = page));
    const request = http.expectOne((r) => r.url.endsWith('/orders'));
    expect(request.request.params.get('column_filters')).toBe(column_filters);
    expect(request.request.params.get('timezone')).toBeTruthy();
    request.flush({
      items: [{ posting_number: 'MATCH-110' }],
      meta: { total: 100, has_more: true },
    });
    expect(result.items).toEqual([{ posting_number: 'MATCH-110' }]);
    expect(result.meta.total).toBe(100);
    http.verify();
  });
  it('requests one page of values only for an explicitly opened column', () => {
    const { api, http } = setup();
    api.columnValues('orders', {} as ListQuery, 'posting_number', '110', 2).subscribe();
    const request = http.expectOne((r) => r.url.endsWith('/column-values'));
    expect(request.request.params.get('search')).toBe('110');
    expect(request.request.params.get('value_page')).toBe('2');
    expect(request.request.params.get('value_page_size')).toBe('50');
    request.flush({ values: ['MATCH-110'], meta: { total: 60, page: 2, has_more: false } });
    http.verify();
  });
});
