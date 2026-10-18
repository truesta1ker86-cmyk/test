import { BulkEditorModule } from './bulk-editor.module';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BulkEditor } from './bulk-editor.component';
import type { BulkPreview } from '../../infrastructure/interfaces/editor-contracts.interfaces';

describe('Price bulk preview expiration', () => {
  it('rejects an expired preview with an explicit UTC offset before sending apply', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(BulkEditor);
    fixture.componentRef.setInput('scope', {});
    fixture.componentRef.setInput('label', 'Test');
    const component = fixture.componentInstance;
    const preview: BulkPreview = {
      operation_id: 'old',
      matched: 1,
      eligible: 1,
      skipped: 0,
      expires_at: new Date(Date.now() - 60000).toISOString().replace('Z', '+00:00'),
      changes: {},
      sample: [],
    };
    component.preview.set(preview);
    expect(component.expired()).toBe(true);
    component.apply();
    TestBed.inject(HttpTestingController).expectNone('/v2/api/pricing/editor/apply/old');
    component.preview.set({ ...preview, expires_at: 'invalid' });
    expect(component.expired()).toBe(true);
  });
  it('discards a preview returned after the filter scope changed', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(BulkEditor);
    fixture.componentRef.setInput('scope', { offer_ids: ['A'] });
    fixture.componentRef.setInput('label', 'Test');
    const component = fixture.componentInstance;
    component.form.controls.value.setValue('30');
    component.inspect();
    const http = TestBed.inject(HttpTestingController);
    const request = http.expectOne('/v2/api/pricing/editor/preview');
    fixture.componentRef.setInput('scope', { offer_ids: ['B'] });
    request.flush({
      operation_id: 'old',
      matched: 1,
      eligible: 1,
      skipped: 0,
      expires_at: new Date(Date.now() + 60000).toISOString(),
      changes: {},
      sample: [],
    });
    expect(component.preview()).toBeNull();
    expect(component.error()).toContain('Отбор изменился');
    http.verify();
  });
});

beforeEach(() => TestBed.configureTestingModule({ imports: [BulkEditorModule] }));
