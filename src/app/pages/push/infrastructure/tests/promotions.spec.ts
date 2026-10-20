import { PromotionsPageModule } from '../../components/promotions-page/promotions-page.module';
import { PromotionModelEditorModule } from '../../components/model-editor/model-editor.module';
import { CatalogCampaignModule } from '../../../products/components/catalog-campaign/catalog-campaign.module';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { SessionContext } from '../../../../core/infrastructure/services/session-context.service';
import { PromotionsPage } from '../../components/promotions-page/promotions-page.component';
import { PromotionModelEditor } from '../../components/model-editor/model-editor.component';
import { PromotionsApi } from '../services/promotions-api.service';
import { CatalogCampaign } from '../../../products/components/catalog-campaign/catalog-campaign.component';
import { PromoWorkspace, PlanRow, PromotionPlan } from '../interfaces/contracts.interfaces';
import { matchesColumns, sortTable } from '../utils/table-logic.utils';

const dialogMethods = ['showModal', 'close'] as const;

const dialogDescriptors = dialogMethods.map((k) =>
  Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, k),
);

beforeAll(() =>
  dialogMethods.forEach((k) =>
    Object.defineProperty(HTMLDialogElement.prototype, k, {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.open = k === 'showModal';
      },
    }),
  ),
);

afterAll(() =>
  dialogMethods.forEach((k, i) => {
    const d = dialogDescriptors[i];
    if (d) Object.defineProperty(HTMLDialogElement.prototype, k, d);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, k);
  }),
);

const root = '/v2/api/workspace-v2/promotions';

function workspace(): PromoWorkspace {
  return {
    local_preview: true,
    can_manage: true,
    sends_enabled: false,
    revision: 'r1',
    categories: [
      { category_id: 100, category: 'Водосток', products: 2, model: 2 },
      { category_id: 101, category: 'Крепёж', products: 1, model: null },
    ],
    products: ['A', 'B', 'C'].map((id, i) => ({
      offer_id: id,
      name: 'Товар ' + id,
      main_image: '/v2/local-media/a.svg',
      category_id: i < 2 ? 100 : 101,
      category: i < 2 ? 'Водосток' : 'Крепёж',
      model: null,
      category_model: i < 2 ? 2 : null,
      effective_model: i < 2 ? 2 : null,
      model_source: i < 2 ? 'category' : 'none',
    })),
    history: [],
    send_history: [],
    preview: {
      requires_refresh: false,
      actions: [
        {
          id: 501,
          title: 'Обычная',
          action_type: 'REGULAR',
          is_voucher_action: false,
          freeze_date: null,
        },
        {
          id: 503,
          title: 'Промокод',
          action_type: 'VOUCHER',
          is_voucher_action: true,
          freeze_date: null,
        },
      ],
      rows: [],
      totals: {},
    },
  };
}

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { queryParamMap: new BehaviorSubject(convertToParamMap({})) },
      },
    ],
  });
  TestBed.inject(SessionContext).accept({
    tenant_id: 4,
    name: 'Local',
    actor_name: 'Tester',
    role: 'owner',
    is_owner: true,
    expires_in_seconds: 3600,
  });
  return TestBed.inject(HttpTestingController);
}

function plan(rows: Partial<PlanRow>[] = []): PromotionPlan {
  return {
    operation_id: 'p1',
    status: 'prepared',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 900000).toISOString(),
    action: workspace().preview.actions[0],
    operation: 'join',
    price_mode: 'manual',
    rows: rows.map(
      (r, i) =>
        ({
          ...workspace().products[i],
          key: '501|' + i,
          action_id: 501,
          action: 'Обычная',
          participating: true,
          upcoming: false,
          current_price: '10',
          minimum_price: '100',
          desired_price: '1',
          recommended_price: '90',
          price_min_elastic: null,
          price_max_elastic: null,
          orders_7_days: 1,
          decision: 'update',
          reason: 'Проверка',
          warning: null,
          status: 'ready',
          command: 'update',
          stock: null,
          ...r,
        }) as PlanRow,
    ),
    revision: 'r1',
    sent: 0,
    sends_enabled: false,
  };
}

