import { expect, test } from '@playwright/test';

test('cancelled and dragged touches do not become clicks or double taps', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/editor');
  const canvas = page.getByLabel('Floor plan editor canvas', { exact: true });
  const stages = await canvas.evaluate(node => {
    const bounds = node.getBoundingClientRect();
    let clicks = 0, doubles = 0;
    node.addEventListener('click', () => clicks++);
    node.addEventListener('dblclick', () => doubles++);
    function touch(type: string, points: number[][], changed = points) {
      const list = (points: number[][]) => points.map(([x, y], identifier) => ({ identifier, target: node, clientX: bounds.x + x, clientY: bounds.y + y }));
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperties(event, { touches: { value: list(points) }, changedTouches: { value: list(changed) } });
      node.dispatchEvent(event);
    }
    const result: { clicks: number; doubles: number }[] = [];
    const tap = () => { touch('touchstart', [[100, 250]]); touch('touchend', [], [[100, 250]]); };
    tap(); result.push({ clicks, doubles });
    touch('touchstart', [[100, 250]]); touch('touchcancel', [], [[100, 250]]);
    result.push({ clicks, doubles });
    tap(); result.push({ clicks, doubles }); // cancellation breaks the tap chain
    touch('touchstart', [[100, 250]]); touch('touchmove', [[200, 250]]);
    touch('touchmove', [[100, 250]]); touch('touchend', [], [[100, 250]]);
    result.push({ clicks, doubles }); // returning to the start does not make a drag a tap
    tap(); tap(); result.push({ clicks, doubles });
    return result;
  });
  expect(stages).toEqual([
    { clicks: 1, doubles: 0 }, { clicks: 1, doubles: 0 },
    { clicks: 2, doubles: 0 }, { clicks: 2, doubles: 0 },
    { clicks: 4, doubles: 1 },
  ]);
});
