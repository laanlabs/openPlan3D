# Local agent bridge

Lets an AI agent or script on the **same machine** read and edit the project that is open in an editor tab, live,
while you keep working in it. Typical uses: "move every ceiling light to the room centre", "add a radiator under each
window", keeping a plan in sync with a home-automation system, or regenerating a plan from code without the
export → import round trip.

It is a **development-server feature**: active in `npm run dev` (or a server started with `OPENPLAN3D_AGENT_BRIDGE=1`),
answering **loopback clients only** (anything else gets 404), and only the editor's own pages or programs outside a
browser (see [Who can call it](#who-can-call-it)). Production builds and the hosted app do not include it. Nothing
leaves the machine.

## How it works

```
agent ──MCP/HTTP──▶ dev server /agent-bridge/mcp ──SSE──▶ editor tab (holds the project in IndexedDB)
                                        ◀── reply ─────────┘   edits applied as ONE Undo step, then autosaved
                                        ◀── saved ── (optional mirror to OPENPLAN3D_MIRROR_DIR/<project id>.json)
```

- The project stays where it always is — in the tab. The server only relays requests to the most recently active
  connected tab (or the one with the requested `projectId` open) and returns its answer.
- Edits run **in the tab against its current state**, are validated with `readProject()` like an import, and are
  recorded as one Undo step (`applyExternalProject` in `stores/project.ts`); autosave stores them as usual. A failing
  operation changes nothing.
- An edit that arrives while you are dragging something (or in another gesture that collects its frames into one
  Undo step) waits until you let go, then applies to the result as its own Undo step (`afterUndoGroup`). If the
  gesture is still going after 10 seconds, the edit is refused unchanged with a "retry in a moment" error. Changes
  that come from the mirror folder wait the same way, without the time limit.
- With `OPENPLAN3D_MIRROR_DIR=<dir>`, every completed save is also written to `<dir>/<project id>.json` (atomic
  rename), so tools can watch a file instead of polling.

## Editing the mirrored file

The mirror folder is also an input: when `<dir>/<project id>.json` is changed by something other than the server (a
script, an editor, an agent writing JSON) and it is a valid project, tabs with that project open apply it as one Undo
step ("Edited on disk"). Invalid files are ignored with a warning in the server log.

## Without an open tab

With a mirror folder (`OPENPLAN3D_MIRROR_DIR`), agents don't need a tab at all: when no tab has the project open, reads
and edits work on `<dir>/<project id>.json` with the same validated operations (answers carry `"via": "mirror"`).
When a tab later opens that project it reconciles with the mirror (`POST /agent-bridge/sync`): a newer file on disk is
applied in the tab as one Undo step ("Changes made while the editor was closed"); a newer copy in the tab is saved
back to the mirror. The browser library itself (`list_library`, `delete_projects`) still needs a tab.

## Who can call it

Every `/agent-bridge/*` route (`mcp`, `events`, `reply`, `saved`, `sync`) runs the same check
(`src/lib/server/agentBridgeGuard.ts`). Web pages from any site you have open run on this machine too, so a loopback
address alone does not keep them out. A request is refused when:

| Check | Answer | Why |
| --- | --- | --- |
| bridge off, or the client address is not loopback | 404 | the bridge does not exist for it |
| `Host` is not `localhost`, `127.0.0.1` or `[::1]` (any port) | 403 | DNS rebinding: a rebound page sends its own hostname |
| `Origin` is sent and its host and port differ from `Host` | 403 | another site, or another server on this machine |
| `Sec-Fetch-Site` is sent and is not `same-origin` (or `none`) | 403 | cross-site requests that carry no `Origin`, e.g. `<script src>` |
| a POST without `Content-Type: application/json` | 415 | other sites can send `text/plain` without a preflight |

Local MCP clients and scripts send no `Origin` or `Sec-Fetch-*` headers and pass; so do the editor tab's own
same-origin requests. The port is not checked: a browser never lets a page send a loopback `Host` for its own
hostname, so the hostname alone defeats rebinding, and the dev server may move to another port. Under `npm run dev`,
Vite's own `server.allowedHosts` check already answers most foreign hostnames with 403 before the bridge sees them;
the bridge's check also covers a server started with `OPENPLAN3D_AGENT_BRIDGE=1`.

## MCP endpoint

Streamable HTTP, stateless: `POST http://localhost:5173/agent-bridge/mcp`. For Claude Code:

```sh
claude mcp add --transport http openplan3d-local http://localhost:5173/agent-bridge/mcp
```

| Tool | What it does |
| --- | --- |
| `status` | connected tabs and their open project ids; the mirror folder |
| `get_project` | summary (floors, rooms, element counts), or `full: true` for the JSON without large images/attachments |
| `list_elements` | compact element records; filter by `floorId`, `collection`, `query` (id, catalogId, name, label) |
| `edit_project` | `ops` applied as one Undo step, all or nothing: `update {id, set}` (a `null` value removes an optional field), `add {floorId, collection, item}`, `remove {id}`, `updateFloor {floorId, set}` |
| `replace_project` | replace the open project with a full project JSON (same id) as one Undo step, or `open: true` to open a different project the way the editor opens an import: the current plan is saved first (nothing opens if that fails), and an id the library already holds opens as a copy with a new id (`opened` is the new id, `copyOf` the original) |
| `list_library` | projects in the tab's browser library (needs a tab) |
| `delete_projects` | delete library projects by id, never the open one; refuses unknown ids (needs a tab) |

Units are the editor's: **centimetres** in plan coordinates (x right, y down), angles in degrees clockwise. Every
tool accepts an optional `projectId` so an agent never edits a tab that shows a different project.

## Plain HTTP (without MCP)

The same endpoint speaks JSON-RPC directly (send `Content-Type: application/json`; anything else gets 415):

```sh
curl -s localhost:5173/agent-bridge/mcp -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_elements","arguments":{"query":"sofa"}}}'
```

## Code

`src/lib/utils/agentOps.ts` (pure operations + summaries, unit-tested), `src/lib/server/agentBridge.ts` (tab hub,
relay, mirror), `src/lib/server/agentBridgeMcp.ts` (MCP), `src/routes/agent-bridge/*` (SSE, reply, saved, sync, mcp),
`src/lib/server/agentBridgeGuard.ts` (who may call), `src/lib/services/agentBridge.ts` (tab side, started by the editor
page in dev). Tests: `tests/agent-ops.test.ts`, `tests/agent-bridge-mcp.test.ts`, `tests/agent-bridge-guard.test.ts`,
`tests/agent-bridge-tab.test.ts`.
