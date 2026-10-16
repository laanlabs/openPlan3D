# Assistant shares and the remote MCP server

September 16, 2026. Implements Option A of the native repository's
[hosted connector design](https://github.com/laanlabs/openplan3d-ios/blob/main/docs/hosted-connector-design.md):
share codes without accounts, on the existing handoff service.

A person chooses **Share with Assistant** in the iPhone, iPad or Mac app (or the
web Export menu). The client uploads the ordinary project package; the server
keeps only `manifest.json`, `plan.json` and the attachments the plan references,
stores it for seven days, and returns an eight-character **code** and a 32-hex
**secret**. In Claude, the OpenPlan3D connector's tools take that pair and run
the same four skills that exist locally. Nothing is uploaded without that
explicit action; photos are included unless the client asks for `?photos=0`.

## Endpoints

| Method and path | Purpose |
| --- | --- |
| `POST /api/assistant-shares[?photos=0]` | Upload a project package (`Content-Type: application/zip`). Returns `201 { code, secret, expiresAt, title }`. |
| `DELETE /api/assistant-shares/CODE` | Body `{ "secret": "..." }`. Removes the share immediately. `204`. |
| `POST /mcp` | Model Context Protocol, streamable HTTP, stateless JSON-RPC. `GET`/`DELETE` return 405. |

Errors are JSON `{ "error": "..." }`: 400 malformed, 403 wrong secret or locked,
404 unknown or expired, 408 slow upload, 410 expired, 413 too large, 415 wrong
media type, 422 not a valid package, 429 quota (with `Retry-After`), 503
disabled or storage unavailable. Responses use `Cache-Control: no-store`.

## What is stored

`assistant-shares/CODE/package.zip` in the handoff bucket, `application/zip`,
with custom metadata: `source=assistant-share-v1`, `secretHash` (SHA-256 of the
secret; the secret itself is never stored or logged), `expiresAt`, `failures`,
`title` (≤120 characters, control characters removed), `producer` and
`photos`. Retained web/native originals (`web.json`, `baseline.json`,
`mapping.json`), unreferenced attachments and, when photos are excluded, photo
references and files are dropped before storage. The package is validated with
the editor's own strict ZIP profile and plan validator first.

## Limits

| Limit | Value | Where |
| --- | --- | --- |
| One share with photos | 64 MiB | `SHARE_LIMITS.maxBytes` |
| One share without photos | 16 MiB | `SHARE_LIMITS.maxBytesWithoutPhotos` |
| Shares per UTC day / bytes per day | 20 / 200 MiB | ledger `_system/assistant-share-admission-v1` |
| Shares per UTC minute | 5 | same ledger |
| Process-local upload guard | 10 per minute per instance | route |
| Wrong secrets before lockout | 20 | object metadata `failures` |
| MCP calls per code / per instance | 30 / 120 per minute | process-local |
| Retention | 7 days by lifecycle, immediate on `DELETE` | bucket lifecycle |

The ledger reuses the handoff admission algorithm (`reserveAdmission`) with
its own object, so handoff and share quotas never compete. The limits are
initial capacity guards, not a spending cap.

## MCP tools

All tools require `code` and `secret` arguments and are read-only.

| Tool | Output |
| --- | --- |
| `summarize_share` | floors, rooms with areas from the statistics block, openings, furniture, notes, attachments, documentation gaps |
| `review_share_photos` | photos per room and item, missing/unreferenced/shared/low-resolution files, photos still to take |
| `handoff_share` | per-floor and per-room quantities, openings schedule, inventory, evidence, quantities table; optional `codes` map; no pricing |
| `list_share_files` | package entries with sizes, title, expiry, whether photos were included |

The computations are `src/lib/skills/`, line-for-line ports of the Python
scripts in the native repository's `tooling/skills/`. `tests/skills-parity.test.ts`
compares both implementations on the shared package fixtures; regenerate
`tests/fixtures/skills/*.json` with the Python scripts when either side
changes on purpose.

The connector only reads; for the write side (an assistant that creates or edits a plan file the person opens with Import JSON) use the [plan-authoring skill](skills/openplan3d-plan-authoring/SKILL.md).

Claude: **Settings → Connectors → Add custom connector**, URL
`https://app.openplan3d.com/mcp`, no authentication. Then ask for a summary,
photo review or handoff and give the code and secret when prompted. The
skills' `SKILL.md` files describe both the connector path and the attach-a-file
path.

## Deployment

1. Apply the lifecycle rules to the bucket. `ops/lifecycle.json` carries both
   the existing one-day `inbox/` rule and the seven-day `assistant-shares/`
   rule; the command replaces the whole configuration, so never apply a
   partial file:

   ```sh
   gcloud storage buckets update gs://openplan3d.firebasestorage.app --lifecycle-file=ops/lifecycle.json
   ```

2. Deploy the application. `apphosting.yaml` raises `BODY_SIZE_LIMIT` to 68M
   so the share endpoint can count bytes and answer its own 413; the handoff
   endpoint still enforces 1 MiB itself.
3. Set `ASSISTANT_SHARES_ENABLED` to `"true"` in `apphosting.yaml` and deploy
   again. Until then all three routes answer 503 and nothing is stored.
4. Verify: upload a small package with `curl -X POST --data-binary @package.zip
   -H 'Content-Type: application/zip' https://app.openplan3d.com/api/assistant-shares`,
   run `tools/list` against `/mcp`, call `summarize_share` with the returned
   pair, then `DELETE` it.

Turning the feature off is the same variable set back to `"false"`; stored
shares then age out by lifecycle.

## Clients

The web editor's Export menu has **Share with Assistant…**
(`AssistantShareDialog.svelte`, `src/lib/services/assistantShare.ts`): an
include-photos checkbox, a plain statement of what is uploaded and for how
long, then the code and secret shown once with copy buttons, the connector
URL and a remove-now link. The iPhone/iPad/Mac app has the same action in the
review screen's export menu (native repository, `AssistantShareService`).

## Verified

September 16, 2026: production upload, all four tools, wrong-secret refusal,
405 on GET and delete verified with curl; in claude.ai, a custom connector
added with no sign-in listed the four tools, and a chat ran the summary and
photo-review tools with per-call approval, reusing the code and secret from
the first message. In ChatGPT (Pro, Developer mode on), a custom MCP
connector with No Auth discovered the tools, and a chat ran `summarize_share`
after one allow prompt with a correct summary. Tools now carry read-only
annotations so ChatGPT stops labelling them as write or destructive.
The storage rules deny public access to `assistant-shares/` through the
catch-all rule; the server uses the runtime identity.
