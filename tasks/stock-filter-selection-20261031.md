# Whole-filter stock selection, 31 October 2026

Stocks reconciliation and allocation now expose a shared native checkbox:
“Все по фильтру · N / На всех страницах”. Pagination controls rendering only.
The header's existing page checkbox remains scoped to the current page.

The API includes all matching offer IDs with the paginated stock facts, without
another request or full product payload. This makes checked/mixed states exact
across pages, sort changes and manual deselection. Selecting all uses the existing
tenant-scoped selection endpoint and keeps deliberate choices outside this
filter. Unchecking removes only current-filter products. Late responses cannot
restore a cleared selection or apply after the filter changes. Saved-stock
checks in the paired API no longer have the arbitrary 5,000-offer cap.

Verification: 12 focused StocksPage tests, including 6,001 offers; paired API
7 focused contract tests; architecture check and production build pass. Existing
unrelated stylesheet budget warnings remain below their error limits. Live UI
requires user login; no terms or credential forms were submitted by the agent.

No changes to V1, connection keys, automation, marketplace sending or live flags.
Original three optionsBusy template edits remain unstaged and excluded.
