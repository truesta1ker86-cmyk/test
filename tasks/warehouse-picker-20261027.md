# Shared inline warehouse selection

Show warehouse selection as one open checklist rather than an extra collapsed
multiselect inside a popup. The shared FilterMultiselectComponent gains an
optional inline mode using PrimeNG Listbox, the existing CVA and scoped
FilterService. Default dropdown behavior is unchanged. An optional item template
supplies warehouse names, FBS/rFBS badges and Already added status. Existing
warehouses remain checked and disabled; search keeps pending selections.

The popup fits viewport margins with a scrolling list and fixed header/footer.
Added cards have a full green background and readable wrapped names. Matrix
column names use font-weight 800. Warehouse adding limits and rule calculations
are unchanged. The older bulk warehouse settings block dates to 0f35eed from
17 October; it remains collapsed by default.

Validation: 357 tests in 68 files, architecture/employer/filter checks,
production build. Synthetic browser at 1280x720 and 320x480: checkbox states,
disabled added warehouses, search preserving an earlier choice, adding two
pending columns at once, popup/list bounds and restored columns all verified.
Mobile popup is (12,12)-(308,468), and its list scrolls while footer stays visible.
Existing nonblocking stylesheet budget warnings remain.

Deploy frontend through ii_test and verify the same flow with the real warehouse
names on pujer.ru. No backend changes or saved stock operations are part of this
release. Rollback with a normal revert and push through the existing CI.
