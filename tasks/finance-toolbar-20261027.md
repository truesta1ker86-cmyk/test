# Compact finance toolbar

Arrange the Financial Result actions like the supplied V1 reference: period,
Calculate, Excel, snapshot refresh, Filters. The Excel action downloads directly
using the existing selected export kind; its adjacent arrow opens all five
existing format choices. Search, operation type, hierarchy and product facets
are under the Filters button, with one Apply and Reset row. Panels are mutually
exclusive, closed initially, and stay in normal document flow.

Keep the truthful snapshot-refresh label and existing query/export endpoints,
disabled guards and hierarchy auto-apply. No financial formulas or API changes.

Validation: 12 focused finance tests and a production build passed. Local browser
at 1280x720 has all toolbar actions in one row; at 375x667 the controls wrap,
the filter panel fits, with no document horizontal overflow or console errors.
Deploy only the four finance component files and this note through ii_test.
Rollback by reverting this commit and pushing through the same deployment CI.
