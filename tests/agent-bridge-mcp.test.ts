import { afterEach, describe, expect, it } from 'vitest';
import { connectTab, isLocalClient, bridgeEnabled, reply } from '$lib/server/agentBridge';
import { handleBridgeMcpMessage } from '$lib/server/agentBridgeMcp';

const call = (name: string, args: Record<string, unknown> = {}) =>
  handleBridgeMcpMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });

describe('agent bridge MCP', () => {
  let disconnect = () => {};
  afterEach(() => disconnect());

  it('is local and dev-only', () => {
    expect(isLocalClient('127.0.0.1')).toBe(true);
    expect(isLocalClient('::1')).toBe(true);
    expect(isLocalClient('192.168.0.10')).toBe(false);
    expect(bridgeEnabled(false, {})).toBe(false);
    expect(bridgeEnabled(false, { OPENPLAN3D_AGENT_BRIDGE: '1' })).toBe(true);
    expect(bridgeEnabled(true, {})).toBe(true);
  });

  it('lists its tools', async () => {
    const res: any = await handleBridgeMcpMessage({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(res.result.tools.map((t: any) => t.name)).toEqual(['status', 'get_project', 'list_elements', 'edit_project', 'replace_project']);
  });

  it('reports a clear error when no editor tab is connected', async () => {
    const res: any = await call('get_project');
    expect(res.result.isError).toBe(true);
    expect(res.result.content[0].text).toMatch(/No editor tab/);
  });

  it('relays a request to the tab and returns its answer', async () => {
    const sent: any[] = [];
    disconnect = connectTab('tab-test-1', (event, data) => {
      sent.push({ event, data });
      if (event === 'request') queueMicrotask(() => reply('tab-test-1', (data as any).requestId, true, { changed: ['a'] }));
    });
    const res: any = await call('edit_project', { ops: [{ op: 'remove', id: 'a' }] });
    expect(sent[0].data.kind).toBe('apply');
    expect(res.result.structuredContent).toEqual({ changed: ['a'] });
  });

  it('passes the tab refusal through as a tool error', async () => {
    disconnect = connectTab('tab-test-2', (event, data) => {
      if (event === 'request') queueMicrotask(() => reply('tab-test-2', (data as any).requestId, false, 'no element with id "x"'));
    });
    const res: any = await call('edit_project', { ops: [{ op: 'remove', id: 'x' }] });
    expect(res.result.isError).toBe(true);
    expect(res.result.content[0].text).toMatch(/no element/);
  });
});