describe('v1 promotions local rules and table state', () => {
  it('preserves category drafts and hidden selection across filters and views', () => {
    const http = setup(),
      f = TestBed.createComponent(PromotionsPage),
      p = f.componentInstance;
    http.expectOne(root + '/workspace').flush(workspace());
    p.tab.set('categories');
    p.draft(p.categoryRow(p.rows()[0]), '1');
    p.selectFiltered();
    p.filter.update((s) => ({ ...s, q: 'Крепёж' }));
    expect(p.rows().length).toBe(1);
    expect(p.hiddenCount()).toBe(1);
    expect(p.drafts().get(100)).toBe(1);
    p.tab.set('products');
    p.tab.set('categories');
    expect(p.drafts().get(100)).toBe(1);
    p.saveCategory();
    http.expectNone(root + '/models/save');
    expect(p.bulkModel).toBe('choose');
    f.destroy();
    http.verify();
  });
  it('selects all filtered products beyond fifty and retains hidden selections', () => {
    const http = setup(),
      f = TestBed.createComponent(PromotionsPage),
      p = f.componentInstance,
      w = workspace();
    w.products = Array.from({ length: 70 }, (_, i) => ({ ...w.products[0], offer_id: 'A-' + i }));
    http.expectOne(root + '/workspace').flush(w);
    p.tab.set('products');
    expect(p.pageRows()).toHaveLength(50);
    p.page.set(2);
    expect(p.pageRows()).toHaveLength(20);
    expect(p.pageRows()[0]).toMatchObject({ offer_id: 'A-50' });
    p.selectFiltered();
    expect(p.selection().size).toBe(70);
    p.filter.update((s) => ({ ...s, q: 'A-69' }));
    expect(p.currentPage()).toBe(1);
    expect(p.pageRows()).toHaveLength(1);
    expect(p.hiddenCount()).toBe(69);
    p.selectFiltered(false);
    expect(p.selection().size).toBe(69);
    f.destroy();
    http.verify();
  });
  it('retains sorting when applying URL filters and restores it per view', () => {
    const http = setup(),
      f = TestBed.createComponent(PromotionsPage),
      p = f.componentInstance;
    http.expectOne(root + '/workspace').flush(workspace());
    p.sort('name');
    const params = TestBed.inject(ActivatedRoute).queryParamMap as BehaviorSubject<
      ReturnType<typeof convertToParamMap>
    >;
    params.next(convertToParamMap({ q: 'Товар' }));
    expect(p.sorting()).toEqual({ key: 'name', desc: false });
    params.next(convertToParamMap({ tab: 'categories' }));
    p.sort('products');
    params.next(convertToParamMap({ tab: 'campaigns' }));
    expect(p.sorting()).toEqual({ key: 'name', desc: false });
    f.destroy();
    http.verify();
  });
  it('saves only the requested category and retains other drafts during reload', () => {
    const http = setup(),
      f = TestBed.createComponent(PromotionsPage),
      p = f.componentInstance,
      w = workspace();
    http.expectOne(root + '/workspace').flush(w);
    p.tab.set('categories');
    p.draft(w.categories[0], '1');
    p.draft(w.categories[1], '2');
    p.saveCategory(w.categories[0]);
    const req = http.expectOne(root + '/models/save');
    expect(req.request.body).toMatchObject({
      model: 1,
      category_ids: [100],
      offer_ids: [],
      expected_revision: 'r1',
    });
    req.flush({ changed: 1 });
    w.categories[0].model = 1;
    http.expectOne(root + '/workspace').flush(w);
    expect(p.drafts().has(100)).toBe(false);
    expect(p.drafts().get(101)).toBe(2);
    f.destroy();
    http.verify();
  });
  it('opens the campaign from the clicked row and deduplicates bulk product IDs', () => {
    const http = setup(),
      f = TestBed.createComponent(PromotionsPage),
      p = f.componentInstance;
    http.expectOne(root + '/workspace').flush(workspace());
    p.openPlan(['A'], 503);
    expect(p.planAction()).toBe(503);
    expect(p.planOffers()).toEqual(['A']);
    f.destroy();
    http.verify();
  });
  it('cancels an older reload and makes failed reads non-writable', () => {
    const http = setup(),
      f = TestBed.createComponent(PromotionsPage),
      p = f.componentInstance;
    const old = http.expectOne(root + '/workspace');
    p.load();
    expect(old.cancelled).toBe(true);
    http.expectOne(root + '/workspace').flush(workspace());
    p.load();
    http
      .expectOne(root + '/workspace')
      .flush({ detail: 'failed' }, { status: 500, statusText: 'failed' });
    expect(p.data()?.products.length).toBe(3);
    expect(p.canWrite()).toBe(false);
    f.destroy();
    http.verify();
  });
  it('preserves product zero and inheritance in the editor request', () => {
    const http = setup(),
      f = TestBed.createComponent(PromotionModelEditor),
      p = f.componentInstance;
    f.componentRef.setInput('offers', ['A']);
    f.componentRef.setInput('state', workspace());
    p.model = '0';
    p.save();
    const first = http.expectOne(root + '/models/save');
    expect(first.request.body.model).toBe(0);
    first.flush({ changed: 1 });
    p.model = '';
    p.save();
    const second = http.expectOne(root + '/models/save');
    expect(second.request.body.model).toBeNull();
    second.flush({ changed: 1 });
    f.destroy();
    http.verify();
  });
  it('rejects real states, readers and category model zero before any request', () => {
    const http = setup(),
      api = TestBed.inject(PromotionsApi),
      w = workspace();
    api.save({ ...w, local_preview: false }, 'product', ['A'], 0).subscribe({ error: () => {} });
    api.save(w, 'category', [100], 0).subscribe({ error: () => {} });
    TestBed.inject(SessionContext).session.update((s) => ({
      ...s!,
      is_owner: false,
      role: 'reader',
    }));
    api
      .prepare(w, { action_id: 501, offer_ids: ['A'], operation: 'join', price_mode: 'model' })
      .subscribe({ error: () => {} });
    http.expectNone((r) => r.method === 'POST');
    http.verify();
  });
  it('supports multi values, exclusion, numeric bounds and natural sorting', () => {
    const rule = {
      values: ['A', 'B'],
      operator: 'not_contains' as const,
      text: 'B',
      min: '',
      max: '',
    };
    expect(matchesColumns({ name: 'A' }, { name: rule })).toBe(true);
    expect(matchesColumns({ name: 'B' }, { name: rule })).toBe(false);
    expect(
      matchesColumns({ price: '12.5' }, { price: { ...rule, values: null, text: '', min: '13' } }),
    ).toBe(false);
    expect(sortTable(['A-10', null, 'A-2'], (s) => s, false)).toEqual(['A-2', 'A-10', null]);
  });
});

