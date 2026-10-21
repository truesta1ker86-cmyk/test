import { PricingPageModule } from './pricing-page.module';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PricingColumnFilter } from '../pricing-column-filter/pricing-column-filter.component';
import { DataTableFilterComponent } from '../../../../shared/data-table-filter/components/data-table-filter/data-table-filter.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PricingPageComponent } from './pricing-page.component';
import { SessionContext } from '../../../../core/infrastructure/services/session-context.service';
import type { PricingRow } from '../../../../core/infrastructure/interfaces/contracts.interfaces';
import { EditorDrafts } from '../../infrastructure/services/editor-drafts.service';

const row: PricingRow = {
  offer_id: 'A',
  name: 'Товар',
  version: '1',
  units_per_item: 1,
  fixed_margin: '0.2',
  ship_method: 'FBS',
  plan_ship_method: 'FBS',
  fin_type: 'Тест',
  onec_code: null,
  readiness_status: 'ready',
  blocking_errors: [],
  effective_cost: '300',
  effective_cost_source: 'marketplace_api',
  effective_margin: '.2',
  effective_margin_source: 'product',
  effective_commission: '.15',
  effective_logistics: '50',
  effective_logistics_min: '50',
  effective_logistics_max: '50',
  effective_logistics_source: 'excel_reference',
  calculated_price: '849',
  calculated_min_price: '594',
  working_min_price: '594',
  working_min_price_source: 'formula',
  formula_min_price: '594',
  current_seller_price: '1200',
  current_buyer_price: '1200',
  current_buyer_price_source: 'marketplace_api',
  actual_buyer_margin: '.68',
  actual_shipping_scheme: 'FBS',
  promo_below_calculated_min: false,
  updated_at: null,
};

