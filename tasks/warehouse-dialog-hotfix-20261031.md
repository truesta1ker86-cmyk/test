# Warehouse chooser opens above the matrix

Use a native modal dialog for the existing shared warehouse filter instead of a
fixed-position section inside the scrolling workspace. The browser top layer
keeps it above the pinned table and outside ancestor clipping. Explicit sizing,
padding/margins and the closed state preserve the compact existing layout.

The trigger can open a read-only chooser during loading/batch work. Existing
guards keep selection edits and Apply locked until that work completes; the
dialog explains the temporary lock. Empty warehouse catalogs remain disabled.

Nine focused picker tests pass, including opening/closing/reopening through the
trigger and opening while busy without allowing mutations. JSDOM's missing
showModal is mocked only in the test, restoring its original descriptor after
each case. Shared filter search, cancellation, removal and warehouse limits
retain their existing coverage. Production build passes. No V1/backend/data or
sending changes.
