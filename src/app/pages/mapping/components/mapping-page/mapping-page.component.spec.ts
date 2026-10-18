import { MappingPageModule } from './mapping-page.module';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { SessionContext } from '../../../../core/infrastructure/services/session-context.service';
import { MappingPage } from './mapping-page.component';

describe('v1 mapping screen structure', () => {
  it('has one filter entry and reveals bulk editing only after selecting rows', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { mode: 'mapping' } },
            queryParamMap: new BehaviorSubject(convertToParamMap({})),
          },
        },
      ],
    });
    TestBed.inject(SessionContext).accept({
      tenant_id: 4,
      name: 'Test',
      actor_name: 'Test',
      is_owner: true,
      role: 'owner',
      expires_in_seconds: 3600,
    });
    const fixture = TestBed.createComponent(MappingPage),
      page = fixture.componentInstance,
      http = TestBed.inject(HttpTestingController);
    http
      .expectOne((r) => r.url === '/v2/api/catalog-v2/list')
      .flush({
        items: [{ offer_id: 'A', version: '1', name: 'Test', mapping_status: 'verified' }],
        meta: { total: 1, page: 1, page_size: 50, has_more: false },
        summary: { total: 1, verified: 1, matched: 1, unmatched: 0 },
        facets: {},
        column_values: {},
      });
    http.expectOne('/v2/api/catalog-v2/views').flush({ items: [] });
    http.expectOne('/v2/api/catalog-v2/operations').flush({ items: [] });
    fixture.detectChanges();
    http
      .expectOne('/v2/api/workspace-v2/account/workspace')
      .flush({ local_preview: true, is_owner: true, onec: { configured: false } });
    http.expectOne('/v2/api/catalog-v2/mapping/snapshot').flush({ items: [] });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Подключение веб-базы 1С');
    expect(text).not.toContain('Составной фильтр');
    expect(text).not.toContain('Сохранённый отбор');
    expect(text).not.toContain('Сортировка');
    expect(text).not.toContain('Массовое редактирование выбранных');
    expect(fixture.nativeElement.querySelectorAll('.mapping-stat').length).toBe(6);
    expect(fixture.nativeElement.querySelectorAll('.mapping-group-tabs button').length).toBe(3);
    page.toggle('A');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Массовое редактирование выбранных');
    http.verify();
  });
});

beforeEach(() => TestBed.configureTestingModule({ imports: [MappingPageModule] }));
