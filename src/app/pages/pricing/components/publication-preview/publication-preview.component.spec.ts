import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PricingPublicationPreview } from './publication-preview.component';
import { PricingPublicationPreviewModule } from './publication-preview.module';

describe('Publication workspace availability', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [PricingPublicationPreviewModule],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return {
      fixture: TestBed.createComponent(PricingPublicationPreview),
      http: TestBed.inject(HttpTestingController),
    };
  }

  it('does not request unsupported history or preview in the isolated copy', () => {
    const { fixture, http } = setup();
    fixture.detectChanges();
    fixture.componentInstance.load();
    fixture.componentInstance.inspect();
    expect(fixture.componentInstance.busy()).toBe(false);
    expect(fixture.componentInstance.error()).toBe('');
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    expect(buttons.find((b) => b.textContent?.includes('Проверить готовность'))?.disabled).toBe(
      true,
    );
    http.expectNone('/v2/api/pricing/publication/runs');
    http.expectNone('/v2/api/pricing/publication/preview');
    http.verify();
  });

  it('keeps the local prototype preview available when explicitly enabled', () => {
    const { fixture, http } = setup();
    fixture.componentRef.setInput('localPreview', true);
    fixture.detectChanges();
    http.expectOne('/v2/api/pricing/publication/runs').flush({ items: [] });
    fixture.componentInstance.inspect();
    const preview = http.expectOne('/v2/api/pricing/publication/preview');
    preview.flush({ id: 'test', created_at: '', items: [] });
    expect(fixture.componentInstance.selected()).toBe('test');
    http.verify();
  });
});
