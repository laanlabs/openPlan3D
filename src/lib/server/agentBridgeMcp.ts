import { BridgeError, request, status, type BridgeKind } from './agentBridge';

/** MCP server (streamable HTTP, stateless) for the local agent bridge: read and edit the project open in the editor. */
export const BRIDGE_MCP_SERVER_INFO = { name: 'openplan3d-local', version: '0.1.0' };
export const BRIDGE_MCP_INSTRUCTIONS =
  'Edits the floor plan open in a local OpenPlan3D editor tab, live. Lengths are CENTIMETRES in plan coordinates (x right, ' +
  'y down), angles degrees clockwise. Elements are addressed by id (list_elements / get_project). Each edit_project call is ' +
  'one Undo step in the editor and is validated like an import; if anything is invalid nothing changes. Prefer small ' +
  'targeted ops over replace_project.';

const opSchema = {
  type: 'object',
  description: 'One of: {op:"update", id, set:{field: value|null}} (null removes an optional field); ' +
    '{op:"add", floorId, collection, item:{id, ...}}; {op:"remove", id}; {op:"updateFloor", floorId, set:{name|level|elevation|slabThickness}}',
  properties: { op: { type: 'string', enum: ['update', 'add', 'remove', 'updateFloor'] } }, required: ['op'],
};
const projectId = { type: 'string', description: 'Optional: only act if this project is the one open' };

export function bridgeTools() {
  return [
    { name: 'status', annotations: { readOnlyHint: true }, description: 'Which editor tabs are connected and which project each has open.', inputSchema: { type: 'object', properties: {} } },
    { name: 'get_project', annotations: { readOnlyHint: true }, description: 'The open project: a summary (floors, rooms, element counts) by default, or the full JSON without large images/attachments with full=true.',
      inputSchema: { type: 'object', properties: { full: { type: 'boolean' }, projectId } } },
    { name: 'list_elements', annotations: { readOnlyHint: true }, description: 'Elements of the open project, compact. Filter by floorId, collection (walls, doors, windows, furniture, stairs, columns, rooms, guides, measurements, annotations, textAnnotations, entourage) and query (matches id, catalogId, name, label).',
      inputSchema: { type: 'object', properties: { floorId: { type: 'string' }, collection: { type: 'string' }, query: { type: 'string' }, limit: { type: 'number' }, projectId } } },
    { name: 'edit_project', description: 'Apply operations to the open project as ONE Undo step (all or nothing). Returns the changed ids.',
      inputSchema: { type: 'object', properties: { ops: { type: 'array', items: opSchema }, description: { type: 'string', description: 'Undo history label' }, projectId }, required: ['ops'] } },
    { name: 'replace_project', description: 'Replace the open project with a full project JSON (same id), as one Undo step. With open=true a project with another id is opened instead, after the current plan is saved; an id the library already holds opens as a copy with a new id (see "opened"). Use for regenerated plans; prefer edit_project for changes.',
      inputSchema: { type: 'object', properties: { project: { type: 'object' }, open: { type: 'boolean' }, description: { type: 'string' }, projectId: { type: 'string', description: 'Optional: the project id open in the tab that should do this' } }, required: ['project'] } },
    { name: 'list_library', annotations: { readOnlyHint: true }, description: 'Projects in the browser library of the connected editor tab (id, name, last change). Needs an open tab.', inputSchema: { type: 'object', properties: {} } },
    { name: 'delete_projects', annotations: { destructiveHint: true }, description: 'Delete projects from the browser library by id (never the one open in the tab). Needs an open tab. Irreversible: list first and only delete what the user asked for.',
      inputSchema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } }, required: ['ids'] } },
  ];
}

class ToolError extends Error {}
async function callTool(name: string, args: Record<string, any>) {
  const relay = async (kind: BridgeKind, a: Record<string, unknown>) => {
    try { return await request(kind, a, kind === 'replace' ? 60_000 : 15_000); }
    catch (error) { if (error instanceof BridgeError) throw new ToolError(error.message); throw error; }
  };
  switch (name) {
    case 'status': return status();
    case 'list_library': return relay('library', {});
    case 'delete_projects':
      if (!Array.isArray(args.ids) || !args.ids.length) throw new ToolError('"ids" must be a non-empty array.');
      return relay('delete', { ids: args.ids });
    case 'get_project': return relay(args.full ? 'get' : 'summary', { projectId: args.projectId });
    case 'list_elements': return relay('list', args);
    case 'edit_project':
      if (!Array.isArray(args.ops)) throw new ToolError('"ops" must be an array.');
      return relay('apply', args);
    case 'replace_project':
      if (!args.project || typeof args.project !== 'object') throw new ToolError('"project" must be a project object.');
      return relay('replace', args);
    default: throw new ToolError(`Unknown tool: ${name}`);
  }
}

export async function handleBridgeMcpMessage(message: any): Promise<Record<string, any> | null> {
  if (!message || typeof message !== 'object' || Array.isArray(message) || typeof message.method !== 'string') {
    return { jsonrpc: '2.0', id: message?.id ?? null, error: { code: -32600, message: 'Invalid request' } };
  }
  const { method, id } = message, params = message.params ?? {};
  if (method.startsWith('notifications/') || id === undefined || id === null) return null;
  let result: any;
  if (method === 'initialize') {
    result = { protocolVersion: typeof params.protocolVersion === 'string' && params.protocolVersion ? params.protocolVersion : '2025-06-18',
      capabilities: { tools: { listChanged: false } }, serverInfo: BRIDGE_MCP_SERVER_INFO, instructions: BRIDGE_MCP_INSTRUCTIONS };
  } else if (method === 'ping') result = {};
  else if (method === 'tools/list') result = { tools: bridgeTools() };
  else if (method === 'resources/list') result = { resources: [] };
  else if (method === 'prompts/list') result = { prompts: [] };
  else if (method === 'tools/call') {
    try {
      const value = await callTool(String(params.name), params.arguments && typeof params.arguments === 'object' ? params.arguments : {});
      const structured = Array.isArray(value) ? { items: value } : value; // structuredContent must be an object
      result = { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }], structuredContent: structured, isError: false };
    } catch (error) {
      if (error instanceof ToolError) result = { content: [{ type: 'text', text: error.message }], isError: true };
      else return { jsonrpc: '2.0', id, error: { code: -32603, message: error instanceof Error ? error.message : 'Internal error' } };
    }
  } else return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
  return { jsonrpc: '2.0', id, result };
}
