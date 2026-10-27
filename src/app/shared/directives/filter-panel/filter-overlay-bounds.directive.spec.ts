import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Select } from 'primeng/select';
import { FilterOverlayBoundsDirective } from './filter-overlay-bounds.directive';

describe('Select dropdown viewport bounds', () => {
  const originalWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth')!;
  const originalHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight')!;
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 480 });
  });
  function setup() {
    let show!: (event: { element: Element }) => void;
    let hide!: () => void;
    let resize!: () => void;
    let mutate!: () => void;
    let frame!: FrameRequestCallback;
    const cancel = vi.fn();
    const resizeDisconnected = vi.fn();
    const mutationDisconnected = vi.fn();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frame = callback;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', cancel);
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resize = callback;
        }
        observe() {}
        disconnect = resizeDisconnected;
      },
    );
    vi.stubGlobal(
      'MutationObserver',
      class {
        constructor(callback: () => void) {
          mutate = callback;
        }
        observe() {}
        disconnect = mutationDisconnected;
      },
    );
    const anchor = document.createElement('div');
    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(new DOMRect(26, 200, 270, 34));
    const panel = document.createElement('div');
    panel.className = 'p-overlay';
    const size = { height: 304 };
    Object.defineProperty(panel, 'offsetWidth', { get: () => 270 });
    Object.defineProperty(panel, 'offsetHeight', { get: () => size.height });
    document.body.append(panel);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Select,
          useValue: {
            onShow: {
              subscribe: (callback: typeof show) => {
                show = callback;
              },
            },
            onHide: {
              subscribe: (callback: typeof hide) => {
                hide = callback;
              },
            },
          },
        },
        { provide: ElementRef, useValue: new ElementRef(anchor) },
      ],
    });
    TestBed.runInInjectionContext(() => new FilterOverlayBoundsDirective());
    return {
      anchor,
      panel,
      size,
      cancel,
      resizeDisconnected,
      mutationDisconnected,
      show: () => show({ element: panel }),
      hide: () => hide(),
      resize: () => resize(),
      mutate: () => mutate(),
      flush: () => frame(0),
    };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'innerWidth', originalWidth);
    Object.defineProperty(window, 'innerHeight', originalHeight);
  });

  it('fits loaded options in the viewport and repairs later library realignment', () => {
    const state = setup();
    try {
      state.show();
      const openingTop = state.panel.style.top;
      expect(state.panel.style.position).toBe('fixed');
      expect(parseFloat(state.panel.style.top)).toBeGreaterThanOrEqual(12);
      expect(parseFloat(state.panel.style.top) + 304).toBeLessThanOrEqual(window.innerHeight - 12);
      state.size.height = 420;
      state.resize();
      state.flush();
      expect(state.panel.style.top).toBe(openingTop);
      expect(
        parseFloat(state.panel.style.top) + parseFloat(state.panel.style.maxHeight),
      ).toBeLessThanOrEqual(window.innerHeight - 12);
      state.panel.style.insetInlineStart = '999px';
      state.mutate();
      state.flush();
      expect(state.panel.style.insetInlineStart).toBe('26px');
      state.hide();
    } finally {
      state.panel.remove();
    }
  });

  it('cancels positioning and disconnects observers when the dropdown closes', () => {
    const state = setup();
    try {
      state.show();
      state.hide();
      expect(state.cancel).toHaveBeenCalledWith(1);
      expect(state.resizeDisconnected).toHaveBeenCalledOnce();
      expect(state.mutationDisconnected).toHaveBeenCalledOnce();
    } finally {
      state.panel.remove();
    }
  });

  it('keeps dropdown controls below the fixed mobile application header', () => {
    const state = setup();
    const content = document.createElement('main');
    content.className = 'page-content';
    vi.spyOn(content, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 52, 320, 428));
    content.append(state.anchor);
    document.body.append(content);
    try {
      state.show();
      state.flush();
      expect(state.panel.style.top).toBe('64px');
      expect(state.panel.style.maxHeight).toBe('360px');
      state.hide();
    } finally {
      state.panel.remove();
      content.remove();
    }
  });
});
