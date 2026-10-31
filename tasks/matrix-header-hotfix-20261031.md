# Restore fixed column names and the bottom scrollbar

Supersedes the scroll-timeline approach in matrix-scroll-performance-20261031.md.
User reported that the published version lost the pinned column names and usable
horizontal scrollbar. The actual production bundle namespaces private CSS
variables (`--%NS%matrix-scroll-start`, etc.), while direct DOM setProperty calls
used unprefixed names. The raw-style fixture did not reproduce that compiler step.

Removed scroll timelines and all dynamic matrix CSS-variable references. Header
translation is now a direct inline transform, updated synchronously from the
cached scroll geometry; bottom scrollbar content gets a direct inline width.
This survives the compiler namespace. No layout measurement runs on vertical or
horizontal scrolling, and the changing style is limited to the header. Solid
header backgrounds/no blur, sticky article cells and resize observation remain.

Focused tests cover immediate pinned column names, upward scrolling, bottom
clamping, layout changes, both scrollbar directions, reappearing scrollbars and
cleanup. V1, backend, data, filters, warehouse rules and sending are untouched.
