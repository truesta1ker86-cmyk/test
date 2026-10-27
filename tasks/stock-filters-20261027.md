# Stock filters: viewport bounds and brands

The inventory filter popup exceeded a laptop viewport and its footer blocked
the final dropdown options. The popup now fits within 12px viewport margins;
its header/footer stay visible and only the field grid scrolls. Dropdowns use
an owned layer outside the scrolling grid, with a viewport coordinate origin
for PrimeNG positioning. They stay above the footer and remain inside the
popup's click boundary. Other popup instances retain their existing behavior.

Original select/multiselect controls have an optional appendTo input; default
placement and all existing control methods remain unchanged. Empty facets are
labeled "Не заполнено" while retaining __empty__ in the API filter value.
The companion API fix reads the catalog's filter_brand for stock facets.

Validation: 352 frontend tests, architecture/employer/filter integration checks,
production build; synthetic browser at 1280x720 and 320x480. Popup bounds are
(548,12)-(1268,708) and (20,12)-(308,468), respectively. Scrolling changes the
field grid while page scrollTop stays 0. Both final Rules options receive mouse
hits, including over the footer, and can be selected together. No console errors.

Deploy frontend through ii_test. API deploys separately through its main branch.
Verify actual brands, multiple selection, search, reset and mobile bounds on
pujer.ru after both workflows finish. Workflow completion alone is not live
acceptance. Rollback each repository with a normal revert of this change and
its existing deployment workflow; no migration or saved-data change is included.
