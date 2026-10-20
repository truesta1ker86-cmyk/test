import { OrdersPageModule } from '../../components/orders/orders.module';
import { OrderDetailsModule } from '../../components/order-detail/order-detail.module';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { OrderFilterComponent } from '../../components/orders/order-filter/order-filter.component';
import { FilterSelectComponent } from '../../../../shared/directives/filter-panel/components/filter-select/filter-select.component';
import { FilterTextComponent } from '../../../../shared/directives/filter-panel/components/filter-text/filter-text.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { SessionContext } from '../../../../core/infrastructure/services/session-context.service';
import { OrdersComponent } from '../../components/orders/orders.component';
import { OrderDetails } from '../../components/order-detail/order-detail.component';
import { WorkspaceApi } from '../services/workspace-api.service';
import { Order, ListPage, OrderDetail } from '../interfaces/contracts.interfaces';
import { canLabel, canPrepare, sortOperational } from '../utils/operational-logic.utils';
import { status } from '../utils/format.utils';

const row: Order = {
  posting_number: 'QA-2',
  scheme: 'fbs',
  status: 'awaiting_packaging',
  in_process_at: '2026-10-16T10:00:00Z',
  shipment_date: null,
  delivering_date: null,
  total_price: '1200',
  currency: 'RUB',
  updated_at: '2026-10-16',
  items: [
    {
      offer_id: 'A-001',
      sku: 501,
      name: 'Желоб',
      quantity: '1',
      price: '1200',
      main_image: 'data:image/png;base64,AA==',
    },
  ],
};

const ready: Order = { ...row, posting_number: 'QA-10', status: 'awaiting_delivering' };

const dialogMethods = ['showModal', 'close'] as const;
const originalDialogMethods = dialogMethods.map((name) =>
  Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, name),
);
beforeAll(() =>
  dialogMethods.forEach((name) =>
    Object.defineProperty(HTMLDialogElement.prototype, name, {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        name === 'close' ? this.removeAttribute('open') : this.setAttribute('open', '');
      },
    }),
  ),
);
afterAll(() =>
  dialogMethods.forEach((name, index) =>
    originalDialogMethods[index]
      ? Object.defineProperty(HTMLDialogElement.prototype, name, originalDialogMethods[index]!)
      : Reflect.deleteProperty(HTMLDialogElement.prototype, name),
  ),
);

function response(): ListPage {
  return {
    local_preview: true,
    items: [row, ready, { ...row, posting_number: 'FBO', scheme: 'fbo' }],
    meta: { total: 3, page: 1, page_size: 50, has_more: false },
    summary: { total: 8, current: 3, completed: 5 },
    statuses: ['awaiting_packaging', 'delivered'],
    snapshot_at: '2026-10-16',
    available_label_ids: ['QA-10', 'HIDDEN'],
    column_values: {},
  };
}

function configure(entity = 'orders') {
  const params = new BehaviorSubject(convertToParamMap({}));
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { data: { entity } }, queryParamMap: params },
      },
    ],
  });
  TestBed.inject(SessionContext).accept({
    tenant_id: 4,
    name: 'Fixture',
    actor_name: 'Owner',
    role: 'owner',
    is_owner: true,
    expires_in_seconds: 3600,
  });
  return {
    params,
    navigate: vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true),
    http: TestBed.inject(HttpTestingController),
  };
}

function setup(entity = 'orders') {
  const env = configure(entity),
    fixture = TestBed.createComponent(OrdersComponent),
    page = fixture.componentInstance;
  fixture.detectChanges();
  env.http
    .expectOne((r) => r.url.endsWith('/' + entity))
    .flush(
      entity === 'orders'
        ? response()
        : {
            ...response(),
            items: [
              {
                return_id: 1,
                posting_number: 'QA-7',
                offer_id: 'A-001',
                name: 'Желоб',
                scheme: 'fbs',
                returned_at: null,
                returns_amount: '0',
                currency: 'RUB',
                status: 'ReceivedBySeller',
              },
            ],
          },
    );
  fixture.detectChanges();
  return {
    ...env,
    fixture,
    page,
    setParams: (value: ReturnType<typeof convertToParamMap>) => {
      env.params.next(value);
      fixture.detectChanges();
    },
  };
}

