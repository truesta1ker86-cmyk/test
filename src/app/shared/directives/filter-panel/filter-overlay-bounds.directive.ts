import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';
import { Select } from 'primeng/select';

@Directive({ selector: 'p-select[appFilterOverlayBounds]', standalone: false })
export class FilterOverlayBoundsDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly select = inject(Select);
  private panel: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private frame = 0;

  constructor() {
    this.select.onShow.subscribe((event) => this.open(event.element));
    this.select.onHide.subscribe(() => this.close());
    inject(DestroyRef).onDestroy(() => this.close());
  }

  private open(element: Element): void {
    this.close();
    const panel = element.closest<HTMLElement>('.p-overlay');
    if (!panel) return;
    this.panel = panel;
    this.resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(this.queue);
    this.resizeObserver?.observe(panel);
    this.mutationObserver = new MutationObserver(this.queue);
    this.mutationObserver.observe(panel, { attributes: true, attributeFilter: ['style'] });
    window.addEventListener('resize', this.queue);
    window.addEventListener('scroll', this.queue, true);
    this.queue();
  }

  private readonly queue = (): void => {
    if (!this.panel || this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.place();
    });
  };

  private place(): void {
    const panel = this.panel;
    if (!panel?.isConnected) return;
    const anchor = this.host.nativeElement.getBoundingClientRect();
    const width = panel.offsetWidth;
    const height = Math.min(panel.offsetHeight, window.innerHeight - 24);
    const below = anchor.bottom + 6;
    const preferred = below + height <= window.innerHeight - 12 ? below : anchor.top - height - 6;
    const top = Math.max(12, Math.min(preferred, window.innerHeight - height - 12));
    const left = Math.max(12, Math.min(anchor.left, window.innerWidth - width - 12));
    const styles = {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      insetInlineStart: `${left}px`,
      marginTop: '0px',
      maxHeight: `${window.innerHeight - 24}px`,
      overflowY: 'auto',
    };
    for (const [key, value] of Object.entries(styles)) {
      const property = key as keyof typeof styles;
      if (panel.style[property] !== value) panel.style[property] = value;
    }
  }

  private close(): void {
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
    this.resizeObserver = null;
    this.mutationObserver = null;
    window.removeEventListener('resize', this.queue);
    window.removeEventListener('scroll', this.queue, true);
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.panel = null;
  }
}
