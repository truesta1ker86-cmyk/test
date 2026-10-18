import { MappingWorkspaceModule } from './mapping-workspace.module';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SessionContext } from '../../../../core/infrastructure/services/session-context.service';
import { MappingWorkspace } from './mapping-workspace.component';
import type {
  CatalogRow,
  CatalogOperation,
} from '../../../products/infrastructure/interfaces/contracts.interfaces';

const row = (id = 'A'): CatalogRow => ({
  offer_id: id,
  name: 'Упаковка 50 шт.',
  mapping_status: 'unmapped',
  units_per_item: 1,
  version: '7',
});

const op = (): CatalogOperation => ({
  operation_id: 'op',
  kind: 'mapping',
  status: 'preview',
  matched: 1,
  eligible: 1,
  applied: 0,
  undone: 0,
  conflicts: 0,
  changes: {},
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 60000).toISOString(),
  sample: [],
});

describe('local mapping workspace', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(SessionContext).accept({
      tenant_id: 4,
      name: 'Local',
      actor_name: 'Tester',
      role: 'owner',
      is_owner: true,
      expires_in_seconds: 3600,
    });
    const fixture = TestBed.createComponent(MappingWorkspace);
    fixture.componentRef.setInput('canManage', true);
    fixture.componentRef.setInput('rows', [row()]);
    const page = fixture.componentInstance,
      http = TestBed.inject(HttpTestingController);
    http
      .expectOne('/v2/api/catalog-v2/mapping/snapshot')
      .flush({ items: [{ onec_code: '001', sku_1c: 'SKU', base_units: 1 }] });
    return { page, http, fixture };
  }
  it('stages row changes without HTTP and saves exact versions without dropping other drafts', () => {
    const { page, http } = setup();
    page.edit(row(), 'identity', '001');
    page.edit(row('OUTSIDE'), 'units', '20');
    http.expectNone('/v2/api/catalog-v2/mapping/preview');
    page.save('A');
    const preview = http.expectOne('/v2/api/catalog-v2/mapping/preview');
    expect(preview.request.body.items).toEqual([
      { offer_id: 'A', identity: '001', units_per_item: 1, expected_version: '7' },
    ]);
    preview.flush(op());
    page.apply();
    http.expectOne('/v2/api/catalog-v2/apply').flush({ ...op(), status: 'applied', applied: 1 });
    expect([...page.drafts().keys()]).toEqual(['OUTSIDE']);
    http.verify();
  });
  it('opens the native review dialog and closes it when returning to the table', () => {
    const { page, http, fixture } = setup();
    page.edit(row(), 'identity', '001');
    page.save();
    http.expectOne('/v2/api/catalog-v2/mapping/preview').flush(op());
    // The test DOM lacks native dialogs; browser QA verifies actual modality.
    const prototype = HTMLDialogElement.prototype;
    const originals = ['showModal', 'close'].map((key) =>
      Object.getOwnPropertyDescriptor(prototype, key),
    );
    const show = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    const close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    });
    Object.defineProperties(prototype, {
      showModal: { configurable: true, value: show },
      close: { configurable: true, value: close },
    });
    try {
      fixture.detectChanges();
      expect(show).toHaveBeenCalledOnce();
      page.closePreview();
      fixture.detectChanges();
      expect(close).toHaveBeenCalledOnce();
      expect(fixture.nativeElement.querySelector('dialog')).toBeNull();
      http.verify();
    } finally {
      fixture.destroy();
      ['showModal', 'close'].forEach((key, i) =>
        originals[i]
          ? Object.defineProperty(prototype, key, originals[i]!)
          : Reflect.deleteProperty(prototype, key),
      );
    }
  });
  it('protects linked rows, infers units and only applies the prepared result to the table', () => {
    const { page, http, fixture } = setup();
    fixture.componentRef.setInput('selected', new Set(['A', 'LINKED']));
    page.target = '001';
    page.prepareSelection();
    http
      .expectOne('/v2/api/catalog-v2/mapping/rows')
      .flush({ items: [row(), { ...row('LINKED'), sku_1c: 'SKU' }] });
    expect(page.protectedCount()).toBe(1);
    expect(page.prepared()[0].units).toBe('50');
    expect(page.drafts().size).toBe(0);
    page.stagePrepared();
    expect(page.drafts().get('A')?.units).toBe('50');
    http.expectNone('/v2/api/catalog-v2/apply');
    http.verify();
  });
  it('rejects whole paste when one identity is invalid and preserves existing drafts', () => {
    const { page, http } = setup();
    page.edit(row('OLD'), 'units', '5');
    page.paste = 'A;001;50\nB;UNKNOWN;20';
    page.preparePaste();
    http.expectOne('/v2/api/catalog-v2/mapping/rows').flush({ items: [row(), row('B')] });
    expect(page.prepared().length).toBe(0);
    expect(page.drafts().size).toBe(1);
    expect(page.error()).toContain('не найдено');
    http.verify();
  });
  it('keeps all submitted rows beyond the 20-row sample and does not delete unrelated drafts', () => {
    const { page, http } = setup();
    for (let i = 0; i < 30; i++) page.edit(row('T' + i), 'identity', '001');
    page.save();
    const request = http.expectOne('/v2/api/catalog-v2/mapping/preview');
    expect(request.request.body.items.length).toBe(30);
    request.flush(op());
    page.apply();
    http.expectOne('/v2/api/catalog-v2/apply').flush({ ...op(), status: 'applied', applied: 30 });
    expect(page.drafts().size).toBe(0);
    http.verify();
  });
  it('blocks expired previews and retains unsaved edits', () => {
    const { page, http } = setup();
    page.edit(row(), 'identity', '001');
    page.save();
    http
      .expectOne('/v2/api/catalog-v2/mapping/preview')
      .flush({ ...op(), expires_at: '2000-01-01T00:00:00Z' });
    page.apply();
    http.expectNone('/v2/api/catalog-v2/apply');
    expect(page.drafts().size).toBe(1);
    expect(page.preview()).toBeNull();
    http.verify();
  });
  it('recovers a lost apply response by status instead of retrying the mutation', () => {
    const { page, http } = setup();
    page.edit(row(), 'identity', '001');
    page.save();
    http.expectOne('/v2/api/catalog-v2/mapping/preview').flush(op());
    page.apply();
    http
      .expectOne('/v2/api/catalog-v2/apply')
      .flush({ detail: 'Ответ потерян' }, { status: 503, statusText: 'Unavailable' });
    expect(page.uncertain()).toBe(true);
    page.apply();
    http.expectNone('/v2/api/catalog-v2/apply');
    page.checkOperation();
    http
      .expectOne((r) => r.url === '/v2/api/catalog-v2/operation')
      .flush({ ...op(), status: 'applied', applied: 1 });
    expect(page.drafts().size).toBe(0);
    http.verify();
  });
  it('ignores a comparison arriving after a different product was opened', () => {
    const { page, http } = setup();
    page.openCompare(row());
    const old = http.expectOne((r) => r.url === '/v2/api/catalog-v2/mapping/compare');
    page.openCompare(row('B'));
    http
      .expectOne((r) => r.url === '/v2/api/catalog-v2/mapping/compare')
      .flush({ items: [{ onec_code: 'B' }] });
    old.flush({ items: [{ onec_code: 'A' }] });
    expect(page.comparison()[0].onec_code).toBe('B');
    http.verify();
  });
});

beforeEach(() => TestBed.configureTestingModule({ imports: [MappingWorkspaceModule] }));
