import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkspaceApi } from '../services/workspace-api.service';
import type { ListQuery } from '../interfaces/contracts.interfaces';

describe('Server filtered exports', () => {
  it.each(['csv', 'xlsx'] as const)('exports %s without fetching any order pages', (format) => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const column_filters = '{"amount":{"min":"1000"},"posting_number":{"values":[]}}';
    TestBed.inject(WorkspaceApi)
      .export('orders', { page: 3, column_filters } as ListQuery, format)
      .subscribe();
    const request = http.expectOne('/v2/api/workspace-v2/export');
    expect(request.request.body.column_filters).toBe(column_filters);
    expect(request.request.body.format).toBe(format);
    expect(request.request.body.timezone).toBeTruthy();
    http.expectNone((r) => r.url.endsWith('/orders'));
    request.flush(new Blob());
    http.verify();
  });
});
