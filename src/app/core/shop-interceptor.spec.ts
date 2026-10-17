import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SessionContext } from './session-context';
import { shopInterceptor } from './shop-interceptor';

describe('Shop-bound API requests', () => {
  let context: SessionContext;
  let http: HttpClient;
  let controller: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([shopInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    context = TestBed.inject(SessionContext);
    context.accept({
      tenant_id: 4,
      name: 'Shop',
      actor_name: 'User',
      role: 'manager',
      is_owner: false,
      expires_in_seconds: 3600,
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });
  afterEach(() => controller.verify());

  it('sends the visible tenant with a pricing request', () => {
    http.get('/v2/api/pricing/configs').subscribe();
    const req = controller.expectOne('/v2/api/pricing/configs');
    expect(req.request.headers.get('X-Expected-Tenant-Id')).toBe('4');
    req.flush({ items: [] }, { headers: { 'X-Tenant-Id': '4' } });
  });
  it('hides the old context when the server reports a different tenant', () => {
    let delivered = false;
    http
      .get('/v2/api/pricing/configs')
      .subscribe({ next: () => (delivered = true), error: () => {} });
    controller
      .expectOne('/v2/api/pricing/configs')
      .flush({ items: [] }, { headers: { 'X-Tenant-Id': '5' } });
    expect(delivered).toBe(false);
    expect(context.status()).toBe('changed');
    expect(context.session()).toBeNull();
  });
  it('discards a response arriving after another tab changed shop', () => {
    let delivered = false;
    http
      .get('/v2/api/pricing/configs')
      .subscribe({ next: () => (delivered = true), error: () => {} });
    const request = controller.expectOne('/v2/api/pricing/configs');
    context.block();
    request.flush({ items: [{ offer_id: 'OLD-SHOP' }] }, { headers: { 'X-Tenant-Id': '4' } });
    expect(delivered).toBe(false);
  });
});
