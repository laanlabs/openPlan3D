# Local agent bridge

Lets an AI agent or script on the **same machine** read and edit the project that is open in an editor tab, live,
while you keep working in it. Typical uses: "move every ceiling light to the room centre", "add a radiator under each
window", keeping a plan in sync with a home-automation system, or regenerating a plan from code without the
export → import round trip.

It is a **development-server feature**: active in `npm run dev` (or a server started with `OPENPLAN3D_AGENT_BRIDGE=1`),
answering **loopback clients only** (anything else gets 404). Production builds and the hosted app do not include it.
Nothing leaves the machine.

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
- With `OPENPLAN3D_MIRROR_DIR=<dir>`, every completed save is also written to `<dir>/<project id>.json` (atomic
  rename), so tools can watch a file instead of polling.

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
| `replace_project` | replace the open project with a full project JSON (same id) as one Undo step, or `open: true` to open a different project |

Units are the editor's: **centimetres** in plan coordinates (x right, y down), angles in degrees clockwise. Every
tool accepts an optional `projectId` so an agent never edits a tab that shows a different project.

## Plain HTTP (without MCP)

The same endpoint speaks JSON-RPC directly:

```sh
curl -s localhost:5173/agent-bridge/mcp -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_elements","arguments":{"query":"sofa"}}}'
```

## Code

`src/lib/utils/agentOps.ts` (pure operations + summaries, unit-tested), `src/lib/server/agentBridge.ts` (tab hub,
relay, mirror), `src/lib/server/agentBridgeMcp.ts` (MCP), `src/routes/agent-bridge/*` (SSE, reply, saved, mcp),
`src/lib/services/agentBridge.ts` (tab side, started by the editor page in dev). Tests: `tests/agent-ops.test.ts`,
`tests/agent-bridge-mcp.test.ts`.