describe('v1 concrete promotion local planner', () => {
  function modal() {
    const http = setup(),
      f = TestBed.createComponent(CatalogCampaign),
      p = f.componentInstance;
    f.componentRef.setInput('offers', ['A', 'B']);
    f.componentRef.setInput('initialAction', 503);
    f.detectChanges();
    http.expectOne(root + '/workspace').flush(workspace());
    return { http, f, p };
  }
  it('uses the clicked campaign and validates cents and voucher quantity before requests', () => {
    const { http, f, p } = modal();
    expect(p.actionId).toBe('503');
    p.priceMode = 'manual';
    p.manual = '1.001';
    p.inspect();
    http.expectNone(root + '/local/prepare');
    expect(p.error()).toContain('копейки');
    p.manual = '1,00';
    p.stock = '1.5';
    p.inspect();
    http.expectNone(root + '/local/prepare');
    p.stock = '3';
    p.inspect();
    const req = http.expectOne(root + '/local/prepare');
    expect(req.request.body).toEqual({
      action_id: 503,
      offer_ids: ['A', 'B'],
      operation: 'join',
      price_mode: 'manual',
      action_price: '1.00',
      stock: 3,
    });
    req.flush(plan());
    f.destroy();
    http.verify();
  });
  it('invalidates a result and ignores a reply after controls changed', () => {
    const { http, f, p } = modal();
    p.inspect();
    const req = http.expectOne(root + '/local/prepare');
    p.priceMode = 'recommended';
    p.invalidate();
    req.flush(plan([{ offer_id: 'A' }]));
    expect(p.plan()).toBeNull();
    expect(p.selected().size).toBe(0);
    f.destroy();
    http.verify();
  });
  it('only selects ready rows and preserves hidden selections through column filters', () => {
    const { http, f, p } = modal();
    p.inspect();
    http
      .expectOne(root + '/local/prepare')
      .flush(plan([{ offer_id: 'A' }, { offer_id: 'B', status: 'blocked' }, { offer_id: 'C' }]));
    expect([...p.selected()]).toEqual(['A', 'C']);
    p.query.set('A');
    expect(p.hiddenSelected()).toBe(1);
    p.selectFiltered(false);
    expect([...p.selected()]).toEqual(['C']);
    p.query.set('');
    p.toggle(p.plan()!.rows[1], true);
    expect([...p.selected()]).toEqual(['C']);
    f.destroy();
    http.verify();
  });
  it('expires the plan, rejects selection and recovers a stale result without sending', () => {
    const { http, f, p } = modal();
    p.plan.set(plan([{ offer_id: 'A' }]));
    p.now.set(Date.now() + 1000000);
    expect(p.expired()).toBe(true);
    p.selectFiltered();
    expect(p.selected().size).toBe(0);
    p.recover();
    const req = http.expectOne((r) => r.url === root + '/local/operation');
    expect(req.request.method).toBe('GET');
    req.flush({ ...plan([{ offer_id: 'A' }]), status: 'stale' });
    expect(p.expired()).toBe(true);
    expect(p.selected().size).toBe(0);
    http.expectNone((r) => /send|refresh|apply|execute/.test(r.url));
    f.destroy();
    http.verify();
  });
  it('retains null stock and forces model price mode when applying models', () => {
    const { http, f, p } = modal();
    p.operation = 'model';
    p.priceMode = 'manual';
    p.manual = '';
    p.inspect();
    const req = http.expectOne(root + '/local/prepare');
    expect(req.request.body).toMatchObject({ operation: 'model', price_mode: 'model' });
    expect(req.request.body.stock).toBeUndefined();
    req.flush(plan());
    f.destroy();
    http.verify();
  });
});

it('only permits database-copy rules with both the server marker and a copied session', () => {
  const http = setup(),
    api = TestBed.inject(PromotionsApi),
    context = TestBed.inject(SessionContext),
    state = { ...workspace(), local_preview: false, sandbox_db: true };
  expect(api.allowed(state)).toBe(false);
  context.session.update((s) => ({ ...s!, data_mode: 'sandbox_db' }));
  expect(api.allowed(state)).toBe(true);
  context.session.update((s) => ({ ...s!, is_owner: false, role: 'reader' }));
  expect(api.allowed(state)).toBe(false);
  http.verify();
});

beforeEach(() =>
  TestBed.configureTestingModule({
    imports: [PromotionsPageModule, PromotionModelEditorModule, CatalogCampaignModule],
  }),
);
