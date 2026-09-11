# Release evidence checklist

Use this checklist for a specific release candidate. Checking a box requires
recorded evidence for that candidate; this document does not certify the current
branch or authorize a deployment. [NEXT](../NEXT.md) records unresolved product,
device and cost gates.

## Candidate and automated checks

- [ ] Record the candidate commit, target environment and intended release scope.
- [ ] Confirm the final CI result for that commit, including build, unit/type
  checks, all three browser jobs and benchmark assertions. Use
  [the workflow](../.github/workflows/ci.yml) as the current command/job source.
- [ ] Review dependency-audit results and any skips/failures; record their impact.
- [ ] Review the final diff, format/storage compatibility changes and applicable
  fixture regressions. Update [capabilities](../FEATURES.md) and release notes.

## User workflows

- [ ] On the candidate, verify create/edit/Undo/Redo/save/reload using a synthetic
  project; exercise failed-save recovery and downloadable backups where changed.
- [ ] Verify affected imports/exports. Package changes need original → edit →
  export → import/re-export comparisons, including retained attachments/metadata.
  Use the [package contract](project-package-v1.md).
- [ ] Record affected browser/device/input checks, including native Safari or
  physical iPhone/iPad where required. Record missing coverage explicitly.
- [ ] For performance changes, record representative workload and hardware results.
  Shared-runner timing and viewport emulation are not device budget evidence.

## Deployment and companion gates

- [ ] Review the [release/Firebase gates](../NEXT.md#2-release-and-firebase-cost-gates)
  for the actual scope. Do not mark native release, client migration, Storage-rule
  cutover or billing budget work complete from web CI results.
- [ ] If changing handoff admission, retention or rules, follow the existing
  [migration procedure](handoff-quotas.md), verify older-client compatibility and
  record administrator/budget evidence. Preserve local file exchange.
- [ ] Record the deployment procedure, previously working revision and recovery
  plan for this environment before publishing.
- [ ] After publishing, verify the served version and affected user workflows.
  Exercise save-before-reload recovery for deployment notices; see the
  [cache validation report](reviews/2026-09-08-deployment-version-cache.md).
- [ ] Record the deployed commit, verification results and any remaining limits.
