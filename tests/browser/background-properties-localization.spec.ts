import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('Portuguese background controls preserve image bytes and restore removed images', async ({ page }) => {
  const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
  const dataUrl = `data:image/png;base64,${(await readFile('tests/fixtures/item-photo.png')).toString('base64')}`;
  plan.floors[0].backgroundImage = { dataUrl, position: { x: 200, y: 150 }, scale: 1, opacity: .5, rotation: 0, locked: false };
  const upper = structuredClone(plan.floors[0]);
  upper.id = 'calibration-upper'; upper.name = 'Upper'; upper.level = 1;
  plan.floors.push(upper);
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importar JSON', exact: true }).click();
  await (await chooser).setFiles({ name: 'background.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
  const panel = page.locator('[data-plan-properties]');
  await expect(panel.getByRole('heading', { name: /Imagem de fundo/ })).toBeVisible();
  await expect(panel.getByRole('button', { name: '📏 Definir escala', exact: true })).toBeVisible();
  async function exported(floorIndex = 0) {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[floorIndex];
  }
  const original = await exported();
  const canvas = page.getByLabel('Floor plan editor canvas', { exact: true });
  let unexpectedPrompts = 0;
  const dismissUnexpected = async (dialog: import('@playwright/test').Dialog) => { unexpectedPrompts++; await dialog.dismiss(); };
  page.on('dialog', dismissUnexpected);
  await panel.getByRole('button', { name: '📏 Definir escala', exact: true }).click();
  await canvas.click({ position: { x: 200, y: 200 } });
  await page.keyboard.press('Escape');
  await canvas.click({ position: { x: 400, y: 200 } });
  page.off('dialog', dismissUnexpected);
  expect(unexpectedPrompts).toBe(0);
  page.on('dialog', dismissUnexpected);
  await panel.getByRole('button', { name: '📏 Definir escala', exact: true }).click();
  await canvas.click({ position: { x: 200, y: 200 } });
  await page.getByRole('combobox', { name: 'Pavimento atual', exact: true }).selectOption(upper.id);
  await canvas.click({ position: { x: 400, y: 200 } });
  page.off('dialog', dismissUnexpected);
  expect(unexpectedPrompts).toBe(0);
  expect((await exported(1)).backgroundImage).toEqual(upper.backgroundImage);
  await page.getByRole('combobox', { name: 'Pavimento atual', exact: true }).selectOption(plan.floors[0].id);

  expect((await exported()).backgroundImage).toEqual(original.backgroundImage);

  for (const answer of ['Infinity', '0', '-5', null]) {
    await panel.getByRole('button', { name: '📏 Definir escala', exact: true }).click();
    await canvas.click({ position: { x: 200, y: 200 } });
    let message = '';
    page.once('dialog', async dialog => {
      message = dialog.message();
      if (answer === null) await dialog.dismiss(); else await dialog.accept(answer);
    });
    await canvas.click({ position: { x: 400, y: 200 } });
    expect(message).toBe('Digite a distância real entre estes dois pontos (em cm):');
    expect((await exported()).backgroundImage).toEqual(original.backgroundImage);
  }
  for (const label of ['Opacidade','Escala']) {
    const slider = panel.getByRole('slider', { name: label, exact: true });
    await slider.focus(); await slider.press('ArrowRight');
  }
  const rotation = panel.getByRole('spinbutton', { name: 'Rotação', exact: true });
  await rotation.fill('27.5'); await rotation.press('Tab');
  await panel.getByRole('button', { name: '🔓 Desbloqueado', exact: true }).click();
  const edited = await exported();
  expect(edited.backgroundImage).toEqual({ ...original.backgroundImage, scale: 1.05, opacity: .55, rotation: 27.5, locked: true });
  for (const key of ['walls','doors','windows','rooms','furniture']) expect(edited[key]).toEqual(original[key]);
  await panel.getByRole('button', { name: 'Remover imagem', exact: true }).click();
  expect((await exported()).backgroundImage).toBeUndefined();
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  expect((await exported()).backgroundImage).toEqual(edited.backgroundImage);

  await page.getByRole('button', { name: 'Zoom em 100%', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Zoom em 100%', exact: true })).toHaveText('100%');
  await panel.getByRole('button', { name: '📏 Definir escala', exact: true }).click();
  await canvas.click({ position: { x: 200, y: 200 } });
  page.once('dialog', dialog => dialog.accept('400'));
  await canvas.click({ position: { x: 400, y: 200 } });
  const calibrated = (await exported()).backgroundImage;
  expect(calibrated.scale).toBeCloseTo(edited.backgroundImage.scale * 2);
  expect({ ...calibrated, scale: edited.backgroundImage.scale }).toEqual(edited.backgroundImage);
});
