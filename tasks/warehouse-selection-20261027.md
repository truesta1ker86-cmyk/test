# Editable warehouse columns

Replace the add-only chooser with a staged complete column selection. Existing
warehouses can be unchecked, several columns can be replaced, and an explicit
empty selection is valid. Apply emits the final IDs; Cancel restores the applied
selection. Retain the twelve-column limit, disabled/busy guards, shared inline
multiselect and search. No warehouse/rule deletion or stock writes.

Start new store workspaces with no automatic columns. Store only selected column
IDs in localStorage under a tenant-specific key; restore empty selections too.
Malformed/unavailable storage falls back to an empty view. Existing inventory
drafts stay in their independent tenant-scoped workspace. Show a selection hint
when the table has no warehouse columns.

Validation: 27 targeted picker/matrix/preferences tests and production build.
Deploy through ii_test; rollback by reverting and deploying through the same CI.
