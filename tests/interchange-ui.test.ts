import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { get } from 'svelte/store';
import { translate } from '$lib/i18n';
import { interchangeFileName, projectToPreparedRoomPlan, sortedJson } from '$lib/utils/interchange';
import { SIBLING_PLANNERS, TransferLinkError, decodeTransferPayload, siblingImportUrl } from '$lib/utils/transferLink';
import { USER_GUIDE_URL, downloadInterchangeJson, exportNotice, openInSiblingPlanner, type PlannerTab } from '$lib/stores/exportNotice';
import { roomProject } from './fixtures/project';

vi.mock('$lib/utils/export', () => ({ exportAsPNG: vi.fn(), exportPDF: vi.fn() }));
// The real codec by default; single tests reject to exercise each failure branch.
vi.mock('$lib/utils/transferLink', async importOriginal => {
  const actual = await importOriginal<typeof import('$lib/utils/transferLink')>();
  return { ...actual, siblingImportUrl: vi.fn(actual.siblingImportUrl) };
});

/** A stand-in for the tab window.open returns. */
function tab() {
  const navigated: string[] = [];
  const popup = { opener: {} as unknown, closed: false, location: { replace: (url: string) => { navigated.push(url); } }, close() { popup.closed = true; } };
  return { popup, navigated, open: vi.fn((_url: string, _target: string): PlannerTab => popup), download: vi.fn() };
}
const notice = () => { const value = get(exportNotice); return value && { title: translate('en', value.title), message: translate('en', value.message) }; };
beforeEach(() => exportNotice.set(null));

describe('openInSiblingPlanner', () => {
  it('opens the tab during the click, then sends it the transfer link with the opener severed', async () => {
    const { popup, navigated, open, download } = tab(), project = roomProject();
    const pending = openInSiblingPlanner(project, 'opencatio3d', open, download);
    expect(open).toHaveBeenCalledWith('about:blank', '_blank'); // before any await, so pop-up blockers see a user gesture
    expect(navigated).toEqual([]);
    await expect(pending).resolves.toBe(true);
    expect(popup.opener).toBeNull();
    expect(popup.closed).toBe(false);
    expect(navigated).toHaveLength(1);
    expect(navigated[0].startsWith('https://app.opencatio3d.com/#/import/v1/')).toBe(true);
    expect(await decodeTransferPayload(navigated[0].split('/#/import/v1/')[1])).toEqual(projectToPreparedRoomPlan(project));
    expect(download).not.toHaveBeenCalled();
    expect(get(exportNotice)).toBeNull();
  });

  it('reports a blocked pop-up without building anything', async () => {
    const { navigated, download } = tab();
    expect(await openInSiblingPlanner(roomProject(), 'openlandscape3d', () => null, download)).toBe(false);
    expect(notice()).toEqual({ title: "Couldn't open the other planner", message: 'The browser blocked the new tab. Allow pop-ups for this site and try again.' });
    expect(siblingImportUrl).not.toHaveBeenCalled();
    expect(navigated).toEqual([]);
    expect(download).not.toHaveBeenCalled();
  });

  it('downloads the interchange JSON instead when the plan is too large for a link', async () => {
    const { popup, navigated, open, download } = tab(), project = roomProject();
    vi.mocked(siblingImportUrl).mockRejectedValueOnce(new TransferLinkError('This plan is too large for an OpenKitchen3D link.', 'too-large'));
    expect(await openInSiblingPlanner(project, 'openkitchen3d', open, download)).toBe(false);
    expect(popup.closed).toBe(true);
    expect(navigated).toEqual([]);
    expect(download).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledWith(project);
    expect(notice()?.message).toBe('This plan is too large for a link, so the interchange JSON was downloaded instead. Use Import in the other planner.');
  });

  it('tells a browser without CompressionStream to use the file', async () => {
    vi.stubGlobal('CompressionStream', undefined);
    const { popup, open, download } = tab();
    expect(await openInSiblingPlanner(roomProject(), 'opencatio3d', open, download)).toBe(false);
    expect(popup.closed).toBe(true);
    expect(download).not.toHaveBeenCalled();
    expect(notice()?.message).toBe("This browser can't build transfer links. Download the interchange JSON and import it in the other planner.");
  });

  it('contains other failures as a generic notice', async () => {
    const { popup, open, download } = tab();
    vi.mocked(siblingImportUrl).mockRejectedValueOnce(new Error('private implementation details'));
    expect(await openInSiblingPlanner(roomProject(), 'opencatio3d', open, download)).toBe(false);
    expect(popup.closed).toBe(true);
    expect(download).not.toHaveBeenCalled();
    expect(notice()).toEqual({ title: "Couldn't open the other planner", message: 'Could not build the link. Download the interchange JSON instead.' });
    expect(translate('pt', 'exportNotice.linkFailed')).not.toContain('private');
  });

  it('labels one menu item per planner', () => {
    expect(SIBLING_PLANNERS.map(planner => translate('en', 'exportMenu.openIn', { name: planner.name }))).toEqual(['Open in OpenLandscape3D', 'Open in OpenKitchen3D', 'Open in OpenCatio3D']);
    expect(translate('pt', 'exportMenu.openIn', { name: 'OpenCatio3D' })).toBe('Abrir no OpenCatio3D');
  });
});

describe('downloadInterchangeJson', () => {
  it('saves the indented, key-sorted prepared RoomPlan JSON under the family file name', async () => {
    const anchor = { href: '', download: '', clicks: 0, click() { anchor.clicks++; } };
    vi.stubGlobal('document', { createElement: vi.fn(() => anchor) });
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:plan');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const project = roomProject(), before = JSON.stringify(project);
    downloadInterchangeJson(project);
    expect(JSON.stringify(project)).toBe(before);
    expect(anchor).toMatchObject({ href: 'blob:plan', download: 'Regression-plan-openplan3d.json', clicks: 1 });
    expect(anchor.download).toBe(interchangeFileName(project));
    const blob = create.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/json');
    expect(await blob.text()).toBe(sortedJson(projectToPreparedRoomPlan(project), 2));
    expect(JSON.parse(await blob.text())).toMatchObject({ openplanPrepared: true, openplanHandoffVersion: 1 });
    expect(revoke).toHaveBeenCalledWith('blob:plan');
  });
});

describe('user guide link', () => {
  it('is one published address, shared by the editor and inlined where the export code must not load', () => {
    expect(USER_GUIDE_URL).toBe('https://github.com/laanlabs/openPlan3D/blob/main/docs/user-guide.md');
    const source = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    for (const file of ['src/lib/components/toolbar/TopBar.svelte', 'src/routes/editor/+page.svelte']) {
      expect(source(file), file).toMatch(/USER_GUIDE_URL[^\n]*from '\$lib\/stores\/exportNotice'/);
    }
    expect(source('src/routes/+page.svelte')).toContain(`const USER_GUIDE_URL = '${USER_GUIDE_URL}'`);
    for (const file of ['src/lib/components/toolbar/TopBar.svelte', 'src/routes/editor/+page.svelte', 'src/routes/+page.svelte']) {
      expect(source(file), file).toMatch(/href=\{USER_GUIDE_URL\} target="_blank" rel="noopener"/);
    }
  });
});
