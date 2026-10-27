# Filter audit across V2 pages — 27 October 2026

The pricing filter's dropdowns were clipped by its scrolling grid and footer.
The product/mapping dialogs scrolled their headers and footer actions along with
the complete form. Keep all three dialogs within viewport margins, scroll only
their fields, and render dropdowns in an owned viewport layer outside that scroll.
The original controls and their filter/query contracts remain intact. Dialog
actions and headings are compact; mobile actions remain visible in one row.

The common column popup could grow after asynchronous option loading and extend
past the viewport. Include the existing local ResizeObserver/resize/scroll
positioning fix, with cleanup, and clamp positions when a trigger leaves the
viewport. Its pre-existing implementation is relevant to this reported defect;
the other three pre-existing loading bindings remain excluded and unchanged.

Validation: 356 tests in 68 files, architecture/employer/filter integration
checks and production build. Synthetic browser: pricing/products/mapping at
320x480 and 1280x720; dropdown items receive mouse hits even over the footer,
multiple selection persists, only the field body scrolls. All mobile dialogs
fit (12,12)-(308,468), footer bottom 467. Common column popup also stays within
the viewport after loading and after an open-window resize. No console errors.

Initial live audit: financial product facets and promotion model controls retain
multiple choices; both pages fit 320px width. Orders/Returns use the common column
popup. Promotions have no campaign rows in this shop; filter interaction can be
verified, but campaign-specific result accuracy cannot be inferred from empty data.

Deploy frontend through ii_test, then repeat authenticated live checks. No backend
changes, saved views, business operations or database changes are part of this
release. Revert this frontend commit and push normally to ii_test for rollback.
Record final deployment and live evidence separately after the workflow finishes.
