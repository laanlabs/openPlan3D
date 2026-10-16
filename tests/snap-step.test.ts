import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { translate, type Locale, type TranslationKey } from '$lib/i18n';
import { SNAP, snap } from '$lib/utils/canvasInteraction';
import { snapStatus, snapStepLabel } from '$lib/utils/snapStep';

describe('the status-bar snap step', () => {
  it('names the grid and the finer step in centimetres', () => {
    expect(snapStepLabel(25, 'metric')).toBe('25 cm');
    expect(snapStepLabel(SNAP, 'metric')).toBe('10 cm');
  });

  it('keeps a tenth of an inch in feet and inches, because the steps stay metric', () => {
    expect(snapStepLabel(25, 'imperial')).toBe('9.8"');
    expect(snapStepLabel(SNAP, 'imperial')).toBe('3.9"');
  });

  it('only changes the step: the finer step still rounds, and only the top-bar switch stops snapping', () => {
    expect(snap(137, true, true, 25)).toBe(125);
    expect(snap(137, true, false, 25)).toBe(140);
    expect(snap(137, false, true, 25)).toBe(137);
  });

  it('is the rounding the plan canvas ships: the canvas calls this snap() and keeps no copy of it or of SNAP', () => {
    const canvas = readFileSync(new URL('../src/lib/components/editor/FloorPlanCanvas.svelte', import.meta.url), 'utf8');
    expect(canvas).toMatch(/import \{[^}]*\bsnap as _snap\b[^}]*\} from '\$lib\/utils\/canvasInteraction'/);
    expect(canvas).toContain('return _snap(v, currentSnapEnabled, currentSnapToGrid, currentGridSize);');
    expect(canvas).not.toMatch(/\bconst SNAP\b/);
  });

  for (const language of ['en', 'pt'] as const) {
    it(`is not labelled as the top-bar Snap to Grid switch (${language})`, () => {
      const hint = translate(language, 'canvasDisplay.snapHint', { grid: '25 cm', fine: '10 cm' });
      const shortcut = translate(language, 'shortcuts.snap');
      const snapSwitch = [translate(language, 'toolbarView.snap'), translate(language, 'commandPalette.toggleSnap')];
      for (const text of [hint, shortcut]) {
        for (const label of snapSwitch) expect(text.toLowerCase()).not.toContain(label.toLowerCase());
      }
      expect(hint).toContain('25 cm');
      expect(hint).toContain('10 cm');
      expect(translate(language, 'canvasDisplay.snap', { step: '10 cm' })).toContain('10 cm');
    });
  }
});

describe('the status-bar Snap button', () => {
  const on = { enabled: true, snapToGrid: true, gridSize: 25 };
  const off = { ...on, enabled: false };
  const tFor = (language: Locale) => (key: TranslationKey, variables?: Record<string, string | number>) => translate(language, key, variables);

  it('names the step S picked while Snap to Grid is on, pressed on the grid step', () => {
    const hint = 'Switch snap step: 25 cm grid or 10 cm (S)';
    expect(snapStatus(tFor('en'), on, 'metric')).toEqual({ label: 'Snap 25 cm', title: hint, pressed: true });
    expect(snapStatus(tFor('en'), { ...on, snapToGrid: false }, 'metric')).toEqual({ label: 'Snap 10 cm', title: hint, pressed: false });
  });

  it('reads Snap off, not pressed, while the top-bar Snap to Grid is off, and its title keeps the step S picked', () => {
    expect(snapStatus(tFor('en'), off, 'metric')).toEqual({
      label: 'Snap off',
      title: 'Snap to Grid is off in the top bar. S still picks the step used when it is on: 25 cm grid or 10 cm (now 25 cm)',
      pressed: false,
    });
    expect(snapStatus(tFor('en'), { ...off, snapToGrid: false }, 'imperial')).toEqual({
      label: 'Snap off',
      title: 'Snap to Grid is off in the top bar. S still picks the step used when it is on: 9.8" grid or 3.9" (now 3.9")',
      pressed: false,
    });
  });

  it('says the same in Portuguese', () => {
    expect(snapStatus(tFor('pt'), on, 'metric')).toEqual({ label: 'Ajuste 25 cm', title: 'Alternar passo do ajuste: grade de 25 cm ou 10 cm (S)', pressed: true });
    expect(snapStatus(tFor('pt'), { ...off, snapToGrid: false }, 'metric')).toEqual({
      label: 'Ajuste desativado',
      title: 'O botão Ajustar à grade da barra superior está desativado. S ainda escolhe o passo usado quando ele estiver ativado: grade de 25 cm ou 10 cm (agora 10 cm)',
      pressed: false,
    });
  });

  for (const language of ['en', 'pt'] as const) {
    it(`names the top-bar switch in its off title but never takes that name as its label (${language})`, () => {
      const snapSwitch = translate(language, 'toolbarView.snap');
      const status = snapStatus(tFor(language), off, 'metric');
      expect(status.title).toContain(snapSwitch);
      expect(status.label.toLowerCase()).not.toContain(snapSwitch.toLowerCase());
    });
  }
});
