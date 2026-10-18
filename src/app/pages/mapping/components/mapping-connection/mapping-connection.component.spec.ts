import { MappingConnectionModule } from './mapping-connection.module';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MappingConnection } from './mapping-connection.component';

const workspace = (local = true, owner = true) => ({
  local_preview: local,
  is_owner: owner,
  onec: {
    configured: false,
    ready: false,
    secure_transport: true,
    base_url: null,
    username: null,
    message: '',
    last_checked_at: null,
    resource_preview: [],
  },
});

describe('mapping connection local-only form', () => {
  function setup(local = true, owner = true) {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(MappingConnection),
      page = fixture.componentInstance,
      http = TestBed.inject(HttpTestingController);
    http.expectOne('/v2/api/workspace-v2/account/workspace').flush(workspace(local, owner));
    return { fixture, page, http };
  }
  it('shares local account settings without sending the entered password', () => {
    const { page, http } = setup();
    page.url = 'https://example.invalid/test/';
    page.user = 'local-user';
    page.password = 'do-not-transmit';
    page.save();
    const req = http.expectOne('/v2/api/workspace-v2/account/onec/save');
    expect(req.request.body.password).toBeUndefined();
    expect(JSON.stringify(req.request.body)).not.toContain('do-not-transmit');
    req.flush({ message: 'Сохранено локально' });
    http.expectOne('/v2/api/workspace-v2/account/workspace').flush(workspace());
    expect(page.password).toBe('');
    http.verify();
  });
  it('does not call connection actions outside local preview or without ownership', () => {
    const { page, http } = setup(false);
    page.url = 'https://example.invalid';
    page.user = 'user';
    page.save();
    page.snapshot();
    http.expectNone('/v2/api/workspace-v2/account/onec/save');
    http.expectNone('/v2/api/catalog-v2/mapping/snapshot');
    expect(page.editable()).toBe(false);
    http.verify();
  });
  it('validates URLs and HTTP consent before saving the local form', () => {
    const { page, http } = setup();
    page.user = 'user';
    page.url = 'http://example.invalid/test/';
    page.save();
    expect(page.error()).toContain('HTTP');
    http.expectNone('/v2/api/workspace-v2/account/onec/save');
    page.url = 'https://user:pass@example.invalid/test/';
    page.save();
    expect(page.error()).toContain('без логина');
    http.verify();
  });
  it('checks only the existing local snapshot without import or send operations', () => {
    const { page, http } = setup();
    page.snapshot(true);
    http.expectOne('/v2/api/catalog-v2/mapping/snapshot').flush({ items: [{}] });
    expect(page.notice()).toContain('Запросов к 1С не было');
    expect(page.checked()).toBe(true);
    http.verify();
  });
});

beforeEach(() => TestBed.configureTestingModule({ imports: [MappingConnectionModule] }));
