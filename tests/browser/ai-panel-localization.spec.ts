import { expect, test } from '@playwright/test';

test('Portuguese AI choices preserve provider prompt values without sending an image', async ({ page }) => {
  test.slow();
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  const external: string[] = [];
  await page.route(/^https?:\/\//, route => {
    if (new URL(route.request().url()).origin !== 'http://127.0.0.1:4188') { external.push(route.request().url()); return route.abort(); }
    return route.continue();
  });
  await page.goto('/editor');
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const viewer = page.getByRole('region', { name: 'Visualizador 3D da planta', exact: true });
  const canvas = viewer.locator('canvas').first();
  // Cold production navigation must load the 3D bundle before creating canvas.
  await expect(canvas).toBeVisible({ timeout: 60_000 });
  await viewer.getByRole('button', { name: 'Posicionar câmera interna', exact: true }).click();
  const bounds = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: bounds.width * .45, y: bounds.height * .5 } });
  await viewer.getByRole('button', { name: '✨ Renderizar com IA', exact: true }).click();
  await viewer.getByRole('combobox', { name: 'Estilo', exact: true }).selectOption({ label: 'visualização arquitetônica' });
  await viewer.getByRole('combobox', { name: 'Iluminação', exact: true }).selectOption({ label: 'hora dourada' });
  await viewer.getByRole('combobox', { name: 'Atmosfera', exact: true }).selectOption({ label: 'aconchegante' });
  await viewer.getByRole('textbox', { name: 'Instruções adicionais (opcional)', exact: true }).fill('Preserve {walls} — detalhe original');
  await viewer.getByText('Ver prompt completo', { exact: true }).click();
  const prompt = viewer.locator('details p');
  await expect(prompt).toContainText('into a architectural visualization image. Lighting: golden hour. Mood: cozy.');
  await expect(prompt).toContainText('Preserve {walls} — detalhe original');
  await expect(viewer.getByRole('button', { name: '✨ Gerar renderização fotorrealista', exact: true })).toBeVisible();
  await viewer.getByRole('button', { name: 'OpenAI', exact: true }).click();
  await expect(viewer.getByText('A imagem da câmera é enviada diretamente a este provedor. O provedor pode cobrar pelo serviço.', { exact: true })).toBeVisible();
  await viewer.getByRole('button', { name: 'Gemini', exact: true }).click();
  await viewer.getByRole('button', { name: '✨ Gerar renderização fotorrealista', exact: true }).click();
  await expect(viewer.getByText('❌ Falha na renderização com IA', { exact: true })).toBeVisible();
  await expect(viewer.locator('pre')).toHaveText('Adicione sua chave de API do Gemini em Configurações → IA primeiro.');
  await expect(viewer.getByRole('button', { name: '✨ Gerar renderização fotorrealista', exact: true })).toBeEnabled();
  await viewer.getByRole('button', { name: 'Ocultar IA', exact: true }).click();
  await expect(prompt).toHaveCount(0);
  expect(external).toEqual([]);
});
