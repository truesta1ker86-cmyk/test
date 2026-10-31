/** Pin column names and sync the bottom scrollbar without scroll-time layout reads. */
export function bindMatrixPageScroll(host: HTMLElement, scrollbar: HTMLElement): () => void {
  const view = host.ownerDocument.defaultView;
  if (!view) return () => {};
  const page = host.closest<HTMLElement>('.page-content');
  const scrollSource = page || view;
  const content = scrollbar.querySelector<HTMLElement>('.allocation-horizontal-content');
  let frame = 0;
  let header: HTMLTableSectionElement | null = null;
  let start = 0;
  let travel = 0;
  let lastOffset = -1;

  const scrollTop = () => page?.scrollTop ?? view.scrollY;
  const pin = () => {
    if (!header) return;
    const offset = Math.max(0, Math.min(scrollTop() - start, travel));
    if (offset === lastOffset) return;
    lastOffset = offset;
    // Direct styles survive Angular's compiled private CSS-variable names.
    header.style.transform = `translate3d(0, ${offset}px, 0)`;
  };
  const fromMatrix = () => {
    if (scrollbar.scrollLeft !== host.scrollLeft) scrollbar.scrollLeft = host.scrollLeft;
  };
  const fromScrollbar = () => {
    if (host.scrollLeft !== scrollbar.scrollLeft) host.scrollLeft = scrollbar.scrollLeft;
  };
  const measure = () => {
    frame = 0;
    const table = host.querySelector('table');
    const nextHeader = table?.querySelector('thead') || null;
    const bounds = table?.getBoundingClientRect();
    const height = nextHeader?.getBoundingClientRect().height || 0;
    const edge = page ? page.getBoundingClientRect().top + page.clientTop : 0;
    const top = scrollTop();
    const contentWidth = host.scrollWidth;
    const viewportWidth = host.clientWidth;
    const scrollbarWidth = scrollbar.clientWidth;
    if (header !== nextHeader) {
      if (header) observer?.unobserve(header);
      header = nextHeader;
      lastOffset = -1;
      if (header) observer?.observe(header);
      if (table) observer?.observe(table);
    }
    if (bounds && header) {
      start = bounds.top - edge + top;
      travel = Math.max(0, bounds.height - height);
    }
    scrollbar.hidden = contentWidth <= viewportWidth + 1;
    if (!scrollbar.hidden && content) {
      content.style.width = `${contentWidth + (scrollbarWidth || scrollbar.clientWidth) - viewportWidth}px`;
      fromMatrix();
    }
    pin();
  };
  const scheduleMeasure = () => {
    if (!frame) frame = view.requestAnimationFrame(measure);
  };
  const observer =
    typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(scheduleMeasure) : null;
  observer?.observe(host);
  if (host.parentElement) observer?.observe(host.parentElement);
  const workspace = host.closest('app-stocks-page');
  if (workspace) observer?.observe(workspace);
  if (page) observer?.observe(page);
  scrollSource.addEventListener('scroll', pin, { passive: true });
  host.addEventListener('scroll', fromMatrix, { passive: true });
  scrollbar.addEventListener('scroll', fromScrollbar, { passive: true });
  view.addEventListener('resize', scheduleMeasure);
  measure();

  return () => {
    if (frame) view.cancelAnimationFrame(frame);
    observer?.disconnect();
    scrollSource.removeEventListener('scroll', pin);
    host.removeEventListener('scroll', fromMatrix);
    scrollbar.removeEventListener('scroll', fromScrollbar);
    view.removeEventListener('resize', scheduleMeasure);
  };
}
