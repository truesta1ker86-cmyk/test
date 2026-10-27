# Stable filters and compact warehouse setup

Reserve the column filter's maximum height when placing it, so asynchronous
option loading cannot flip it from below to above its header. Measure the native
dialog invisibly and apply its coordinates before revealing it. Position shared
Select overlays synchronously on show with a stable 360px envelope, retaining
viewport/header bounds, scroll/resize updates and cleanup.

Reduce the warehouse picker from 520x640 to 440x440, tighten option/header/search
spacing and badges. Keep the shared inline multiselect, disabled added rows,
selection behavior and scrollable list. Arrange warehouse mode/value/rounding in
one compact row. Shorten order table cell padding without truncating contents.

Validation: 16 focused tests across the column filter, shared Select bounds and
warehouse picker passed, including multiple selection and async placement.
Production build passed. Local browser at 1280x720: compact setup card 142.5px
(previous live 262px), picker option 38.55px (previous live 65.70px).
No inventory writes or backend changes. Deploy through ii_test; rollback by
reverting this commit and deploying through the same workflow.
