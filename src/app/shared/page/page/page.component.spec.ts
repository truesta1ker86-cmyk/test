import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PageModule } from '../page.module';
import { PageComponent } from './page.component';
import { SessionContext } from '../../../core/infrastructure/services/session-context.service';
import { By } from '@angular/platform-browser';
import { NavigationComponent } from '../../navigation/navigation/navigation.component';

describe('Employer page shell with v2 page metadata', () => {
  it('renders both plain and signal titles and updates the title on a stock tab change', async () => {
    TestBed.configureTestingModule({ imports: [PageModule], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(PageComponent);
    const title = signal('Общий остаток');
    fixture.componentInstance.activePageInstance = {
      pageTitle: title,
      pageSubtitle: 'Сверка с 1С',
    };
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('main').getAttribute('aria-label')).toBe(
      'Общий остаток',
    );
    title.set('Распределение по складам');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('main').getAttribute('aria-label')).toBe(
      'Распределение по складам',
    );
    fixture.componentInstance.activePageInstance = { pageTitle: 'Товары' };
    fixture.componentInstance.updatePageData();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('main').getAttribute('aria-label')).toBe('Товары');
    expect(fixture.nativeElement.querySelector('h2')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('()=>');
  });
  it('keeps account navigation without exposing the company name or repeating copy banners', async () => {
    TestBed.configureTestingModule({ imports: [PageModule], providers: [provideRouter([])] });
    TestBed.inject(SessionContext).accept({
      tenant_id: 4,
      name: 'ООО ФРОНТМАСТЕР',
      actor_name: 'ООО ФРОНТМАСТЕР',
      role: 'viewer',
      is_owner: false,
      expires_in_seconds: 3600,
      data_mode: 'sandbox_db',
    });
    const fixture = TestBed.createComponent(PageComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('ФРОНТМАСТЕР');
    expect(fixture.nativeElement.textContent).not.toContain('Копия данных магазина');
    expect(
      fixture.nativeElement.querySelector('a[aria-label="Открыть личный кабинет"]'),
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('a[aria-label="Открыть управление магазинами"]'),
    ).not.toBeNull();
  });
  it('uses full navigation in the mobile drawer after collapsing the desktop sidebar', async () => {
    TestBed.configureTestingModule({ imports: [PageModule], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(PageComponent);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.sidebar-collapse').click();
    await fixture.whenStable();
    const navigation = () =>
      fixture.debugElement.query(By.directive(NavigationComponent))
        .componentInstance as NavigationComponent;
    expect(navigation().collapsed).toBe(true);
    fixture.nativeElement.querySelector('.mobile-burger').click();
    await fixture.whenStable();
    expect(navigation().collapsed).toBe(false);
    fixture.nativeElement.querySelector('.menu-scrim').click();
    await fixture.whenStable();
    expect(navigation().collapsed).toBe(true);
  });
});
