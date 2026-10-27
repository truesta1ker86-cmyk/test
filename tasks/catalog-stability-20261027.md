# Catalog table stability

Remove the 36px loaded-table padding, apply fixed column widths and keep one
bounded scroll container with sticky SKU/checkbox columns. Group non-promotion
bulk actions in a compact menu; promotion buttons and handlers are unchanged.
Compact row actions/history without changing their behavior.

360 existing tests, architecture/employer/filter checks and build passed.
Browser checks: aligned header/body, stable pinned columns at scrollLeft 1209,
no page horizontal overflow, unchanged toolbar height on selection, accessible
actions at 320x480. Catalog CSS has a nonblocking 6.98kB budget warning.
Deploy through ii_test; no API/data changes. Existing loading bindings excluded.
