import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent as App } from '../../app.component';
import { AppModule } from '../../app.module';
import { shopInterceptor } from '../../core/infrastructure/utils/shop-interceptor.utils';
import { SessionContext } from '../../core/infrastructure/services/session-context.service';

describe('Workspace access', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [AppModule],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([shopInterceptor])),
        provideHttpClientTesting(),
      ],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('shows a sign-in path and hides business data after 401', async () => {
    const fixture = TestBed.createComponent(App);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http
      .expectOne('/v2/api/auth/session')
      .flush({ detail: 'No session' }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    http.expectOne('/v2/api/auth/options').flush({
      legal_document_version: 'test',
      consent_required: false,
    });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Вход в версию 2');
    expect(fixture.nativeElement.querySelector('input[type="password"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeNull();
  });

  it('opens the authenticated shop for an employee without fetching owner-only shop lists', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/v2/api/auth/session').flush({
      tenant_id: 4,
      name: 'Магазин 4',
      actor_name: 'Анна',
      role: 'manager',
      is_owner: false,
      expires_in_seconds: 3600,
    });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Магазин 4');
    expect(fixture.nativeElement.textContent).toContain('Анна');
    http.expectNone('/v2/api/account/shops');
  });

  it('blocks the current v2 shop only for its own cross-tab storage notification', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/v2/api/auth/session').flush({
      tenant_id: 4,
      name: 'Магазин 4',
      actor_name: 'Анна',
      role: 'manager',
      is_owner: false,
      session_scope: 'v2',
      expires_in_seconds: 3600,
    });
    await fixture.whenStable();
    const context = TestBed.inject(SessionContext);
    for (const key of ['unrelated', 'o1c-shop-context-change']) {
      window.dispatchEvent(new StorageEvent('storage', { key, newValue: 'changed' }));
      expect(context.status()).toBe('ready');
    }
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'o1c-v2-shop-context-change', newValue: 'changed' }),
    );
    expect(context.status()).toBe('changed');
    expect(context.session()).toBeNull();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeNull();
  });

  it('still blocks a legacy-scoped session when its shop changes in another tab', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/v2/api/auth/session').flush({
      tenant_id: 4,
      name: 'Магазин 4',
      actor_name: 'Анна',
      role: 'manager',
      is_owner: false,
      expires_in_seconds: 3600,
    });
    await fixture.whenStable();
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'o1c-shop-context-change', newValue: 'changed' }),
    );
    expect(TestBed.inject(SessionContext).status()).toBe('changed');
  });
});
