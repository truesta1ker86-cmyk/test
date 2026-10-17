import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PriceEditor } from './price-editor';
import { EditorDrafts } from './editor-drafts';
import { SessionContext } from '../core/session-context';

describe('Shared table and product editor drafts', () => {
  it('opens the table draft and preserves its original version on a rejected save', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(SessionContext).accept({
      tenant_id: 4,
      name: 'Test',
      actor_name: 'Tester',
      role: 'owner',
      is_owner: true,
      expires_in_seconds: 3600,
    });
    const drafts = TestBed.inject(EditorDrafts).forShop(4);
    drafts.values.set({ A: { volume: '2' } });
    drafts.versions.set('A', 'old');
    const fixture = TestBed.createComponent(PriceEditor);
    fixture.componentRef.setInput('offer', 'A');
    const editor = fixture.componentInstance,
      http = TestBed.inject(HttpTestingController);
    editor.load();
    http
      .expectOne((r) => r.url === '/v2/api/pricing/editor/config')
      .flush({ offer_id: 'A', version: 'new', volume: '1' });
    expect(editor.form.controls['volume'].value).toBe('2');
    editor.save();
    const request = http.expectOne('/v2/api/pricing/editor/save');
    expect(request.request.body.expected_version).toBe('old');
    expect(request.request.body.changes).toEqual({ volume: '2' });
    request.flush({ detail: 'Параметры изменились' }, { status: 409, statusText: 'Conflict' });
    expect(drafts.values()['A']['volume']).toBe('2');
    expect(editor.uncertain()).toBe(true);
    expect(TestBed.inject(EditorDrafts).forShop(5).values()).toEqual({});
    http.verify();
  });
});
