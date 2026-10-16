# Hosted handoff admission and migration

Source paths below refer to the web repository, `laanlabs/openPlan3D`.

The updated iPhone client sends geometry JSON to `POST /api/handoffs` on the
existing web backend. Local editing and Editable Plan JSON export do not use
this service. No database or extra hosted service is introduced.

## Deployment state

`storage.rules` no longer allows public creates: captures reach the bucket only
through `POST /api/handoffs`, so the aggregate quota below covers every upload.
This is the reviewed cutover, formerly `ops/storage-quota-cutover.rules`.

The migration evidence, from production on October 16, 2026: App Store
version 1.2, released September 17, shares through the endpoint. In the week
before the cutover the inbox received about 100 endpoint captures a day, which
was the daily cap, and 4 direct uploads in total from older apps. iPhone apps
older than 1.2 can no longer share links; they can still export the plan file,
and updating the app restores sharing.

## Endpoint contract

- Request: `Content-Type: application/json`, the complete validated RoomPlan or
  prepared iPhone handoff payload. Actual streamed bytes are limited to 1 MiB;
  a misleading/missing Content-Length cannot bypass the check. Body reading
  times out after ten seconds. Compressed request bodies are rejected.
- Success: HTTP 201 with `{ "code": "ABCDEFGH", "reuseUntil": "...ISO timestamp..." }`.
  The client builds its link to `/editor?import=CODE`. The randomly generated code
  uses the existing eight-character alphabet, and object creation is conditional
  on the object not already existing.
- `reuseUntil` limits client caching to 24 hours; it is **not a guaranteed deletion
  or read-access deadline**. The prefix lifecycle makes captures eligible for
  deletion after one day, and deletion is asynchronous.
- Failure: JSON `{ "error": "..." }`. HTTP 413 is too large; 415 is an unsupported
  media type; 422 is malformed geometry; 429 is an admission limit; 503 is
  unavailable/busy. Limited/busy responses include `Retry-After` when applicable.
  Responses and new capture objects use `Cache-Control: no-store` (objects also
  specify `private`). Clients offer file export instead of retrying automatically.

## Enforced limits on this endpoint

| Limit | Value |
| --- | --- |
| One capture | 1 MiB |
| Upload reservations per UTC day | 1,000 (100 until October 16, 2026) |
| Reserved capture bytes per UTC day | 250 MiB (25 MiB until October 16, 2026) |
| Upload reservations per UTC minute | 10 |

The constants live in `src/lib/server/handoffQuota.ts`. They are capacity
limits, not a dollar budget. Changing them requires a reviewed deployment.

**Why the daily limits were raised (measured October 16, 2026).** Production
logs for October 9–15 show the initial limits were too low for real use. Every
day, the 100th share was accepted between 12:35 and 15:47 UTC, and every later
attempt that day got 429 until midnight UTC. Each day had 100 accepted shares,
140–180 refusals and 5–25 invalid captures (422). The cut-off came at about
9 am US Eastern, so most of the US day had no link sharing. The traffic looked
organic: uploads were spread across the hours, and most of each day's 100
captures had distinct sizes. A day's 100 captures came to 7–11 MiB, so a full
day's demand would also have reached the 25 MiB byte limit.

The new limits cover several times that demand. Worst case, a full day of
250 MiB stays one day in `inbox/` plus seven days of soft delete, about 2 GiB
retained. At regional US Storage prices that is a few cents a month. Reads of
shared captures are not counted by this quota, before or after the change.
Each request appears twice in the logs (Cloud Run and App Hosting), so halve
raw log counts.

Rejected captures now log `{"event":"handoff_invalid","stage":…}` with the
stage that refused them (`utf-8`, `json`, `format` or `validation`). A
validation failure also logs the validator's message, which holds only a field
path and a fixed reason. JSON parse messages quote the input, so they are never
logged. An additional process-local guard admits at most 30 requests per
minute into parsing/storage work; it is not the authoritative global quota.

A zero-byte object, `_system/handoff-admission-v1`, stores the current day/minute
and counters in metadata. The existing runtime identity accesses it through IAM;
Firebase rules deny public access to this path. A reservation uses **both generation
and metageneration** preconditions. Conflicting instances retry at most five times;
metadata/auth/network failures fail closed. A failed or uncertain capture write
keeps its reservation, so retries cannot reclaim capacity already consumed.
Code collisions retry at most three times and never overwrite an existing capture.

Metadata-only updates advance metageneration without creating a new data
generation. Each normal accepted upload adds one quota read and one metadata write
to the capture write; conflicts can add bounded retries. These operations and
App Hosting requests still have costs. This does not cap download traffic or
total Firebase spending. See [GCS preconditions](https://docs.cloud.google.com/storage/docs/request-preconditions)
and [object metadata](https://docs.cloud.google.com/storage/docs/metadata).

The iPhone app hashes canonical JSON and reuses successful links until one minute
before their reuse deadline. Concurrent identical sends share one request. A
bounded local cache persists only hashes, codes and expiry, never capture contents.
Changed geometry/import settings and expired entries trigger a new explicit upload.

## Configuration

Self-hosted deployments default to sharing disabled. Enable only with
`HANDOFF_UPLOADS_ENABLED=true` and `HANDOFF_BUCKET` set to the intended bucket.
Set adapter-node's `BODY_SIZE_LIMIT=2M` so its default 512 KiB limit does not
reject valid 1 MiB captures before the endpoint can enforce its own limit.
The runtime needs Application Default Credentials with object get/create/update
access for `inbox/` and the ledger. App Hosting already supplies its service
identity; do not add service-account key files to the repository or browser.
The OpenPlan3D backend's existing identity already has these permissions; this
release does not expand IAM access. Browser CI explicitly disables cloud sharing.
The token requests `devstorage.full_control`: the Storage JSON API's
`objects.patch` method requires that scope even for custom metadata updates;
`devstorage.read_write` allows inserts but fails subsequent quota updates.
See the method scopes in the [official API definition](https://storage.googleapis.com/$discovery/rest?version=v1).

## Cutover record

The public create rule was closed on October 16, 2026 at 16:30 UTC. The
Storage release for `openplan3d.firebasestorage.app` moved from ruleset
`4dd57b5d-7823-4509-9250-95f32c57d4ad` (legacy public creates) to
`a1d5ef29-ce66-420b-a356-52d433691f22`, which is this repository's
`storage.rules`. Before the release, the Rules API test method confirmed that
its only behavior change is denying anonymous creates in `inbox/`; reads by
code and the denials elsewhere are unchanged. Production checks after the
release:

- An anonymous direct create in `inbox/` returns 403.
- Public reads of the ledger, and anonymous listing of `inbox/`, return 403.
- A synthetic share through `POST /api/handoffs` returns 201. A public read of
  its code, as `/editor?import=CODE` makes, returns 200 with the editor's CORS
  origin. The synthetic capture was deleted afterwards.

Keep `storage.rules` identical to the deployed rules: deploying an older copy
with `firebase deploy --only storage` would reopen public writes. To roll back,
release the previous ruleset again (Firebase console, Storage, Rules history).
That restores older apps' direct uploads and with them the quota bypass.

Keep the one-day `inbox/` lifecycle, and do not apply it to the ledger. Recheck
retained live and soft-deleted bytes against the operating budget, which is
tracked in [issue #116](https://github.com/laanlabs/openPlan3D/issues/116).
