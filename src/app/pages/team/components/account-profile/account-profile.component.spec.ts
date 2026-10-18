import { AccountProfileModule } from './account-profile.module';
import { AccountPageModule } from '../account-page/account-page.module';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AccountProfile } from './account-profile.component';
import { AccountPage } from '../account-page/account-page.component';
import type { Account, Shop } from '../../infrastructure/interfaces/contracts.interfaces';
import { SessionContext } from '../../../../core/infrastructure/services/session-context.service';

const shop = (id: number, active = true): Shop => ({
  tenant_id: id,
  name: 'Магазин ' + id,
  is_active: active,
  is_current: id === 4,
  ozon_client_id: String(id),
  has_api_key: id === 4,
  has_performance_api: false,
  last_synced_at: null,
});

function account(owner = true): Account {
  return {
    session: {
      tenant_id: 4,
      name: 'Текущий магазин',
      actor_name: 'Анна',
      role: owner ? 'owner' : 'viewer',
      is_owner: owner,
      expires_in_seconds: 3600,
    },
    is_owner: owner,
    shops: [shop(5), shop(4), shop(6, false)],
    members: [],
    onec: null,
    ai_settings: null,
    billing: {} as Account['billing'],
    stock_automation: {
      rules_count: 7,
      enabled_rules_count: 5,
      fixed_target_rules_count: 2,
      interval_seconds: 120,
    },
  };
}

describe('Seller profile', () => {
  function setup(owner = true) {
    TestBed.configureTestingModule({
      imports: [AccountProfileModule],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(AccountProfile);
    fixture.componentRef.setInput('account', account(owner));
    fixture.detectChanges();
    return fixture;
  }
  it('shows the current shop credentials state instead of another shop in the list', () => {
    const fixture = setup();
    expect(fixture.componentInstance.currentShop()?.tenant_id).toBe(4);
    expect(fixture.nativeElement.textContent).toContain('Client-Id: 4');
    expect(fixture.nativeElement.textContent).toContain('Ключ сохранён');
    expect(fixture.nativeElement.textContent).not.toContain('Работает');
  });
  it('shows stock counts without exposing any live-start control', () => {
    const fixture = setup();
    const panel = fixture.nativeElement.querySelector('[aria-labelledby="profile-stocks-title"]');
    expect(panel.textContent).toContain('Отправка в Ozon выключена');
    expect(panel.textContent).toContain('120 сек.');
    expect(panel.querySelector('a').getAttribute('href')).toContain('tab=matrix');
    expect(panel.querySelectorAll('button').length).toBe(0);
  });
  it('does not confuse an unavailable stock snapshot with zero rules', () => {
    const fixture = setup();
    fixture.componentRef.setInput('account', { ...account(), stock_automation: null });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Снимок состояния автоматики пока не загружен',
    );
  });
  it('hides owner-only settings from employees', () => {
    const fixture = setup(false);
    expect(fixture.nativeElement.textContent).toContain('Наблюдатель');
    expect(fixture.nativeElement.textContent).not.toContain('Client-Id:');
    expect(fixture.nativeElement.textContent).not.toContain('Настроить 1С');
  });
  it('opens the corresponding settings tab through a quick action', () => {
    const fixture = setup();
    let tab = '';
    fixture.componentInstance.settings.subscribe((value) => (tab = value));
    const button = [...fixture.nativeElement.querySelectorAll('button')].find(
      (el) => (el as HTMLElement).textContent === 'Настроить 1С',
    ) as HTMLButtonElement;
    button.click();
    expect(tab).toBe('onec');
  });
});

describe('Profile tabs and shops', () => {
  function setup(tab?: string) {
    TestBed.configureTestingModule({
      imports: [AccountPageModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(convertToParamMap(tab ? { tab } : {})) },
        },
      ],
    });
    const fixture = TestBed.createComponent(AccountPage);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/v2/api/workspace-v2/account/workspace').flush(account());
    http.verify();
    return fixture.componentInstance;
  }
  it('opens Profile by default while preserving direct links to shop settings', () => {
    expect(setup().tab()).toBe('profile');
  });
  it('keeps existing shop links working', () => {
    expect(setup('shops').tab()).toBe('shops');
  });
  it('updates the shared shop name after renaming the current profile', () => {
    const page = setup();
    const context = TestBed.inject(SessionContext);
    context.accept(account().session);
    page.load();
    const renamed = account();
    renamed.session.name = 'Новое название';
    TestBed.inject(HttpTestingController)
      .expectOne('/v2/api/workspace-v2/account/workspace')
      .flush(renamed);
    expect(context.session()?.name).toBe('Новое название');
    expect(context.session()?.tenant_id).toBe(4);
    TestBed.inject(HttpTestingController).verify();
  });
  it('hides disabled shops until requested and always retains the current shop', () => {
    const page = setup('shops');
    expect(page.visibleShops().map((s) => s.tenant_id)).toEqual([5, 4]);
    expect(page.hiddenShopCount()).toBe(1);
    page.showDisabledShops.set(true);
    expect(page.visibleShops()).toHaveLength(3);
    page.showDisabledShops.set(false);
    page.data.set({ ...account(), shops: [shop(4, false), shop(6, false)] });
    expect(page.visibleShops().map((s) => s.tenant_id)).toEqual([4]);
  });
});
