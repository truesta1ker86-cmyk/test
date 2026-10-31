import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatrixPageScrollDirective } from './matrix-page-scroll.directive';

describe('Matrix scrolling with the page', () => {
  const pages: HTMLElement[] = [];
  let frames: FrameRequestCallback[];

  beforeEach(() => {
    frames = [];
    vi.stubGlobal('CSS', { supports: () => false });
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
    vi.unstubAllGlobals();
  });

  function setup() {
    const page = document.createElement('main');
    page.className = 'page-content';
    const matrix = document.createElement('div');
    matrix.innerHTML = '<table><thead><tr><th>Склад</th></tr></thead><tbody></tbody></table>';
    const scrollbar = document.createElement('div');
    scrollbar.innerHTML = '<div class="allocation-horizontal-content"></div>';
    page.append(matrix, scrollbar);
    document.body.append(page);
    pages.push(page);
    Object.defineProperties(matrix, {
      clientWidth: { configurable: true, value: 800 },
      scrollWidth: { configurable: true, value: 1400 },
    });
    Object.defineProperty(scrollbar, 'clientWidth', { get: () => (scrollbar.hidden ? 0 : 800) });
    let tableTop = 120;
    vi.spyOn(page, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 52, 800, 600));
    vi.spyOn(matrix.querySelector('table')!, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(0, tableTop - page.scrollTop, 1400, 2000),
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
      header: matrix.querySelector('thead')!,
      scrollbar,
      setTop: (top: number) => {
        tableTop = top;
      },
      flush: () => frames.splice(0).forEach((callback) => callback(0)),
    };
  }

  it('keeps the header at the page edge while the whole page scrolls', () => {
    const { page, matrix, header, flush } = setup();
    expect(header.style.transform).toBe('translate3d(0, 0px, 0)');
    page.scrollTop = 220;
    page.dispatchEvent(new Event('scroll'));
    flush();
    expect(header.style.transform).toBe('translate3d(0, 152px, 0)');
    expect(matrix.style.getPropertyValue('--matrix-header-offset')).toBe('');
    expect(matrix.scrollTop).toBe(0);
  });

  it('stops the pinned header at the last table row', () => {
    const { page, header, flush } = setup();
    page.scrollTop = 2220;
    page.dispatchEvent(new Event('scroll'));
    flush();
    expect(header.style.transform).toBe('translate3d(0, 1960px, 0)');
  });

  it('scrolls upward without layout reads and releases the header above the table', () => {
    const { page, matrix, header, flush } = setup();
    const table = matrix.querySelector('table')!;
    const initialReads = vi.mocked(table.getBoundingClientRect).mock.calls.length;
    for (const top of [800, 500, 220, 100, 0]) {
      page.scrollTop = top;
      page.dispatchEvent(new Event('scroll'));
      flush();
      expect(header.style.transform).toBe(`translate3d(0, ${Math.max(0, top - 68)}px, 0)`);
    }
    expect(table.getBoundingClientRect).toHaveBeenCalledTimes(initialReads);
    expect(page.getBoundingClientRect).toHaveBeenCalledTimes(1);
    expect(header.getBoundingClientRect).toHaveBeenCalledTimes(1);
  });

  it('remeasures after content above the matrix changes height', () => {
    const { page, header, setTop, flush } = setup();
    page.scrollTop = 220;
    page.dispatchEvent(new Event('scroll'));
    flush();
    expect(header.style.transform).toBe('translate3d(0, 152px, 0)');
    setTop(200);
    window.dispatchEvent(new Event('resize'));
    flush();
    expect(header.style.transform).toBe('translate3d(0, 72px, 0)');
  });

  it('pins immediately even when CSS animations are supported', () => {
    vi.stubGlobal('CSS', { supports: () => true });
    const { page, header } = setup();
    page.scrollTop = 220;
    page.dispatchEvent(new Event('scroll'));
    expect(header.style.transform).toBe('translate3d(0, 152px, 0)');
    expect(frames).toHaveLength(0);
  });

  it('synchronizes the always accessible horizontal scrollbar in both directions', () => {
    const { matrix, scrollbar } = setup();
    expect(scrollbar.hidden).toBe(false);
    expect((scrollbar.firstElementChild as HTMLElement).style.width).toBe('1400px');
    scrollbar.scrollLeft = 250;
    scrollbar.dispatchEvent(new Event('scroll'));
    expect(matrix.scrollLeft).toBe(250);
    matrix.scrollLeft = 400;
    matrix.dispatchEvent(new Event('scroll'));
    expect(scrollbar.scrollLeft).toBe(400);
  });

  it('restores the full horizontal range when the hidden scrollbar becomes visible', () => {
    const { matrix, scrollbar, flush } = setup();
    Object.defineProperty(matrix, 'scrollWidth', { configurable: true, value: 800 });
    window.dispatchEvent(new Event('resize'));
    flush();
    expect(scrollbar.hidden).toBe(true);
    Object.defineProperty(matrix, 'scrollWidth', { configurable: true, value: 1400 });
    window.dispatchEvent(new Event('resize'));
    flush();
    expect(scrollbar.hidden).toBe(false);
    expect((scrollbar.firstElementChild as HTMLElement).style.width).toBe('1400px');
  });

  it('hides the scrollbar when all columns fit and removes listeners on exit', () => {
    const { matrix, scrollbar, page, flush } = setup();
    Object.defineProperty(matrix, 'scrollWidth', { value: 800 });
    window.dispatchEvent(new Event('resize'));
    flush();
    expect(scrollbar.hidden).toBe(true);
    window.dispatchEvent(new Event('resize'));
    TestBed.resetTestingModule();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    frames = [];
    page.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    expect(frames).toHaveLength(0);
  });
});
