# Restore real isolated-store promotion workflow

Accept an explicit planning_enabled server capability for owner/manager local
rules and plans, retaining old local_preview/sandbox rules and reader exclusion.
Wire Refresh Data to catalog/restore with restored-count feedback, handle connection
errors, and allow lookup of tenant-scoped stored plans. No seller execution added.
Backend provides matching local prepare/result routes. Exact archived ZRSG-1098
must appear once its catalog identity has been restored. Existing user work in
three unrelated optionsBusy bindings remains outside this change.

Validation:16 focused promotion tests, production build. Deploy via ii_test after
backend main. Live acceptance must use normal authenticated API/UI; do not inspect
process credentials. Actual price/participation writes are outside verification.
