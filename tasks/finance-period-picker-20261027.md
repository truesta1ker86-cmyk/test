# Finance period calendar

Replace the three period/from/to controls with one shared period picker based
on the existing PrimeNG DatePicker. Match V1: two months, Russian labels and
Monday-first weeks, highlighted range, 7/30/90-day shortcuts, six recent months,
Cancel and Apply. Apply refreshes the report through its existing query contract;
Cancel discards the draft. Dates serialize by calendar parts without UTC shifts.

The new module scopes its Russian PrimeNG configuration locally. Mobile renders
one actual month with working navigation and a scrolling body above fixed actions.
The generic mobile popup rule excludes PrimeNG's actual panel-inline class.

Validation: 34 focused calendar/finance tests, architecture/filter checks and
production build. Browser: two months and 30 highlighted days at 1280x720;
7-day draft cancellation, September application, and mobile month navigation
with a 296x456 dialog and visible footer at 320x480. No API/formula changes.
Deploy frontend through ii_test; rollback by normal revert through the same CI.
