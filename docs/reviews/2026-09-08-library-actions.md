# Project library action safety

Issue [#91](https://github.com/laanlabs/openPlan3D/issues/91) follows the remaining
library accessibility warnings. Native Safari reproduced an actions menu that
stayed open on Escape and a Delete confirmation that remained armed after
clicking outside and reopening the menu. The previous inline rename input also
started an asynchronous save from both Enter and blur without a pending guard.

The library actions menu now takes focus, supports arrows, Home/End and first-letter
navigation, closes on Escape, Tab, outside pointer input or focus leaving, and
restores its trigger when dismissed by keyboard or selecting an action. Project
cards use stable IDs so sorting after a rename retains the correct trigger.
Thumbnail links have project-specific accessible names.

Rename uses a labeled native dialog with explicit Save name and Cancel actions.
Delete uses a fresh named confirmation whose initial focus is Cancel. Both keep
their draft/error state on storage failure and disable repeated submissions until
the actual local transaction finishes. A successful transaction closes the dialog
before the separate library refresh, so a refresh failure cannot leave an already
completed mutation available for retry. Copying is also guarded while pending.
Deleting the focused card moves focus to New Project when its old trigger is gone.

## Validation

- Local production build and **647 unit tests** pass. Svelte check reports **zero
  errors and seven remaining warnings**, down from nine. No warning suppressions
  were added.
- Native Safari confirms arrow navigation, Escape/trigger focus restoration,
  rename after Tab/Shift-Tab, and Escape/reopen/Enter safely canceling deletion.
- Six new browser workflows cover desktop and 390px menu/dialog behavior,
  cancellation with byte-identical project records, failed rename drafts and
  retry, pending write locks, duplicate submission protection, confirmed deletion,
  and deletion failure/retry. The existing cross-tab deletion regression now uses
  the named confirmation. All workflows assert no external HTTP requests or page
  errors. Full three-engine CI results and production verification are recorded
  on the pull request before completion.

This batch changes only local library interactions. It adds no Firebase writes,
uploads, services, assets, dependencies or native format changes. Physical iPhone
testing and the release/billing gates in issue #30 remain outstanding.
