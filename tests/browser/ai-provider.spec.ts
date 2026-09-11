import { expect, test, type Page } from '@playwright/test';
import { createTestAIProvider, type ProviderRequest } from '../fixtures/ai-provider';
import { readFile } from 'node:fs/promises';

const providerURL = 'http://127.0.0.1:4199';
let requests: ProviderRequest[] = [];
const provider = createTestAIProvider(request => requests.push(request));
test.beforeAll(async () => { await new Promise<void>(resolve => provider.listen(4199, '127.0.0.1', resolve)); });
test.afterAll(async () => { provider.closeAllConnections(); await new Promise<void>(resolve => provider.close(() => resolve())); });
test.beforeEach(() => { requests = []; });

async function openSettings(page: Page, width: number) {
  if (width < 768) await page.getByRole('button', { name: 'More actions', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings', exact: true });
  await dialog.getByRole('button', { name: 'AI', exact: true }).click();
  return dialog;
}

for (const width of [1440, 390]) {
  test(`direct AI provider settings and camera render work at ${width}px without hosting requests`, async ({ page, request }, testInfo) => {
    // Settings, three render outcomes, download and reload share one workflow.
    test.slow();
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [], hostingPosts: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (request.method() === 'POST' && new URL(request.url()).origin === 'http://127.0.0.1:4188') hostingPosts.push(request.url());
    });
    await page.goto('/editor');
    let dialog = await openSettings(page, width);
    await expect(dialog.getByLabel('OpenAI model', { exact: true })).toHaveValue('');
    await dialog.getByLabel('Provider API key', { exact: true }).fill('old-provider-key');
    await dialog.getByLabel('Provider base URL', { exact: true }).fill(`${providerURL}/v1/`);
    await expect(dialog.getByLabel('Provider API key', { exact: true })).toHaveValue('');
    await dialog.getByLabel('Provider API key', { exact: true }).fill('test-provider-key');
    await dialog.getByLabel('OpenAI model', { exact: true }).fill('my-manual-model');
    expect(requests).toHaveLength(0); // Editing settings never sends credentials.
    await dialog.getByRole('button', { name: 'Load models', exact: true }).click();
    await expect(dialog.getByText('2 models found. Type to search or enter another model ID.', { exact: true })).toBeVisible();
    await expect(dialog.getByLabel('OpenAI model', { exact: true })).toHaveValue('my-manual-model');
    expect(requests[0]).toMatchObject({ path: '/v1/models', method: 'GET', authorization: 'Bearer test-provider-key' });
    await dialog.getByRole('button', { name: 'Save OpenAI settings', exact: true }).click();
    await expect(dialog.getByText('OpenAI settings saved.', { exact: true })).toBeVisible();
    await testInfo.attach(`ai-settings-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
    await page.reload();
    dialog = await openSettings(page, width);
    await expect(dialog.getByLabel('Provider base URL', { exact: true })).toHaveValue(`${providerURL}/v1`);
    await expect(dialog.getByLabel('Provider API key', { exact: true })).toHaveValue('test-provider-key');
    await expect(dialog.getByLabel('OpenAI model', { exact: true })).toHaveValue('my-manual-model');
    expect(requests).toHaveLength(1);

    // A stale discovery cannot restore options from a provider that was replaced.
    await dialog.getByLabel('Provider base URL', { exact: true }).fill(`${providerURL}/slow`);
    await dialog.getByRole('button', { name: 'Load models', exact: true }).click();
    await expect.poll(() => requests.some(item => item.path === '/slow/models')).toBe(true);
    await dialog.getByLabel('Provider base URL', { exact: true }).fill(`${providerURL}/denied`);
    await dialog.getByRole('button', { name: 'Load models', exact: true }).click();
    await expect(dialog.getByText(/HTTP 401/)).toBeVisible();
    await expect(dialog.getByText(/Echoed test credential/)).toHaveCount(0);
    await dialog.getByLabel('Provider base URL', { exact: true }).fill('https://user:password@example.com');
    await dialog.getByRole('button', { name: 'Save OpenAI settings', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('must not contain credentials');
    await dialog.getByLabel('Provider base URL', { exact: true }).fill(`${providerURL}/v1`);
    await dialog.getByLabel('OpenAI model', { exact: true }).fill('echo-scene');
    await dialog.getByRole('button', { name: 'Save OpenAI settings', exact: true }).click();
    await dialog.getByRole('button', { name: 'Close settings', exact: true }).click();

    await page.getByRole('button', { name: '3D', exact: true }).click();
    const viewer = page.getByRole('region', { name: '3D floor plan viewer' });
    const canvas = viewer.locator('canvas').first();
    await expect(canvas).toBeVisible();
    await page.getByRole('button', { name: 'Place Interior Camera', exact: true }).click();
    const bounds = await canvas.boundingBox();
    await canvas.click({ position: { x: bounds!.width * 0.45, y: bounds!.height * 0.5 } });
    await page.getByRole('button', { name: '✨ AI Render', exact: true }).click();
    await page.getByRole('button', { name: 'OpenAI', exact: true }).click();
    await expect(page.getByLabel('OpenAI model', { exact: true })).toHaveValue('echo-scene');
    await page.getByRole('button', { name: '✨ Generate Photorealistic Render', exact: true }).click();
    const image = page.getByRole('img', { name: 'AI Render', exact: true });
    await expect(image).toBeVisible();
    const generated = requests.filter(item => item.path.endsWith('/responses'));
    expect(generated).toHaveLength(1);
    expect(generated[0].authorization).toBeUndefined();
    expect(generated[0].body).toMatchObject({ model: 'echo-scene', store: false, tools: [{ type: 'image_generation' }] });
    const source = generated[0].body.input[0].content[0].image_url;
    await expect(image).toHaveAttribute('src', source);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: '💾 Download Render', exact: true }).click();
    const file = await (await download).path();
    expect((await readFile(file!)).toString('base64')).toBe(source.split(',')[1]);
    await testInfo.attach(`ai-camera-render-${width}`, { body: await page.screenshot(), contentType: 'image/png' });

    await page.getByLabel('OpenAI model', { exact: true }).fill('no-image');
    await page.getByLabel('OpenAI model', { exact: true }).press('Tab');
    await page.getByRole('button', { name: '✨ Generate Photorealistic Render', exact: true }).click();
    await expect(page.getByText(/No image returned/)).toBeVisible();
    await page.getByLabel('OpenAI model', { exact: true }).fill('slow-render');
    await page.getByLabel('OpenAI model', { exact: true }).press('Tab');
    await page.getByRole('button', { name: '✨ Generate Photorealistic Render', exact: true }).click();
    await expect.poll(() => requests.some(item => item.body.model === 'slow-render')).toBe(true);
    await page.getByRole('button', { name: 'Cancel render', exact: true }).click();
    await expect(page.getByText(/Request cancelled/)).toBeVisible();
    await expect(page.getByRole('button', { name: '✨ Generate Photorealistic Render', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Close camera', exact: true }).click();
    dialog = await openSettings(page, width);
    await expect(dialog.getByLabel('OpenAI model', { exact: true })).toHaveValue('slow-render');
    await dialog.getByRole('button', { name: 'Remove OpenAI settings', exact: true }).click();
    await page.reload();
    dialog = await openSettings(page, width);
    await expect(dialog.getByLabel('Provider API key', { exact: true })).toHaveValue('');
    await expect(dialog.getByLabel('Provider base URL', { exact: true })).toHaveValue('');
    await expect(dialog.getByLabel('OpenAI model', { exact: true })).toHaveValue('');
    expect(errors).toEqual([]);
    expect(hostingPosts).toEqual([]);
    const proxy = await request.post('/api/openai-proxy', { data: { endpoint: `${providerURL}/v1/models` } });
    expect(proxy.status()).toBe(404);
  });
}
