# Deployment version cache correction

Issue [#81](https://github.com/laanlabs/openPlan3D/issues/81), PR
[#83](https://github.com/laanlabs/openPlan3D/pull/83).

## Reproduced failure

Native Safari previously displayed version `1788831576589` from a normal navigation
while an unconditional HTTP request and the loaded editor's bootstrap matched
`1788839033092`. The deployed version response carried a fixed 1980 Last-Modified
value and an ETag calculated from the served file's size and modification time.
The adapter-node static middleware runs before SvelteKit request handlers and
uses sirv's size/mtime validators. Equal-sized representations can therefore
collide across releases. Sizes can differ between deployments (including served
compressed files); this does not happen on every release.

The regression server serves two different, equal-byte-length, uncompressed
version responses with the same ETag and Last-Modified. It proxies the actual
production build for all other paths. It intentionally returns 304 to matching
validators, even when the request includes no-cache headers. Playwright routing
is absent so browser HTTP caching stays enabled.

## Change

The app's deployment notice compares `$app/environment.version` with a
`cache: 'no-store'` request to the existing version file. A no-cache request can
conditionally reuse a cached representation; no-store bypasses that browser
cache lookup. See [Fetch cache modes](https://developer.mozilla.org/en-US/docs/Web/API/Request/cache)
and [SvelteKit's embedded version](https://svelte.dev/docs/kit/$app-environment).
Only a successful response containing a nonblank string version can announce an
update. Requests time out after ten seconds; network, HTTP and JSON errors remain
quiet and eligible for a later retry.

The component retains its five-minute visible-page interval and one-minute
focus/visibility throttle, permits only one in-flight check, and stops checking
after detection. Development mode does not poll. The notice and its navigation
guard share the confirmed update flag; a stale framework `updated` flag cannot
independently recreate the banner. Framework internal failed-navigation recovery
is unchanged. Direct navigation to version.json can still show a cached body;
this patch makes the app's own update checks independent of those validators.

Save-before-reload, local JSON recovery and destination navigation remain in
place. No global fetch override, additional endpoint, asset cache-policy change,
cache clearing or user-data migration is involved. Existing hashed assets retain
their one-year immutable caching. Request frequency does not increase, and this
adds no Firebase Storage objects, database, sync, analytics or cloud writes.

## Validation

- 626 unit tests pass (12 new deployment-response cases plus existing save guards).
- Svelte check: zero errors, 23 existing warnings. Production build passes.
- Three new browser workflows cover the actual cached 304 control, a quiet
  current-version check, later same-size update detection, polling cessation,
  save/reload persistence with the stale cache retained, immutable asset headers,
  failed writes and JSON backup, deferred navigation, HTTP/offline errors and
  recovery. These join the existing workflows in Chromium, Firefox and WebKit.
- Native Safari and final CI/deployment results are recorded below and in the PR.
- Native iOS sources are unchanged; the existing 53-test baseline was not rerun
  for this web-only batch. Physical iPhone and release gates remain in #30.

### Native Safari cache fixture

Safari 26.2 on macOS 26.2, M4 Max Mac Studio, September 8, 2026. No Inspector,
cache clearing, application instrumentation or browser clock overrides were used.
The server proxied the local production build and changed only the version
response. Real focus/visibility checks ran after the existing one-minute throttle.

| Step | Version/body and server observation | Editor result |
| --- | --- | --- |
| Cache previous response | `1788853465361` | Version JSON opened normally |
| Serve current response, open JSON in another tab | Current is `1788853465360`; browser sends both `W/"27-315532801000"` and the 1980 date; server returns 304; Safari still displays `1788853465361` | Reproduced stale body |
| Open fixed editor with that cache retained | 200, neither conditional validator sent | No false notice |
| Change served version to `1788853465361` | 200, neither validator sent | Update notice appears |
| Restore served version to current and use Save and reload | Existing local project reopens | `Safari deployment cache recovery` name retained |
| Focus reloaded editor after throttle | 200, neither validator sent | No repeated notice |

The local fixture simulates a version switch while serving one production build;
it does not claim to deploy two different app bundles. Final production verification
uses an editor opened before the actual GitHub/App Hosting rollout. See the PR's
completion comment for final deployment and full CI evidence. Automated tests
separately verify that an unsaved revision is persisted by the reload action and
that failed writes prevent reload and retain JSON recovery.
