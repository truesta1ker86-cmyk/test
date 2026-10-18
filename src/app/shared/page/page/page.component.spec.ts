import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PageModule } from '../page.module';
import { PageComponent } from './page.component';

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
    expect(fixture.nativeElement.querySelector('h2').textContent).toBe('Общий остаток');
    title.set('Распределение по складам');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('h2').textContent).toBe('Распределение по складам');
    fixture.componentInstance.activePageInstance = { pageTitle: 'Товары' };
    fixture.componentInstance.updatePageData();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('h2').textContent).toBe('Товары');
    expect(fixture.nativeElement.textContent).not.toContain('()=>');
  });
});
