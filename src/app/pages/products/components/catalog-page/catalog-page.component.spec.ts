import { CatalogPageModule } from './catalog-page.module';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FilterMultiselectComponent } from '../../../../shared/directives/filter-panel/components/filter-multiselect/filter-multiselect.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { SessionContext } from '../../../../core/infrastructure/services/session-context.service';
import { CatalogPageComponent } from './catalog-page.component';
import { CatalogSelections } from '../../infrastructure/services/catalog-selections.service';

describe('Local catalog selection and refresh', () => {
  const showModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
  const closeModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
  beforeAll(() => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value() {
        this.open = true;
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value() {
        this.open = false;
      },
    });
  });
  afterAll(() => {
    for (const [name, descriptor] of [
      ['showModal', showModal],
      ['close', closeModal],
    ] as const)
      descriptor
        ? Object.defineProperty(HTMLDialogElement.prototype, name, descriptor)
        : Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  });
  function setup(mode = 'products') {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { mode } },
            queryParamMap: new BehaviorSubject(convertToParamMap({})),
          },
        },
      ],
    });
    TestBed.inject(SessionContext).accept({
      tenant_id: 4,
      name: 'Fixture',
      actor_name: 'Tester',
      role: 'owner',
      is_owner: true,
      expires_in_seconds: 3600,
    });
    const fixture = TestBed.createComponent(CatalogPageComponent),
      page = fixture.componentInstance,
      http = TestBed.inject(HttpTestingController);
    http
      .expectOne((r) => r.url === '/v2/api/catalog-v2/list')
      .flush({
        items: [],
        meta: { total: 0, page: 1, page_size: 50, has_more: false },
        facets: {},
        summary: {},
        column_values: {},
      });
    http.expectOne('/v2/api/catalog-v2/views').flush({ items: [] });
    http.expectOne('/v2/api/catalog-v2/operations').flush({ items: [] });
    return { fixture, page, http };
  }
  it('keeps one filter entry and the existing bulk actions next to the table', () => {
    const { fixture, page, http } = setup();
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelectorAll('.catalog-filterbar button').length).toBe(2);
    expect(root.textContent).not.toContain('Сохранённый отбор');
    expect(root.textContent).not.toContain('Составной фильтр');
    expect(root.querySelector('.catalog-sort')).toBeNull();
    const toolbar = root.querySelector('.selection-bar')!;
    expect(toolbar.textContent).toContain('Характеристики');
    expect(toolbar.textContent).toContain('Категория, тип и маржа');
    expect(toolbar.textContent).toContain('Остатки');
    page.toggle('A-001');
    fixture.detectChanges();
    const cost = [...toolbar.querySelectorAll('button')].find((b) =>
      b.textContent.includes('Стоимость и квант'),
    )!;
    expect(cost.disabled).toBe(false);
    cost.click();
    expect(page.action()?.kind).toBe('cost');
    expect(page.action()?.offers).toEqual(['A-001']);
    http.verify();
  });
  it('keeps original facet controls independent while retaining the catalog query contract', async () => {
    const { fixture, page, http } = setup();
    page.productFiltersOpen.set(true);
    await fixture.whenStable();
    const controls = fixture.debugElement
      .queryAll(By.directive(FilterMultiselectComponent))
      .map((n) => n.componentInstance as FilterMultiselectComponent);
    expect(new Set(controls.map((c) => c.key)).size).toBe(controls.length);
    (controls.find((c) => c.key === 'brand') as any).updateValue(['Docke']);
    (controls.find((c) => c.key === 'category') as any).updateValue(['Водосток']);
    await fixture.whenStable();
    expect(page.activeQuery()).toMatchObject({ brand: '["Docke"]', category: '["Водосток"]' });
    expect(controls.find((c) => c.key === 'brand')!.value).toEqual(['Docke']);
    http.verify();
  });
  it('applies the filter drawer without losing facets, sort, column filters or selection', () => {
    const { page, http } = setup();
    const apply = vi.spyOn(page, 'applyFilters').mockImplementation(() => {});
    page.form.patchValue(
      { q: 'A-00', name_search: 'Желоб', brand: 'Docke', sort: 'price', direction: 'desc' },
      { emitEvent: false },
    );
    page.selected.set(new Set(['A-001']));
    page.addRule();
    page.productFiltersOpen.set(true);
    page.applyProductFilters();
    expect(apply).toHaveBeenCalledOnce();
    expect(page.productFiltersOpen()).toBe(false);
    expect(page.rules.length).toBe(0);
    expect(page.form.getRawValue()).toMatchObject({
      q: 'A-00',
      name_search: 'Желоб',
      brand: 'Docke',
      sort: 'price',
      direction: 'desc',
    });
    expect([...page.selected()]).toEqual(['A-001']);
    http.verify();
  });
  it('uses the visible search before debounce and adds results to the previous selection', () => {
    const { page, http } = setup();
    page.selected.set(new Set(['OUTSIDE']));
    page.form.controls['q'].setValue('A-00', { emitEvent: false });
    page.selectAll();
    const request = http.expectOne('/v2/api/catalog-v2/selection');
    expect(request.request.body.query.q).toBe('A-00');
    request.flush({ offer_ids: ['A-001', 'A-002'], total: 2 });
    expect([...page.selected()]).toEqual(['OUTSIDE', 'A-001', 'A-002']);
    http.verify();
  });
  it('appends mapping pages and ignores an earlier page after refreshing the filter', () => {
    const { page, http } = setup('mapping');
    page.data.set({
      items: [{ offer_id: 'A', mapping_status: 'verified' }],
      meta: { total: 2, page: 1, page_size: 25, has_more: true },
      facets: {},
      summary: {},
    });
    page.loadMoreMappings();
    const more = http.expectOne((r) => r.url === '/v2/api/catalog-v2/list');
    expect(more.request.params.get('page')).toBe('2');
    more.flush({
      items: [{ offer_id: 'B', mapping_status: 'verified' }],
      meta: { total: 2, page: 2, page_size: 25, has_more: false },
      facets: {},
      summary: {},
    });
    expect(page.data()?.items.map((r) => r.offer_id)).toEqual(['A', 'B']);
    page.data.update((d) => ({ ...d!, meta: { ...d!.meta, has_more: true } }));
    page.loadMoreMappings();
    const old = http.expectOne((r) => r.url === '/v2/api/catalog-v2/list');
    page.refresh();
    http
      .expectOne((r) => r.url === '/v2/api/catalog-v2/list')
      .flush({
        items: [],
        meta: { total: 0, page: 1, page_size: 25, has_more: false },
        facets: {},
        summary: {},
      });
    old.flush({
      items: [{ offer_id: 'STALE' }],
      meta: { total: 3, page: 3, page_size: 25, has_more: false },
      facets: {},
      summary: {},
    });
    expect(page.data()?.items).toEqual([]);
    http.verify();
  });
  it('keeps shop selections isolated', () => {
    const { page, http } = setup();
    page.selected.set(new Set(['A']));
    expect(TestBed.inject(CatalogSelections).scope(5, 'products')().size).toBe(0);
    http.verify();
  });
  it('cancels a previous reload before accepting a newer one', () => {
    const { page, http } = setup();
    page.refresh();
    const old = http.expectOne((r) => r.url === '/v2/api/catalog-v2/list');
    page.refresh();
    expect(old.cancelled).toBe(true);
    http
      .expectOne((r) => r.url === '/v2/api/catalog-v2/list')
      .flush({
        items: [],
        meta: { total: 3, page: 1, page_size: 50, has_more: false },
        facets: {},
        summary: {},
      });
    expect(page.data()?.meta.total).toBe(3);
    http.verify();
  });
  it('forces a fresh snapshot on refresh and reuses it for the following page', () => {
    const { page, http } = setup();
    page.refresh();
    const refresh = http.expectOne((r) => r.url === '/v2/api/catalog-v2/list');
    expect(refresh.request.params.get('fresh')).toBe('true');
    refresh.flush({
      items: [],
      meta: { total: 100, page: 1, page_size: 50, has_more: true },
      facets: {},
      summary: {},
    });
    const params = TestBed.inject(ActivatedRoute).queryParamMap as BehaviorSubject<
      ReturnType<typeof convertToParamMap>
    >;
    params.next(convertToParamMap({ page: '2' }));
    const next = http.expectOne((r) => r.url === '/v2/api/catalog-v2/list');
    expect(next.request.params.get('page')).toBe('2');
    expect(next.request.params.has('fresh')).toBe(false);
    next.flush({
      items: [],
      meta: { total: 100, page: 2, page_size: 50, has_more: false },
      facets: {},
      summary: {},
    });
    http.verify();
  });
  it('keeps an invalid composed filter from sending selection or export requests', () => {
    const { page, http } = setup();
    page.addRule();
    page.rules.at(0).controls.field.setValue('units_per_item');
    page.rules.at(0).controls.operator.setValue('gt');
    page.rules.at(0).controls.value.setValue('не число');
    expect(page.rules.getRawValue()).toEqual([
      { field: 'units_per_item', operator: 'gt', value: 'не число' },
    ]);
    expect(() => page.activeQuery()).toThrow();
    page.selectAll();
    page.export();
    http.expectNone('/v2/api/catalog-v2/selection');
    http.expectNone('/v2/api/catalog-v2/export');
    expect(page.busy()).toBe(false);
    expect(page.error()).not.toBe('');
    http.verify();
  });
});

beforeEach(() => TestBed.configureTestingModule({ imports: [CatalogPageModule] }));
