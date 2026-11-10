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
    expect(res.result.tools.map((t: any) => t.name)).toEqual(['status', 'get_project', 'list_elements', 'edit_project', 'replace_project', 'list_library', 'delete_projects']);
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

describe('agent bridge without a tab (mirror folder)', () => {
  it('edits the mirrored project and lets a tab catch up', async () => {
    const { mkdtempSync, writeFileSync, readFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { roomProject } = await import('./fixtures/project');
    const { syncTab } = await import('$lib/server/agentBridge');
    const dir = mkdtempSync(join(tmpdir(), 'op3d-mirror-'));
    process.env.OPENPLAN3D_MIRROR_DIR = dir;
    try {
      const p: any = roomProject();
      p.id = 'mirror-test'; p.updatedAt = '2026-01-01T00:00:00.000Z';
      p.floors[0].furniture = [{ id: 'chair-1', catalogId: 'chair', position: { x: 10, y: 10 }, rotation: 0, scale: { x: 1, y: 1, z: 1 } }];
      writeFileSync(join(dir, 'mirror-test.json'), JSON.stringify(p));
      const res: any = await call('edit_project', { projectId: 'mirror-test', ops: [{ op: 'update', id: 'chair-1', set: { rotation: 90 } }] });
      expect(res.result.structuredContent).toMatchObject({ applied: true, via: 'mirror' });
      const disk = JSON.parse(readFileSync(join(dir, 'mirror-test.json'), 'utf8'));
      expect(disk.floors[0].furniture[0].rotation).toBe(90);
      expect((await syncTab('tab-sync-1', 'mirror-test', '2026-01-01T00:00:00.000Z')).pull).toBeTruthy(); // tab is older → pull
      expect(await syncTab('tab-sync-1', 'mirror-test', '2999-01-01T00:00:00.000Z')).toEqual({ push: true }); // tab newer → push
      const lib: any = await call('list_library');
      expect(lib.result.isError).toBe(true); // the library needs a tab
    } finally { delete process.env.OPENPLAN3D_MIRROR_DIR; }
  });
});