describe('Local pricing workflow', () => {
  const modal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
  beforeAll(() =>
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value() {
        this.open = true;
      },
    }),
  );
  afterAll(() =>
    modal
      ? Object.defineProperty(HTMLDialogElement.prototype, 'showModal', modal)
      : Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal'),
  );
  function setup(params: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap(params)),
            snapshot: { queryParams: params },
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
    const fixture = TestBed.createComponent(PricingPageComponent);
    const page = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/v2/api/pricing/views').flush({ items: [] });
    http
      .expectOne('/v2/api/pricing/editor/workspace')
      .flush({ mode: 'local-preview', can_manage: true });
    http.expectOne('/v2/api/pricing/editor/operations').flush({ items: [] });
    http.expectOne('/v2/api/pricing/refs').flush({ filter_fin_types: [] });
    http
      .expectOne('/v2/api/pricing/filter-values')
      .flush({ fields: { brand: [{ value: 'Docke', label: 'Docke', count: 2 }] }, total: 2 });
    http
      .expectOne((r) => r.url === '/v2/api/pricing/configs')
      .flush({ items: [], total: 0, uncalculated_total: 0 });
    return { fixture, page, http };
  }
  it('opens the automatic sending workspace from the sidebar URL', () => {
    const { page, http } = setup({ workspace: 'automation' });
    expect(page.workspace()).toBe('automation');
    http.verify();
  });
  it('loads filter choices from their real endpoint when refs has no facets', () => {
    const { page, http } = setup();
    expect(page.filterChoices()['brand']).toEqual([{ value: 'Docke', label: 'Docke', count: 2 }]);
    expect(page.facets()).toEqual({});
    http.verify();
  });
  it('keeps the header filter alive while its original controls and server values update', async () => {
    const { fixture, page, http } = setup();
    page.data.update((value) => ({ ...value!, items: [row], total: 1 }));
    await fixture.whenStable();
    const header = fixture.debugElement
      .queryAll(By.directive(PricingColumnFilter))
      .find((n) => n.componentInstance.field() === 'ship_method')!;
    const original = header.componentInstance as PricingColumnFilter;
    (header.nativeElement.querySelector('button') as HTMLButtonElement).click();
    http.expectOne('/v2/api/pricing/column-values').flush({ values: ['FBS', 'FBO'] });
    await fixture.whenStable();
    const current = fixture.debugElement
      .queryAll(By.directive(PricingColumnFilter))
      .find((n) => n.componentInstance.field() === 'ship_method')!.componentInstance;
    expect(current).toBe(original);
    expect(header.query(By.directive(DataTableFilterComponent)).componentInstance.opened()).toBe(
      true,
    );
    expect(
      fixture.nativeElement.querySelector('dialog[aria-label="Фильтр столбца: Метод"]'),
    ).not.toBeNull();
    http.verify();
  });
  it('uses the visible quick search for full selection before its debounce completes', () => {
    const { page, http } = setup();
    page.form.controls.search.setValue('A-00', { emitEvent: false });
    page.selectFiltered();
    const request = http.expectOne('/v2/api/pricing/editor/selection');
    expect(request.request.body.filters.product_query).toBe('A-00');
    request.flush({ offer_ids: ['A'], total: 1 });
    http.verify();
  });
  it('rejects invalid inline pieces before saving any row', () => {
    const { page, http } = setup();
    page.stage({ row, field: 'units_per_item', value: '1.2' });
    page.saveInline();
    http.expectNone('/v2/api/pricing/editor/save');
    expect(page.actionError()).toContain('целым');
    http.verify();
  });
  it('saves existing table drafts through the header Save button', () => {
    const { fixture, page, http } = setup();
    vi.spyOn(page, 'changed').mockImplementation(() => {});
    page.mode.set('single');
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      'button[aria-label="Сохранить параметры цен"]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    page.stage({ row, field: 'fixed_margin', value: '30' });
    fixture.detectChanges();
    expect(button.disabled).toBe(false);
    button.click();
    const request = http.expectOne('/v2/api/pricing/editor/save');
    expect(request.request.body.changes).toEqual({ fixed_margin: '0.3' });
    expect(request.request.body.recalculate).toBe(true);
    request.flush({ saved: true, calculation: { ok: true } });
    fixture.detectChanges();
    expect(button.disabled).toBe(true);
    http.verify();
  });
  it('does not report a saved incomplete calculation as calculated', () => {
    const { page, http } = setup();
    vi.spyOn(page, 'changed').mockImplementation(() => {});
    page.stage({ row, field: 'manual_cost', value: '100' });
    page.saveInline();
    http
      .expectOne('/v2/api/pricing/editor/save')
      .flush({ saved: true, calculation: { ok: false, errors: ['Не задана схема'] } });
    expect(page.actionMessage()).toContain('Рассчитано: 0. Требуют данных: 1');
    expect(page.dirtyCount()).toBe(0);
    http.verify();
  });
  it('saves an API-scheme change without rewriting the plan', () => {
    const { page, http } = setup();
    vi.spyOn(page, 'changed').mockImplementation(() => {});
    page.stage({ row, field: 'ship_method', value: 'RFBS' });
    page.saveInline();
    const request = http.expectOne('/v2/api/pricing/editor/save');
    expect(request.request.body.changes).toEqual({ ship_method: 'RFBS' });
    request.flush({ saved: true });
    expect(page.dirtyCount()).toBe(0);
    http.verify();
  });
  it('retains only failed drafts after a partial save', () => {
    const { page, http } = setup();
    vi.spyOn(page, 'changed').mockImplementation(() => {});
    page.stage({ row, field: 'fixed_margin', value: '30' });
    page.stage({ row: { ...row, offer_id: 'B' }, field: 'fixed_margin', value: '40' });
    page.saveInline();
    http
      .expectOne('/v2/api/pricing/editor/save')
      .flush({ detail: 'Версия изменена' }, { status: 409, statusText: 'Conflict' });
    const second = http.expectOne('/v2/api/pricing/editor/save');
    expect(second.request.body.offer_id).toBe('B');
    second.flush({ saved: true });
    expect(Object.keys(page.drafts())).toEqual(['A']);
    expect(page.actionError()).toContain('A: Версия изменена');
    http.verify();
  });
  it('keeps table drafts isolated by shop and available on return', () => {
    const { page, http } = setup();
    page.stage({ row, field: 'fixed_margin', value: '30' });
    const drafts = TestBed.inject(EditorDrafts);
    expect(drafts.forShop(5).values()).toEqual({});
    expect(drafts.forShop(4).values()['A']['fixed_margin']).toBe('30');
    http.verify();
  });
  it('does not submit writes when management is unavailable', () => {
    const { page, http } = setup();
    page.canManage.set(false);
    page.stage({ row, field: 'fixed_margin', value: '30' });
    page.saveInline();
    page.recalculateAll();
    http.expectNone('/v2/api/pricing/editor/save');
    http.expectNone('/v2/api/pricing/editor/recalc');
    http.verify();
  });
  it('applies an inline minimum through the inverse formula without changing API prices', () => {
    const { page, http } = setup();
    vi.spyOn(page, 'changed').mockImplementation(() => {});
    page.saveWorkingCell({ row, field: 'min_price', value: '700' });
    const request = http.expectOne('/v2/api/pricing/editor/working');
    expect(request.request.body).toEqual({
      offer_id: 'A',
      expected_version: '1',
      value: { min_price: '700' },
    });
    request.flush({ saved: true });
    expect(row.current_seller_price).toBe('1200');
    expect(page.actionMessage()).toContain('Отправок не было');
    http.verify();
  });
  it('blocks immediate working edits until conflicting parameter drafts are resolved', () => {
    const { page, http } = setup();
    page.stage({ row, field: 'volume', value: '2' });
    page.saveWorkingCell({ row, field: 'margin', value: '.3' });
    http.expectNone('/v2/api/pricing/editor/working');
    expect(page.actionError()).toContain('Сначала сохраните');
    expect(page.dirtyCount()).toBe(1);
    http.verify();
  });
  it('exports the selected failed rows instead of the entire filter', () => {
    const { page, http } = setup();
    page.selection.toggle('B');
    page.exportRepairs();
    const request = http.expectOne('/v2/api/pricing/repair/export');
    expect(request.request.body.scope).toEqual({ offer_ids: ['B'] });
    request.flush(null, { status: 400, statusText: 'Bad Request' });
    http.verify();
  });
  it('appends the next page on scroll without replacing previous rows or drafts', () => {
    const { fixture, page, http } = setup();
    page.query.update((q) => ({ ...q, page_size: 25 }));
    page.data.set({
      items: [row],
      total: 26,
      page: 1,
      page_size: 25,
      ready_on_page: 1,
      blocked_on_page: 0,
      inactive_on_page: 0,
      uncalculated_total: 0,
    });
    page.stage({ row, field: 'volume', value: '2' });
    fixture.detectChanges();
    const scroller = fixture.nativeElement.querySelector(
      'app-pricing-grid .table-scroll',
    ) as HTMLElement;
    Object.defineProperties(scroller, {
      clientHeight: { value: 500 },
      scrollHeight: { value: 1000 },
      scrollTop: { value: 450 },
    });
    scroller.dispatchEvent(new Event('scroll'));
    const request = http.expectOne((r) => r.url === '/v2/api/pricing/configs');
    expect(request.request.params.get('page')).toBe('2');
    request.flush({
      items: [{ ...row, offer_id: 'B' }],
      total: 26,
      page: 2,
      page_size: 25,
      ready_on_page: 1,
      blocked_on_page: 0,
      inactive_on_page: 0,
      uncalculated_total: 0,
    });
    expect(page.data()!.items.map((r) => r.offer_id)).toEqual(['A', 'B']);
    expect(page.drafts()['A']['volume']).toBe('2');
    expect(page.loadedThroughPage()).toBe(2);
    http.verify();
  });
  it('ignores an append response from before a list refresh', () => {
    const { page, http } = setup();
    page.data.set({
      items: [row],
      total: 300,
      page: 1,
      page_size: 250,
      ready_on_page: 1,
      blocked_on_page: 0,
      inactive_on_page: 0,
      uncalculated_total: 0,
    });
    page.loadMore();
    const old = http.expectOne((r) => r.url === '/v2/api/pricing/configs');
    page.reload();
    http
      .expectOne((r) => r.url === '/v2/api/pricing/configs')
      .flush({
        items: [row],
        total: 1,
        page: 1,
        page_size: 250,
        ready_on_page: 1,
        blocked_on_page: 0,
        inactive_on_page: 0,
        uncalculated_total: 0,
      });
    old.flush({ items: [{ ...row, offer_id: 'OLD' }], total: 300 });
    expect(page.data()!.items.map((r) => r.offer_id)).toEqual(['A']);
    http.verify();
  });
  it('wires the visible working-cell save button to its local calculation handler', async () => {
    const { fixture, page, http } = setup();
    vi.spyOn(page, 'changed').mockImplementation(() => {});
    page.mode.set('single');
    page.data.set({
      items: [row],
      total: 1,
      page: 1,
      page_size: 250,
      ready_on_page: 1,
      blocked_on_page: 0,
      inactive_on_page: 0,
      uncalculated_total: 0,
    });
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    root.querySelector<HTMLButtonElement>('[aria-label="Изменить Минималка, ₽ — A"]')!.click();
    fixture.detectChanges();
    const input = root.querySelector<HTMLInputElement>('input[aria-label="Минималка, ₽ — A"]')!;
    input.value = '700';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('[aria-label="Сохранить Минималка, ₽ — A"]')!.click();
    const request = http.expectOne('/v2/api/pricing/editor/working');
    expect(request.request.body.value).toEqual({ min_price: '700' });
    request.flush({ saved: true });
    http.verify();
  });
  it('saves a row draft before calculating it, without changing other drafts', () => {
    const { page, http } = setup();
    vi.spyOn(page, 'changed').mockImplementation(() => {});
    page.stage({ row, field: 'volume', value: '2' });
    page.stage({ row: { ...row, offer_id: 'B' }, field: 'volume', value: '3' });
    page.recalculateOne('A');
    const request = http.expectOne('/v2/api/pricing/editor/save');
    expect(request.request.body.offer_id).toBe('A');
    expect(request.request.body.recalculate).toBe(true);
    request.flush({ saved: true, calculation: { ok: true } });
    expect(Object.keys(page.drafts())).toEqual(['B']);
    http.expectNone('/v2/api/pricing/editor/recalc');
    http.verify();
  });
  it('allows an explicit row recalculation while bulk recalculation still skips protected rows', () => {
    const { page, http } = setup();
    vi.spyOn(page, 'changed').mockImplementation(() => {});
    page.recalculateOne('A');
    const rowRequest = http.expectOne('/v2/api/pricing/editor/recalc');
    expect(rowRequest.request.body.skip_locked).toBe(false);
    rowRequest.flush({ total: 1, recalculated: 1 });
    page.recalculateAll();
    const bulkRequest = http.expectOne('/v2/api/pricing/editor/recalc');
    expect(bulkRequest.request.body.skip_locked).toBe(true);
    bulkRequest.flush({ total: 2, recalculated: 1, skipped: 1 });
    http.verify();
  });
});

beforeEach(() => TestBed.configureTestingModule({ imports: [PricingPageModule] }));
