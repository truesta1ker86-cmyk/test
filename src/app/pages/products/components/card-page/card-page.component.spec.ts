import { CardPageModule } from './card-page.module';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { SessionContext } from '../../../../core/infrastructure/services/session-context.service';
import { CardPage } from './card-page.component';
import { CardLocalDrafts } from './infrastructure/services/card-local-drafts.service';
import type { FullWorkspace } from '../../infrastructure/interfaces/contracts.interfaces';

const workspace = (offer = 'A', name = 'Товар A'): FullWorkspace => ({
  offer_id: offer,
  version: '1',
  working_copy: {
    offer_id: offer,
    name,
    description: 'Описание',
    images: [],
    attributes: [],
    complex_attributes: [],
    price: '1200',
  },
  snapshot: {
    offer_id: offer,
    name: 'Снимок Ozon',
    description: 'Описание',
    images: [],
    attributes: [],
    complex_attributes: [],
    price: '1200',
  },
  snapshot_complete: true,
  snapshot_synced_at: '2026-10-16T08:00:00Z',
  attributes_meta: [],
  is_new: false,
  category: null,
  validation: { ready: false, required_total: 9, required_missing: 1, issues: [] },
  versions: [],
  changes: [],
});

describe('Local product card drafts and request boundaries', () => {
  beforeEach(() => sessionStorage.clear());
  function setup() {
    const route = new BehaviorSubject(convertToParamMap({ offer_id: 'A' }));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: route,
            snapshot: {
              routeConfig: { path: 'products/card' },
              queryParamMap: convertToParamMap({ offer_id: 'A' }),
            },
          },
        },
      ],
    });
    TestBed.inject(SessionContext).accept({
      tenant_id: 4,
      name: 'Test',
      actor_name: 'Tester',
      role: 'owner',
      is_owner: true,
      expires_in_seconds: 3600,
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(CardPage);
    return {
      page: fixture.componentInstance,
      fixture,
      route,
      http: TestBed.inject(HttpTestingController),
    };
  }
  function finish(http: HttpTestingController, offer = 'A') {
    http
      .expectOne((r) => r.url === '/v2/api/cards-v2/media' && r.params.get('offer_id') === offer)
      .flush({ items: [] });
    http
      .expectOne((r) => r.url === '/v2/api/catalog-v2/item' && r.params.get('offer_id') === offer)
      .flush({ version: '1' });
  }
  it('renders the complete card form with its child components after loading', async () => {
    const { fixture, http } = setup();
    http.expectOne((r) => r.url === '/v2/api/cards-v2/workspace').flush(workspace());
    finish(http);
    fixture.detectChanges();
    await fixture.whenStable();
    for (const request of http.match(() => true)) request.flush({ items: [], enabled: false });
    expect(fixture.nativeElement.querySelector('app-card-gallery')).not.toBeNull();
    http.verify();
  });
  it('keeps an unsaved name when switching card sections', () => {
    const { page, http } = setup();
    http.expectOne((r) => r.url === '/v2/api/cards-v2/workspace').flush(workspace());
    finish(http);
    page.change('name', 'Несохранённое');
    page.goSection('media');
    page.goSection('history');
    expect(page.form.controls['name'].value).toBe('Несохранённое');
    expect(page.dirty()).toBe(true);
    http.verify();
  });
  it('ignores a workspace returned for the previous product', () => {
    const { page, http, route } = setup();
    const old = http.expectOne((r) => r.url === '/v2/api/cards-v2/workspace');
    route.next(convertToParamMap({ offer_id: 'B' }));
    http.expectOne((r) => r.url === '/v2/api/cards-v2/workspace').flush(workspace('B', 'Товар B'));
    finish(http, 'B');
    old.flush(workspace());
    expect(page.workspace()?.offer_id).toBe('B');
    expect(page.form.controls['name'].value).toBe('Товар B');
    http.verify();
  });
  it('returns the snapshot to the form as an unsaved draft and saves a real diff', () => {
    const { page, http } = setup();
    http.expectOne((r) => r.url === '/v2/api/cards-v2/workspace').flush(workspace());
    finish(http);
    page.resetToSnapshot();
    expect(page.dirty()).toBe(true);
    http.expectNone('/v2/api/cards-v2/save');
    page.save();
    const save = http.expectOne('/v2/api/cards-v2/save');
    expect(save.request.body.changes.name).toBe('Снимок Ozon');
    save.flush({ ...workspace('A', 'Снимок Ozon'), version: '2' });
    expect(page.dirty()).toBe(false);
    http.verify();
  });
  it('does not replace a newer category preview with an earlier response', () => {
    const { page, http } = setup();
    http.expectOne((r) => r.url === '/v2/api/cards-v2/workspace').flush(workspace());
    finish(http);
    page.selectCategory({
      description_category_id: 100,
      type_id: 200,
      category_name: 'A',
      type_name: 'A',
      path: 'A',
    });
    const old = http.expectOne('/v2/api/cards-v2/category/preview');
    page.selectCategory({
      description_category_id: 101,
      type_id: 202,
      category_name: 'B',
      type_name: 'B',
      path: 'B',
    });
    http
      .expectOne('/v2/api/cards-v2/category/preview')
      .flush({ category_id: 101, type_id: 202, kept: [], removed: [], attributes: [] });
    old.flush({ category_id: 100, type_id: 200, kept: [], removed: [], attributes: [] });
    expect(page.categoryPreview()?.type_id).toBe(202);
    http.verify();
  });
  it('rejects a zero price before posting to the local API', () => {
    const { page, http } = setup();
    http.expectOne((r) => r.url === '/v2/api/cards-v2/workspace').flush(workspace());
    finish(http);
    page.change('price', '0');
    page.save();
    http.expectNone('/v2/api/cards-v2/save');
    expect(page.error()).not.toBe('');
    http.verify();
  });
  it('has the five v1 steps and preserves old section links', () => {
    const { page, http, route } = setup();
    http.expectOne((r) => r.url === '/v2/api/cards-v2/workspace').flush(workspace());
    finish(http);
    expect(page.tabs.map((t) => t.id)).toEqual([
      'onec',
      'image',
      'content',
      'attributes',
      'review',
    ]);
    route.next(convertToParamMap({ offer_id: 'A', section: 'history' }));
    expect(page.section()).toBe('review');
    expect(page.historyOpen()).toBe(true);
    page.goSection('media');
    expect(page.section()).toBe('image');
    http.verify();
  });
  it('uses the item response version for the inline binding editor', () => {
    const { page, http } = setup();
    http.expectOne((r) => r.url === '/v2/api/cards-v2/workspace').flush(workspace());
    http.expectOne((r) => r.url === '/v2/api/cards-v2/media').flush({ items: [] });
    http
      .expectOne((r) => r.url === '/v2/api/catalog-v2/item')
      .flush({ version: '9', row: { offer_id: 'A', sku_1c: 'SKU' } });
    expect(page.binding()?.version).toBe('9');
    http.verify();
  });
  it('keeps the last typed characters on immediate exit before debounce', () => {
    const { page, http, fixture } = setup();
    http.expectOne((r) => r.url === '/v2/api/cards-v2/workspace').flush(workspace());
    finish(http);
    page.change('name', 'Последние символы');
    page.ngOnDestroy();
    expect(
      fixture.debugElement.injector.get(CardLocalDrafts).get('o1c-v2-card:4:A')?.fields['name'],
    ).toBe('Последние символы');
    http.verify();
  });
  it('keeps category/type controls synchronized when a proposed change is cancelled', () => {
    const { page, http } = setup(),
      data = workspace();
    data.working_copy = { ...data.working_copy, description_category_id: 100, type_id: 200 };
    http.expectOne((r) => r.url === '/v2/api/cards-v2/workspace').flush(data);
    finish(http);
    expect(page.sidebarCategoryControl.value).toBe('100');
    expect(page.sidebarTypeControl.value).toBe('200');
    page.changeSidebarCategory('101');
    page.cancelCategory();
    expect(page.sidebarCategoryControl.value).toBe('100');
    expect(page.sidebarTypeControl.value).toBe('200');
    http.verify();
  });
  it('compares unsaved fields to the snapshot without including image data in the UI', () => {
    const { page, http } = setup();
    http.expectOne((r) => r.url === '/v2/api/cards-v2/workspace').flush(workspace());
    finish(http);
    page.change('name', 'Новая номенклатура');
    page.changeImages(['data:image/png;base64,AA==']);
    expect(page.reviewChanges().find((c) => c.field === 'name')).toMatchObject({
      before: 'Снимок Ozon',
      after: 'Новая номенклатура',
    });
    expect(page.reviewChanges().find((c) => c.field === 'images')?.after).toBe('1 фото');
    http.verify();
  });
  it('invalidates an older successful validation when current fields change', () => {
    const { page, http } = setup();
    const data = workspace();
    data.validation = { ready: true, required_total: 1, required_missing: 0, issues: [] };
    http.expectOne((r) => r.url === '/v2/api/cards-v2/workspace').flush(data);
    finish(http);
    page.change('name', '');
    expect(page.validation()).toBeNull();
    http.verify();
  });
  it('does not save while a photo is uploading or write from a readonly account', () => {
    const { page, http } = setup();
    http.expectOne((r) => r.url === '/v2/api/cards-v2/workspace').flush(workspace());
    finish(http);
    page.change('name', 'Правка');
    page.uploading.set(true);
    page.save();
    http.expectNone('/v2/api/cards-v2/save');
    page.uploading.set(false);
    TestBed.inject(SessionContext).session.update((s) => ({
      ...s!,
      is_owner: false,
      role: 'viewer',
    }));
    page.save();
    page.restore(1);
    page.create();
    http.expectNone((r) => r.method === 'POST');
    http.verify();
  });
  it('retains the current sidebar category while search returns another category', () => {
    const { page, http } = setup(),
      data = workspace();
    data.working_copy = { ...data.working_copy, description_category_id: 100, type_id: 200 };
    data.category = {
      category_id: 100,
      type_id: 200,
      name: 'Водосток',
      type_name: 'Желоб',
      path: 'Водосток / Желоб',
    };
    http.expectOne((r) => r.url === '/v2/api/cards-v2/workspace').flush(data);
    finish(http);
    page.findCategories();
    http
      .expectOne((r) => r.url === '/v2/api/cards-v2/categories')
      .flush({
        items: [
          {
            description_category_id: 101,
            type_id: 202,
            category_name: 'Крепёж',
            type_name: 'Саморез',
            path: 'Крепёж / Саморез',
          },
        ],
        total: 1,
      });
    expect(page.sidebarCategories().map((c) => c.description_category_id)).toEqual([100, 101]);
    expect(page.sidebarTypes().map((c) => c.type_id)).toContain(200);
    expect(page.sidebarCategoryControl.value).toBe('100');
    http.verify();
  });
  it('clears an old upload state when another product opens', () => {
    const { page, http, route } = setup();
    http.expectOne((r) => r.url === '/v2/api/cards-v2/workspace').flush(workspace());
    finish(http);
    page.uploading.set(true);
    route.next(convertToParamMap({ offer_id: 'B' }));
    http.expectOne((r) => r.url === '/v2/api/cards-v2/workspace').flush(workspace('B'));
    finish(http, 'B');
    expect(page.uploading()).toBe(false);
    http.verify();
  });
});

beforeEach(() => TestBed.configureTestingModule({ imports: [CardPageModule] }));
