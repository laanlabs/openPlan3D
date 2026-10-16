import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const id = 'qa-assistant-share';
const reply = { code: 'ABCDEFGH', secret: '0123456789abcdef0123456789abcdef', expiresAt: '2026-10-23T12:00:00.000Z', title: 'QA Assistant Share' };

async function seed(page: Page) {
  const project = JSON.parse(await readFile('tests/fixtures/save-conflicts.openplan.json', 'utf8'));
  project.id = id; project.name = 'QA Assistant Share';
  await page.addInitScript(project => {
    if (!localStorage.getItem('qaAssistantShareSeeded')) {
      localStorage.setItem('floorplan_projects', JSON.stringify({ [project.id]: JSON.stringify(project) }));
      localStorage.setItem('hasSeenWelcome', 'true');
      localStorage.setItem('qaAssistantShareSeeded', 'true');
    }
  }, project);
  await page.goto(`/editor?id=${id}`);
  await expect(page.getByRole('application')).toContainText('4 walls');
}
function observe(page: Page) {
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/^https?:/.test(r.url()) && new URL(r.url()).origin !== 'http://127.0.0.1:4188') external.push(r.url()); });
  return () => { expect(errors).toEqual([]); expect(external).toEqual([]); };
}

test('Share with Assistant uploads the open plan and shows its one-time code and secret', async ({ page }) => {
  const check = observe(page); await seed(page);
  const requests: string[] = [];
  await page.route('**/api/assistant-shares**', async route => {
    const request = route.request(), url = new URL(request.url());
    requests.push(`${request.method()} ${url.pathname}${url.search}`);
    if (request.method() === 'POST') await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(reply) });
    else await route.fulfill({ status: 204 });
  });
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByRole('button', { name: 'Share with Assistant…', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Share with Assistant', exact: true });
  // The editor holds this project in reactive state; packaging it must not fail to clone it.
  await dialog.getByRole('button', { name: 'Share', exact: true }).click();
  await expect(dialog).toContainText(reply.code);
  await expect(dialog).toContainText(reply.secret);
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  expect(requests).toEqual(['POST /api/assistant-shares']);
  await dialog.getByRole('button', { name: 'Remove share now', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('The share was removed.');
  expect(requests).toEqual(['POST /api/assistant-shares', `DELETE /api/assistant-shares/${reply.code}`]);
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  check();
});

test('a share in progress survives repeated Escape and still shows its one-time secret', async ({ page }) => {
  const check = observe(page); await seed(page);
  let respond = () => {};
  const responded = new Promise<void>(resolve => { respond = resolve; });
  await page.route('**/api/assistant-shares**', async route => {
    await responded;
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(reply) });
  });
  const exportMenu = page.getByRole('button', { name: 'Export', exact: true });
  const opener = page.getByRole('button', { name: 'Share with Assistant…', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Share with Assistant', exact: true });
  await exportMenu.click(); await opener.click();
  await dialog.getByRole('button', { name: 'Share', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Sharing…', exact: true })).toBeDisabled();
  // A prevented Escape is honoured once per user activation; the next press closes the
  // dialog anyway. No assertions between the presses: they can count as activation.
  for (let press = 0; press < 3; press++) await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('open', '');
  respond();
  await expect(dialog).toContainText(reply.code);
  await expect(dialog).toContainText(reply.secret);
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await exportMenu.click(); await opener.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Share', exact: true })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  check();
});
