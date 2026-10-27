# Compact Orders controls

Put the Current/Completed tabs and article search in one compact desktop row.
Tabs, search and filter actions are 30px high. The bulk action strip uses less
padding and 28px controls; all existing selection and disabled states remain.
Remove the upper duplicate list total. Keep the paginator's lower total; when
a result fits on one page and the paginator is absent, show its count in the
bottom export strip instead.

Orders uses available vertical space for its table. Its layout is scoped to
Orders. The shared toolbar's compact input defaults to false, preserving other
pages. On narrow screens controls wrap and a minimum panel height prevents the
table header and paginator from covering all data rows.

Validation: 360 tests / 69 files, architecture/employer/filter checks and build.
At 1280x720: table top moves from 270 to 120px; height increases from 445 to
559px. Tabs 41->30px, search 39->30px, bulk strip 53->37px. Search, reset,
Current/Completed and single-page bottom count checked in a synthetic browser;
320x480 has no horizontal page overflow, with table/pagination accessible.

Deploy through ii_test and repeat on authenticated pujer.ru. No API, business
action or database changes. Three unrelated local loading bindings are excluded.
Rollback with a normal revert and push through the existing frontend workflow.
