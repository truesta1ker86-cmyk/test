import { AfterViewInit, DestroyRef, Directive, ElementRef, Input, inject } from '@angular/core';

@Directive({ selector: '[appMatrixPageScroll]', standalone: false })
export class MatrixPageScrollDirective implements AfterViewInit {
  @Input({ required: true }) appMatrixPageScroll!: HTMLElement;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroy = inject(DestroyRef);

  ngAfterViewInit(): void {
    const host = this.host;
    const view = host.ownerDocument.defaultView;
    if (!view) return;
    const scrollbar = this.appMatrixPageScroll;
    const page = host.closest<HTMLElement>('.page-content');
    const scrollSource = page || view;
    let frame = 0;

    const update = () => {
      frame = 0;
      const table = host.querySelector('table');
      const header = table?.querySelector('thead');
      if (table && header) {
        const bounds = table.getBoundingClientRect();
        const pageTop = page?.getBoundingClientRect().top || 0;
        const offset = Math.max(
          0,
          Math.min(pageTop - bounds.top, bounds.height - header.getBoundingClientRect().height),
        );
        host.style.setProperty('--matrix-header-offset', `${offset}px`);
      }
      const overflows = host.scrollWidth > host.clientWidth + 1;
      scrollbar.hidden = !overflows;
      if (overflows) {
        // Match both scroll ranges, including the matrix border widths.
        scrollbar.style.setProperty(
          '--matrix-scroll-width',
          `${host.scrollWidth + scrollbar.clientWidth - host.clientWidth}px`,
        );
        if (scrollbar.scrollLeft !== host.scrollLeft) scrollbar.scrollLeft = host.scrollLeft;
      }
    };
    const schedule = () => {
      if (!frame) frame = view.requestAnimationFrame(update);
    };
    const fromMatrix = () => {
      if (scrollbar.scrollLeft !== host.scrollLeft) scrollbar.scrollLeft = host.scrollLeft;
      schedule();
    };
    const fromScrollbar = () => {
      if (host.scrollLeft !== scrollbar.scrollLeft) host.scrollLeft = scrollbar.scrollLeft;
    };

    scrollSource.addEventListener('scroll', schedule, { passive: true });
    host.addEventListener('scroll', fromMatrix, { passive: true });
    scrollbar.addEventListener('scroll', fromScrollbar, { passive: true });
    view.addEventListener('resize', schedule);
    const observer =
      typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(schedule) : null;
    observer?.observe(host);
    if (host.parentElement) observer?.observe(host.parentElement);
    const table = host.querySelector('table');
    if (table) observer?.observe(table);
    update();

    this.destroy.onDestroy(() => {
      if (frame) view.cancelAnimationFrame(frame);
      observer?.disconnect();
      scrollSource.removeEventListener('scroll', schedule);
      host.removeEventListener('scroll', fromMatrix);
      scrollbar.removeEventListener('scroll', fromScrollbar);
      view.removeEventListener('resize', schedule);
    });
  }
}
