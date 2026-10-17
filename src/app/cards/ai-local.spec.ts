import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AiPanel } from './ai-panel';
import { Gallery } from './gallery';
describe('Local constructor media and AI boundaries', () => {
  it('never generates in local mode even if provider metadata says available', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(AiPanel),
      page = fixture.componentInstance,
      http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('offer', 'A');
    fixture.componentRef.setInput('payload', {
      offer_id: 'A',
      name: 'Test',
      description_category_id: 100,
      type_id: 200,
    });
    fixture.componentRef.setInput('definitions', []);
    fixture.componentRef.setInput('canManage', true);
    fixture.componentRef.setInput('localPreview', true);
    fixture.detectChanges();
    await Promise.resolve();
    http.expectOne('/v2/api/cards-v2/ai/status').flush({
      balance_rub: '1000',
      provider_ready: true,
      operations: [
        {
          kind: 'content',
          available: true,
          price_rub: '10',
          name: 'Content',
          model: 'test',
          block_reason: null,
        },
      ],
    });
    http.expectOne((r) => r.url === '/v2/api/cards-v2/ai/history').flush({ items: [] });
    page.generate();
    http.expectNone((r) => r.url.includes('/ai/generate'));
    http.verify();
  });
  it('keeps separate task texts while switching AI modes', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(AiPanel),
      page = fixture.componentInstance,
      http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('offer', 'A');
    fixture.componentRef.setInput('payload', { offer_id: 'A', name: 'Test' });
    fixture.componentRef.setInput('definitions', []);
    fixture.detectChanges();
    await Promise.resolve();
    http
      .expectOne('/v2/api/cards-v2/ai/status')
      .flush({ balance_rub: '0', provider_ready: false, operations: [] });
    http.expectOne((r) => r.url === '/v2/api/cards-v2/ai/history').flush({ items: [] });
    page.brief.setValue('Текст карточки');
    page.kind.setValue('image');
    page.brief.setValue('Фото на светлом фоне');
    page.kind.setValue('content');
    expect(page.brief.value).toBe('Текст карточки');
    page.kind.setValue('image');
    expect(page.brief.value).toBe('Фото на светлом фоне');
    http.verify();
  });
  it('makes a photo primary without losing or duplicating other photos', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const f = TestBed.createComponent(Gallery);
    f.componentRef.setInput('offer', 'A');
    f.componentRef.setInput('title', 'Test');
    f.componentRef.setInput('images', ['one', 'two', 'three']);
    f.componentRef.setInput('media', []);
    const changed = vi.fn();
    f.componentInstance.changed.subscribe(changed);
    f.componentInstance.makePrimary(2);
    expect(changed).toHaveBeenCalledWith(['three', 'one', 'two']);
    f.componentInstance.makePrimary(-1);
    expect(changed).toHaveBeenCalledOnce();
  });
});
