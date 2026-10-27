# Frontend V2 deployment — 27 October 2026

Target: https://pujer.ru/, Angular frontend only. The user asked why the
requested UI changes had not been deployed after the GitHub feature-branch push.
The deployment branch is ii_test.

Merge ii_test at 59568a9acf5674bf8eac084f5c9ff386ced234b8 with the tested UI commit
dc852828339439b7d361a449859eb4f435869285. Conflict resolution retains the separate
Orders/Returns pages, shared filter, compact headings, workspace-shell.css,
sticky table headings and page-level vertical scrolling for the allocation matrix.
The previous removal of workspace-shell.css and conflicting height/overflow rules
are superseded by the requested, browser-tested layout fixes. Independent SCSS
schematics, group definitions, summary.available, bulk-action component styles and
the footer border remain. Move the group enum from enums/ to types/ and update
its two imports to satisfy the existing architecture check.

API request contracts do not change. Backend, o1c_db and V1 are outside this
frontend release. The original checkout's four pre-existing filter changes,
development_gateway and other uncommitted files are excluded. Build from the
isolated source checkout, not the original checkout's dirty dist.

Validation before push: 350 tests in 67 files; architecture:check, employer:check,
filters:check; production ng build. Browser checks use synthetic data at
1280x720 and 320x480: no page horizontal overflow; 13px h1; collapsed sidebar
80px; Orders heading remains above scrolling rows; matrix clientHeight and
scrollHeight both 15333px, while page scrollTop reaches 720px and its header
stays at 0px. No console errors. Existing nonblocking CSS budget warnings remain.

Deployment uses the existing CI & Deploy workflow triggered by ii_test, serving
/var/www/o1c_panel/dist/ozon1c-v2/browser/. Check the Actions conclusion and public
assets after pushing; this preparation record alone does not confirm deployment.

Rollback: revert the merge with first parent ii_test (git revert -m 1 <merge>)
and push normally to ii_test through the same CI. Previous successful Actions
run: 39795518078, commit 59568a9. Both parents remain in history. No database or
backend changes are needed for this frontend rollback.
