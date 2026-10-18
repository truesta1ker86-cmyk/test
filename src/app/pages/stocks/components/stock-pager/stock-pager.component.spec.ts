import { StockPagerModule } from './stock-pager.module';
import { TestBed } from '@angular/core/testing';
import { StockPager } from './stock-pager.component';

describe('All pages of stock tables', () => {
  it('emits exactly one page event when the native size selector changes', async () => {
    const fixture = TestBed.createComponent(StockPager);
    fixture.componentRef.setInput('total', 601);
    fixture.detectChanges();
    await fixture.whenStable();
    const events: { page: number; size: number }[] = [];
    fixture.componentInstance.pageChange.subscribe((event) => events.push(event));
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    select.selectedIndex = 3;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(events).toEqual([{ page: 1, size: 500 }]);
  });
  it('reaches the last rows of a dataset larger than 500 without truncation', () => {
    const fixture = TestBed.createComponent(StockPager);
    fixture.componentRef.setInput('total', 601);
    fixture.componentRef.setInput('size', 500);
    let next = 0;
    fixture.componentInstance.pageChange.subscribe((event) => (next = event.page));
    fixture.componentInstance.go(fixture.componentInstance.pages());
    expect(next).toBe(2);
  });
  it('rejects fractional page numbers and clamps a direct jump to the available range', () => {
    const fixture = TestBed.createComponent(StockPager);
    fixture.componentRef.setInput('total', 601);
    const events: number[] = [];
    const pager = fixture.componentInstance;
    pager.pageChange.subscribe((event) => events.push(event.page));
    pager.destination = 1.5;
    pager.jump();
    pager.destination = 999;
    pager.jump();
    expect(events).toEqual([7]);
  });
});

beforeEach(() => TestBed.configureTestingModule({ imports: [StockPagerModule] }));
