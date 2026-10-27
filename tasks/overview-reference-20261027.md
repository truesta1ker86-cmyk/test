# Store overview reference layout

Match the supplied overview reference: breadcrumb, shop title and Moscow date,
refresh action, isolated-v2 banner, five linked counters, sales chart alongside
1C exchange state and stock-management link, then recent operations. Replace
the previous latest-orders/task panels. Reuse existing overview and sales APIs.

Sales uses 7/30/90-day segmented controls (API already accepts up to 365), keeps
request cancellation, chart tooltips, empty/error states and accessible daily
figures behind Details. Preserve all financial calculations. Exchange health
comes from onec_state, never inferred from inventory counts; loaded-data rows
use their saved counts. Operation type remains generic where the API has no
source/action metadata. Five initial audit rows expand to all records received.
The journal anchor points to the same overview document. No backend changes.

Validation: six focused overview tests passed; production build passed. Local
1280x800 layout matches the reference arrangement; chart canvas draws and 90-day
selection works. At 375x812 panels fit without document horizontal overflow.
Ship only overview sources, four additions to the existing icon map, this note.
Deploy through ii_test; rollback by reverting and deploying through the same CI.
