import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatrixPageScrollDirective } from './matrix-page-scroll.directive';

describe('Matrix scrolling with the page', () => {
  const pages: HTMLElement[] = [];
  let frames: FrameRequestCallback[];

  beforeEach(() => {
    frames = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    pages.splice(0).forEach((page) => page.remove());
    vi.restoreAllMocks();
  });

  function setup() {
    const page = document.createElement('main');
    page.className = 'page-content';
    const matrix = document.createElement('div');
    matrix.innerHTML = '<table><thead><tr><th>Склад</th></tr></thead><tbody></tbody></table>';
    const scrollbar = document.createElement('div');
    page.append(matrix, scrollbar);
    document.body.append(page);
    pages.push(page);
    Object.defineProperties(matrix, {
      clientWidth: { configurable: true, value: 800 },
      scrollWidth: { configurable: true, value: 1400 },
    });
    Object.defineProperty(scrollbar, 'clientWidth', { value: 800 });
    let tableTop = 120;
    vi.spyOn(page, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 52, 800, 600));
    vi.spyOn(matrix.querySelector('table')!, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(0, tableTop, 1400, 2000),
    );
    vi.spyOn(matrix.querySelector('thead')!, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, tableTop, 1400, 40),
    );
    TestBed.configureTestingModule({
      providers: [{ provide: ElementRef, useValue: new ElementRef(matrix) }],
    });
    const directive = TestBed.runInInjectionContext(() => new MatrixPageScrollDirective());
    directive.appMatrixPageScroll = scrollbar;
    directive.ngAfterViewInit();
    return {
      page,
      matrix,
      scrollbar,
      setTop: (top: number) => {
        tableTop = top;
      },
      flush: () => frames.splice(0).forEach((callback) => callback(0)),
    };
  }

  it('keeps the header at the page edge while the whole page scrolls', () => {
    const { page, matrix, setTop, flush } = setup();
    expect(matrix.style.getPropertyValue('--matrix-header-offset')).toBe('0px');
    setTop(-100);
    page.dispatchEvent(new Event('scroll'));
    flush();
    expect(matrix.style.getPropertyValue('--matrix-header-offset')).toBe('152px');
    expect(matrix.scrollTop).toBe(0);
  });

  it('stops the pinned header at the last table row', () => {
    const { page, matrix, setTop, flush } = setup();
    setTop(-2100);
    page.dispatchEvent(new Event('scroll'));
    flush();
    expect(matrix.style.getPropertyValue('--matrix-header-offset')).toBe('1960px');
  });

  it('synchronizes the always accessible horizontal scrollbar in both directions', () => {
    const { matrix, scrollbar } = setup();
    expect(scrollbar.hidden).toBe(false);
    expect(scrollbar.style.getPropertyValue('--matrix-scroll-width')).toBe('1400px');
    scrollbar.scrollLeft = 250;
    scrollbar.dispatchEvent(new Event('scroll'));
    expect(matrix.scrollLeft).toBe(250);
    matrix.scrollLeft = 400;
    matrix.dispatchEvent(new Event('scroll'));
    expect(scrollbar.scrollLeft).toBe(400);
  });

  it('hides the scrollbar when all columns fit and removes listeners on exit', () => {
    const { matrix, scrollbar, page, flush } = setup();
    Object.defineProperty(matrix, 'scrollWidth', { value: 800 });
    window.dispatchEvent(new Event('resize'));
    flush();
    expect(scrollbar.hidden).toBe(true);
    page.dispatchEvent(new Event('scroll'));
    TestBed.resetTestingModule();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    frames = [];
    page.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    expect(frames).toHaveLength(0);
  });
});
