/** Keep the matrix header pinned without measuring/restyling the table on scroll. */
export function bindMatrixPageScroll(host: HTMLElement, scrollbar: HTMLElement): () => void {
  const view = host.ownerDocument.defaultView;
  if (!view) return () => {};
  const page = host.closest<HTMLElement>('.page-content');
  const scrollSource = page || view;
  const motion = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  const supportsTimeline = !!(
    page &&
    view.CSS?.supports?.('animation-timeline', '--matrix-page-scroll') &&
    view.CSS.supports('animation-range', '0px 1px') &&
    view.CSS.supports('animation-duration', 'auto')
  );
  const previousTimeline = page?.style.getPropertyValue('scroll-timeline') || '';
  const previousPriority = page?.style.getPropertyPriority('scroll-timeline') || '';
  let native = false;
  let frame = 0;
  let measureNeeded = true;
  let header: HTMLTableSectionElement | null = null;
  let start = 0;
  let travel = 0;
  let lastOffset = -1;
  let listening = false;

  const scrollTop = () => page?.scrollTop ?? view.scrollY;
  const pin = () => {
    if (!header || native) return;
    const offset = Math.max(0, Math.min(scrollTop() - start, travel));
    if (offset === lastOffset) return;
    lastOffset = offset;
    // Scope the changing property to the header, never the thousands of body cells.
    header.style.setProperty('--matrix-header-offset', `${offset}px`);
  };
  const update = () => {
    frame = 0;
    if (measureNeeded) {
      measureNeeded = false;
      const table = host.querySelector('table');
      const nextHeader = table?.querySelector('thead') || null;
      const tableBounds = table?.getBoundingClientRect();
      const height = nextHeader?.getBoundingClientRect().height || 0;
      const edge = page ? page.getBoundingClientRect().top + page.clientTop : 0;
      const top = scrollTop();
      const contentWidth = host.scrollWidth;
      const viewportWidth = host.clientWidth;
      const scrollbarWidth = scrollbar.clientWidth;
      if (header !== nextHeader) {
        header?.classList.remove('matrix-native-pinning');
        header = nextHeader;
        lastOffset = -1;
        if (header) observer?.observe(header);
        if (table) observer?.observe(table);
      }
      if (tableBounds && header) {
        start = tableBounds.top - edge + top;
        travel = Math.max(0, tableBounds.height - height);
      }
      native = supportsTimeline && !motion?.matches;
      if (native) {
        page!.style.setProperty('scroll-timeline', '--matrix-page-scroll block');
        header?.style.setProperty('--matrix-scroll-start', `${start}px`);
        header?.style.setProperty('--matrix-scroll-end', `${start + Math.max(1, travel)}px`);
        header?.style.setProperty('--matrix-header-travel', `${travel}px`);
      } else if (page) {
        if (previousTimeline)
          page.style.setProperty('scroll-timeline', previousTimeline, previousPriority);
        else page.style.removeProperty('scroll-timeline');
      }
      header?.classList.toggle('matrix-native-pinning', native);
      if (native && listening) {
        scrollSource.removeEventListener('scroll', schedulePin);
        listening = false;
      } else if (!native && !listening) {
        scrollSource.addEventListener('scroll', schedulePin, { passive: true });
        listening = true;
      }
      scrollbar.hidden = contentWidth <= viewportWidth + 1;
      if (!scrollbar.hidden) {
        scrollbar.style.setProperty(
          '--matrix-scroll-width',
          `${contentWidth + (scrollbarWidth || scrollbar.clientWidth) - viewportWidth}px`,
        );
        fromMatrix();
      }
    }
    pin();
  };
  const schedulePin = () => {
    if (!frame) frame = view.requestAnimationFrame(update);
  };
  const scheduleMeasure = () => {
    measureNeeded = true;
    schedulePin();
  };
  const fromMatrix = () => {
    if (scrollbar.scrollLeft !== host.scrollLeft) scrollbar.scrollLeft = host.scrollLeft;
  };
  const fromScrollbar = () => {
    if (host.scrollLeft !== scrollbar.scrollLeft) host.scrollLeft = scrollbar.scrollLeft;
  };
  const observer =
    typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(scheduleMeasure) : null;
  observer?.observe(host);
  if (host.parentElement) observer?.observe(host.parentElement);
  const workspace = host.closest('app-stocks-page');
  if (workspace) observer?.observe(workspace);
  if (page) observer?.observe(page);
  host.addEventListener('scroll', fromMatrix, { passive: true });
  scrollbar.addEventListener('scroll', fromScrollbar, { passive: true });
  view.addEventListener('resize', scheduleMeasure);
  motion?.addEventListener('change', scheduleMeasure);
  update();

  return () => {
    if (frame) view.cancelAnimationFrame(frame);
    observer?.disconnect();
    scrollSource.removeEventListener('scroll', schedulePin);
    host.removeEventListener('scroll', fromMatrix);
    scrollbar.removeEventListener('scroll', fromScrollbar);
    view.removeEventListener('resize', scheduleMeasure);
    motion?.removeEventListener('change', scheduleMeasure);
    header?.classList.remove('matrix-native-pinning');
    if (page) {
      if (previousTimeline)
        page.style.setProperty('scroll-timeline', previousTimeline, previousPriority);
      else page.style.removeProperty('scroll-timeline');
    }
  };
}