describe('v1 orders and returns', () => {
  it('updates selection exactly once when the rendered checkbox is clicked', () => {
    const { fixture, page, http } = setup();
    const checkbox = fixture.nativeElement.querySelectorAll(
      'tbody p-checkbox input',
    )[1] as HTMLInputElement;
    checkbox.click();
    fixture.detectChanges();
    expect(page.selected().map((row) => row.posting_number)).toEqual(['QA-10']);
    expect(checkbox.checked).toBe(true);
    checkbox.click();
    fixture.detectChanges();
    expect(page.selected()).toEqual([]);
    expect(checkbox.checked).toBe(false);
    http.verify();
  });
  it('opens the posting button without also changing row selection', () => {
    const { fixture, page, http, navigate } = setup();
    (fixture.nativeElement.querySelector('tbody .record-link') as HTMLButtonElement).click();
    expect(navigate.mock.calls.at(-1)?.[1]?.queryParams).toEqual({ posting: 'QA-2' });
    expect(page.selected()).toEqual([]);
    http.verify();
  });
  it('resets column rules and dates together with the original filter controls', () => {
    const { fixture, setParams, navigate, http } = setup();
    setParams(
      convertToParamMap({
        column_filters: '{"scheme":{"text":"realFBS"}}',
        start: '2026-10-01',
        end: '2026-10-17',
      }),
    );
    http.expectOne((r) => r.url.endsWith('/orders')).flush(response());
    fixture.detectChanges();
    const filter = fixture.debugElement.query(By.directive(OrderFilterComponent))
      .componentInstance as OrderFilterComponent;
    filter.resetFilter();
    expect(navigate.mock.calls.at(-1)?.[1]?.queryParams).toMatchObject({
      column_filters: '',
      start: '',
      end: '',
      q: '',
      scheme: '',
      lifecycle: 'current',
    });
    http.verify();
  });
  it('preserves unfinished search while the original status options refresh', async () => {
    const { fixture, page, navigate, http } = setup();
    await fixture.whenStable();
    const filter = fixture.debugElement.query(By.directive(OrderFilterComponent));
    const text = filter.query(By.directive(FilterTextComponent))
      .componentInstance as FilterTextComponent;
    (text as any).updateValue('A-001');
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
    expect((filter.componentInstance as OrderFilterComponent).search).toBe('A-001');
    (filter.componentInstance as OrderFilterComponent).applyFilter();
    expect(navigate.mock.calls.at(-1)?.[1]?.queryParams).toMatchObject({
      q: 'A-001',
      lifecycle: 'current',
      page: 1,
    });
    expect(page.loading()).toBe(false);
    http.verify();
  });
  it('keeps order lifecycle out of the returns query when reusing the original filter', async () => {
    const { fixture, navigate, http } = setup('returns');
    await fixture.whenStable();
    (
      fixture.debugElement.query(By.directive(OrderFilterComponent))
        .componentInstance as OrderFilterComponent
    ).applyFilter();
    expect(navigate.mock.calls.at(-1)?.[1]?.queryParams).toMatchObject({ lifecycle: '', page: 1 });
    http.verify();
  });
  it('applies the original order filter to the existing query and preserves hidden selection', async () => {
    const { fixture, page, navigate, http } = setup();
    await fixture.whenStable();
    page.selected.set([{ ...ready, posting_number: 'HIDDEN' }]);
    const filter = fixture.debugElement.query(By.directive(OrderFilterComponent));
    const scheme = filter
      .queryAll(By.directive(FilterSelectComponent))
      .map((n) => n.componentInstance as FilterSelectComponent)
      .find((c) => c.key === 'scheme')!;
    (scheme as any).updateValue('fbo');
    expect(navigate.mock.calls.at(-1)?.[1]?.queryParams).toMatchObject({
      scheme: 'fbo',
      lifecycle: 'current',
      page: 1,
    });
    expect(page.selected().map((row) => row.posting_number)).toEqual(['HIDDEN']);
    http.verify();
  });
  it('sorts headings locally in both directions without losing the selection', () => {
    const { page, http, fixture } = setup();
    const originalRow = fixture.nativeElement.querySelector('[data-posting="QA-10"]');
    page.toggle(ready, true);
    page.sortHeading('posting_number');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-posting="QA-10"]')).toBe(originalRow);
    expect(page.rows().map((r) => r.posting_number)).toEqual(['FBO', 'QA-2', 'QA-10']);
    page.sortHeading('posting_number');
    expect(page.rows().map((r) => r.posting_number)).toEqual(['QA-10', 'QA-2', 'FBO']);
    expect(page.selected().map((row) => row.posting_number)).toEqual(['QA-10']);
    expect(page.data()?.items[0].posting_number).toBe('QA-2');
    http.expectNone((r) => r.url.endsWith('/orders'));
    http.verify();
  });
  it('preserves zero and negative numbers, missing dates last and the original snapshot order', () => {
    const values = [
      { ...ready, total_price: '0' },
      { ...row, total_price: '-4' },
      { ...row, posting_number: 'QA-1', total_price: null, in_process_at: null },
    ];
    expect(
      sortOperational(values, 'orders', 'amount', false).map((r) => (r as Order).total_price),
    ).toEqual(['-4', '0', null]);
    expect(
      sortOperational(values, 'orders', 'amount', true).map((r) => (r as Order).total_price),
    ).toEqual(['0', '-4', null]);
    expect(sortOperational(values, 'orders', 'date', true).at(-1)?.posting_number).toBe('QA-1');
    expect(values[0].posting_number).toBe('QA-10');
  });
  it('loads only the requested page, even when the API reports more pages', () => {
    const { http } = configure();
    const api = TestBed.inject(WorkspaceApi),
      received: ListPage[] = [];
    api.listPage('orders', {} as never, 2, 25).subscribe((page) => received.push(page));
    const request = http.expectOne((r) => r.url.endsWith('/orders'));
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('page_size')).toBe('25');
    request.flush({
      ...response(),
      items: [row],
      meta: { total: 200, page: 2, page_size: 25, has_more: true },
    });
    expect(received[0].items).toEqual([row]);
    expect(received[0].meta.total).toBe(200);
    http.expectNone((r) => r.url.endsWith('/orders'));
    http.verify();
  });
  it('allows cancelling a page request without starting the next page', () => {
    const { http } = configure();
    const subscription = TestBed.inject(WorkspaceApi)
      .listPage('orders', {} as never, 1, 50)
      .subscribe();
    const request = http.expectOne((r) => r.url.endsWith('/orders'));
    subscription.unsubscribe();
    expect(request.cancelled).toBe(true);
    http.expectNone((r) => r.url.endsWith('/orders'));
    http.verify();
  });
  it('has two tabs, source columns/actions and product preview markers', () => {
    const { fixture, http } = setup(),
      root: HTMLElement = fixture.nativeElement;
    expect(root.querySelectorAll('[role=tab]').length).toBe(2);
    expect(root.querySelector('.list-total')?.textContent).toContain('3 из 3');
    expect(root.querySelectorAll('thead th').length).toBe(8);
    expect(root.querySelectorAll('app-column-filter').length).toBe(6);
    expect(root.textContent).toContain('Собрать заказ');
    expect(root.textContent).not.toContain('Отгрузить до');
    expect(
      root
        .querySelector('[data-product-preview="A-001"]')
        ?.getAttribute('data-product-preview-name'),
    ).toBe('Желоб');
    http.verify();
  });
  it('selects only ready FBS, retains hidden selection and clears it on completed', () => {
    const { page, http, setParams } = setup();
    page.toggle(row, true);
    expect(page.selected().length).toBe(0);
    page.selectAvailable();
    expect(page.selected().map((row) => row.posting_number)).toEqual(['QA-10']);
    page.selected.update((s) => [...s, { ...ready, posting_number: 'HIDDEN' }]);
    setParams(convertToParamMap({ q: 'other' }));
    http.expectOne((r) => r.url.endsWith('/orders')).flush({ ...response(), items: [] });
    expect(page.hiddenSelected()).toBe(2);
    setParams(convertToParamMap({ lifecycle: 'completed' }));
    http
      .expectOne((r) => r.url.endsWith('/orders'))
      .flush({ ...response(), available_label_ids: [], items: [] });
    expect(page.selected().length).toBe(0);
    http.verify();
  });
  it('resets incompatible status and preserves contextual FBO labels', () => {
    const { page, navigate, http, setParams } = setup();
    page.form.controls['status'].setValue('awaiting_packaging');
    page.lifecycle('completed');
    expect(navigate.mock.calls.at(-1)?.[1]?.queryParams).toMatchObject({
      lifecycle: 'completed',
      status: '',
      page: 1,
    });
    setParams(convertToParamMap({ lifecycle: 'completed', status: 'awaiting_packaging' }));
    http.expectOne((r) => r.url.endsWith('/orders')).flush(response());
    expect(page.query().status).toBe('');
    expect(page.statuses()).not.toContain('awaiting_packaging');
    expect(status('awaiting_packaging', 'fbo')).toBe('Упаковывает маркетплейс');
    http.verify();
  });
  it('cancels an older refresh when filters change', () => {
    const { page, http, setParams, fixture } = setup();
    page.refresh();
    fixture.detectChanges();
    const old = http.expectOne((r) => r.url.endsWith('/orders'));
    setParams(convertToParamMap({ q: 'new' }));
    expect(old.cancelled).toBe(true);
    http.expectOne((r) => r.url.endsWith('/orders')).flush({ ...response(), items: [ready] });
    expect(page.data()?.items).toEqual([ready]);
    http.verify();
  });
  it('opens/closes a posting without reloading or losing list parameters', () => {
    const { page, http, setParams, navigate } = setup();
    setParams(convertToParamMap({ posting: 'QA-10' }));
    http
      .expectOne((r) => r.url.endsWith('/orders/detail'))
      .flush({ order: ready, actions: [], notice: '', marketplace_actions_enabled: false });
    expect(page.detail()).toBe('QA-10');
    http.expectNone((r) => r.url.endsWith('/orders'));
    page.close();
    expect(navigate.mock.calls.at(-1)?.[1]).toMatchObject({
      queryParams: { posting: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    http.verify();
  });
  it('requests global values lazily with the canonical amount column key', () => {
    const { fixture, http } = setup();
    const root: HTMLElement = fixture.nativeElement;
    http.expectNone((r) => r.url.endsWith('/column-values'));
    root.querySelector<HTMLButtonElement>('[aria-label="Фильтр: Сумма"]')!.click();
    fixture.detectChanges();
    const amount = http.expectOne((r) => r.url.endsWith('/column-values'));
    expect(amount.request.params.get('field')).toBe('amount');
    amount.flush({ values: ['990'], meta: { total: 1, page: 1, has_more: false } });
    fixture.detectChanges();
    expect(root.querySelector('[role=alert]')).toBeNull();
    http.verify();
  });
  it('combines multiselect column rules with search and resets page', () => {
    const { page, navigate, http } = setup();
    page.form.controls['q'].setValue('A-001');
    page.columnChanged({
      field: 'scheme',
      rule: { values: ['FBS', 'FBO'], text: '', operator: 'contains', min: '', max: '' },
    });
    const q = navigate.mock.calls.at(-1)?.[1]?.queryParams!;
    expect(q['q']).toBe('A-001');
    expect(q['page']).toBe(1);
    expect(JSON.parse(q['column_filters']).scheme.values).toEqual(['FBS', 'FBO']);
    http.verify();
  });
  it('keeps returns as one source table and retains zero amount and article preview', () => {
    const { fixture, http } = setup('returns'),
      root: HTMLElement = fixture.nativeElement;
    expect(root.querySelectorAll('[role=tab]').length).toBe(0);
    expect(root.querySelectorAll('thead th').length).toBe(5);
    expect(root.querySelector('tbody tr')?.querySelectorAll('td')).toHaveLength(5);
    expect(root.querySelector('tbody input[type=checkbox]')).toBeNull();
    expect(root.textContent).toContain('0,00');
    expect(root.querySelector('[data-product-preview="A-001"]')).not.toBeNull();
    expect(root.querySelector('[formControlName=scheme]')).toBeNull();
    http.verify();
  });
  it('enforces legacy label status and realFBS/FBO eligibility', () => {
    expect(canLabel({ ...ready, status: 'awaiting_deliver' })).toBe(true);
    expect(canLabel({ ...ready, scheme: 'fbo' })).toBe(false);
    expect(canLabel({ ...ready, scheme: 'rfbs' })).toBe(false);
    expect(canPrepare({ ...row, scheme: 'rfbs' })).toBe(true);
    expect(canPrepare({ ...row, scheme: 'fbo' })).toBe(false);
  });
  it('blocks requests without local preview and assembly for a viewer', () => {
    const { http } = configure(),
      api = TestBed.inject(WorkspaceApi),
      errors: string[] = [];
    api.localPrepare('QA-2', false).subscribe({ error: (e) => errors.push(e.message) });
    api.localLabels(['QA-10'], false).subscribe({ error: (e) => errors.push(e.message) });
    api.localExcel({} as never, false).subscribe({ error: (e) => errors.push(e.message) });
    TestBed.inject(SessionContext).session.update((s) => ({
      ...s!,
      is_owner: false,
      role: 'viewer',
    }));
    api.localPrepare('QA-2', true).subscribe({ error: (e) => errors.push(e.message) });
    expect(errors.length).toBe(4);
    http.expectNone(() => true);
    http.verify();
  });
});

describe('Local order action preview', () => {
  let show: PropertyDescriptor | undefined, close: PropertyDescriptor | undefined;
  beforeEach(() => {
    show = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
    close = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: vi.fn(),
    });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    for (const [key, value] of [
      ['showModal', show],
      ['close', close],
    ] as const) {
      if (value) Object.defineProperty(HTMLDialogElement.prototype, key, value);
      else delete (HTMLDialogElement.prototype as unknown as Record<string, unknown>)[key];
    }
  });
  function detail(scheme = 'fbs', local = true) {
    const env = configure(),
      fixture = TestBed.createComponent(OrderDetails);
    fixture.componentRef.setInput('posting', 'QA-2');
    fixture.detectChanges();
    const data: OrderDetail = {
      local_preview: local,
      order: { ...row, scheme },
      actions:
        scheme === 'fbo'
          ? []
          : [
              {
                code: 'prepare_for_shipment',
                label: 'Подтвердить упаковку',
                description: 'Test',
                can_execute: false,
              },
            ],
      notice: 'Local only',
      marketplace_actions_enabled: false,
    };
    env.http.expectOne((r) => r.url.endsWith('/orders/detail')).flush(data);
    fixture.detectChanges();
    return { ...env, fixture, page: fixture.componentInstance, data };
  }
  it('uses the local endpoint once, updates preview and emits one refresh', () => {
    const { page, http, data } = detail(),
      changed = vi.fn();
    page.changed.subscribe(changed);
    page.prepare();
    page.prepare();
    const request = http.expectOne('/v2/api/workspace-v2/orders/local/prepare');
    expect(request.request.body).toEqual({ posting_number: 'QA-2', confirm: true });
    request.flush({ ...data, order: ready, actions: [] });
    expect(changed).toHaveBeenCalledOnce();
    expect(page.canPack()).toBe(false);
    http.verify();
  });
  it('keeps FBO read only', () => {
    const { page, http } = detail('fbo');
    page.prepare();
    http.expectNone((r) => r.method === 'POST');
    http.verify();
  });
  it('renders a read-only copied order with aligned item columns and truthful source', () => {
    const { fixture, http } = detail('fbs', false);
    const table = fixture.nativeElement.querySelector('table');
    expect(table.querySelectorAll('th').length).toBe(3);
    expect(table.querySelectorAll('tbody tr td').length).toBe(3);
    expect(table.querySelectorAll('input[type="checkbox"]').length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('сохранённые данные V2');
    http.verify();
  });
  it('retains recoverable errors without changing status', () => {
    const { page, http } = detail();
    page.prepare();
    http
      .expectOne('/v2/api/workspace-v2/orders/local/prepare')
      .flush({ detail: 'Test failure' }, { status: 409, statusText: 'Conflict' });
    expect(page.saving()).toBe(false);
    expect(page.data()?.order.status).toBe('awaiting_packaging');
    expect(page.error()).toContain('Test failure');
    http.verify();
  });
});

beforeEach(() =>
  TestBed.configureTestingModule({ imports: [OrdersPageModule, OrderDetailsModule] }),
);
