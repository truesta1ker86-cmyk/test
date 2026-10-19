import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LoginPanel } from './login-panel.component';
import { LoginPanelModule } from './login-panel.module';

describe('Login connection recovery', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [LoginPanelModule],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(LoginPanel);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, http };
  }

  it('explains a missing auth endpoint and lets the user retry without losing the entered key', () => {
    const { fixture, page, http } = setup();
    page.token = 'synthetic-local-test-key';
    http
      .expectOne('/v2/api/auth/options')
      .flush({ detail: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Сервис входа недоступен');
    expect(fixture.nativeElement.textContent).not.toContain('Not Found');
    const retry = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (button: unknown) =>
        (button as HTMLButtonElement).textContent?.includes('Повторить подключение'),
    ) as HTMLButtonElement;
    expect(retry).toBeTruthy();
    retry.click();
    http
      .expectOne('/v2/api/auth/options')
      .flush({ legal_document_version: 'fixture', consent_required: false });
    fixture.detectChanges();
    expect(page.token).toBe('synthetic-local-test-key');
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
    http.verify();
  });

  it('does not send a key until auth options and required consents are ready', () => {
    const { page, http } = setup();
    page.token = 'synthetic-local-test-key';
    page.login();
    http.expectNone('/v2/api/auth/login');
    http
      .expectOne('/v2/api/auth/options')
      .flush({ legal_document_version: 'fixture', consent_required: true });
    page.login();
    http.expectNone('/v2/api/auth/login');
    expect(page.terms).toBe(false);
    expect(page.consent).toBe(false);
    http.verify();
  });
});
