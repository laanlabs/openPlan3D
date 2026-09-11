import { expect, test } from '@playwright/test';

for (const width of [390, 1440]) test(`Portuguese view controls at ${width}px preserve toggle state`, async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/editor');
  if (width === 390) {
    await page.getByRole('button', { name: 'Mais ações', exact: true }).click();
    const pan = page.getByRole('button', { name: /Modo de deslocamento/ });
    const before = await pan.textContent();
    await pan.click();
    await expect(pan).not.toHaveText(before!);
    await pan.click();
    await expect(pan).toHaveText(before!);
    const snap = page.getByRole('button', { name: /Ajustar à grade/ });
    const snapBefore = await snap.textContent();
    await snap.click();
    await expect(snap).not.toHaveText(snapBefore!);
    await page.getByRole('button', { name: 'Ampliar', exact: true }).click();
    await expect(page.getByRole('button', { name: /Redefinir zoom/ })).toContainText('125%');
    await page.getByRole('button', { name: /Redefinir zoom/ }).click();
    await expect(page.getByRole('button', { name: /Redefinir zoom/ })).toContainText('100%');
    await expect(page.getByRole('button', { name: /Mostrar móveis/ })).toBeVisible();
  } else {
    const snap = page.getByRole('button', { name: 'Ajustar à grade', exact: true });
    const before = await snap.getAttribute('title');
    await snap.click();
    await expect(snap).not.toHaveAttribute('title', before!);
    await snap.click();
    await expect(snap).toHaveAttribute('title', before!);
    const furniture = page.getByRole('button', { name: 'Alternar móveis', exact: true });
    const furnitureBefore = await furniture.getAttribute('title');
    await furniture.click();
    await expect(furniture).not.toHaveAttribute('title', furnitureBefore!);
    await expect(page.getByRole('button', { name: 'Planta', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Modo de seleção', exact: true })).toBeVisible();
  }
});
