# Smooth matrix header scrolling — 31 October 2026

The stock matrix previously measured table/page/header bounds and changed an
inherited custom property on the entire matrix on every scroll frame. Its wide
header also retained a backdrop blur on every cell from the shared table styles.

The focused scrolling helper now uses a browser scroll timeline when supported,
with no page-scroll JavaScript callback. Geometry/ranges and the horizontal
scrollbar width are measured only at setup and layout changes. On older browsers
and reduced-motion mode, the fallback uses cached bounds and changes an offset
only on the thead when its value actually changes. Horizontal synchronization
never remeasures the table. ResizeObserver also watches the stock workspace so
opening content above the matrix refreshes the range. Cleanup restores the page
timeline and removes observers/listeners.

The matrix header uses a solid background without backdrop blur. Sticky article
cells, bottom scrollbar, full-page scrolling and table-end clamping are preserved.
No backend, data, rule, API-key, connection or sending changes.

Verification: 9 focused directive tests; production build passed with the existing
style warnings. Real Chromium test on a local synthetic 100-row × 8-warehouse
matrix using the production helper and matrix styles: header top=page top=48px
after downward and upward scrolling, exact clamp at the last row, and matching
horizontal offsets/article-column positions. A taller window verified a range
end beyond maximum scroll (13817px vs13574px) still pins the header correctly.
Viewport override was reset. Evidence: .tmp/matrix-scroll-20261031/upward.png.
Fallback tests verify zero geometry reads during repeated upward scrolling,
layout remeasurement, reduced motion, horizontal sync and teardown.

Technical references: https://developer.chrome.com/docs/css-ui/scroll-driven-animations
and https://drafts.csswg.org/scroll-animations-1/ (animation attachment ranges).
The actual signed-in production screen was not available; do not label the local
synthetic browser scenario a live-shop browser check.
