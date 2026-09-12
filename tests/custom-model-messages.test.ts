import { expect, it } from 'vitest';
import { customModelMessages } from '$lib/i18n/customModelMessages';
import { translate } from '$lib/i18n';

it('retains actionable English messages and translates every registered model error', () => {
  for (const [message, key] of Object.entries(customModelMessages)) {
    expect(translate('en', key)).toBe(message);
    expect(translate('pt', key)).toBeTruthy();
    expect(translate('pt', key)).not.toBe(message);
  }
  expect(translate('pt', customModelMessages['Browser storage has too little space for this model and its saved versions.'])).toContain('espaço suficiente');
  expect(translate('pt', customModelMessages['Remove this model’s placed furniture before removing its definition.'])).toContain('Remova os móveis');
  expect(customModelMessages['Future validator detail']).toBeUndefined();
});

it('translates variable schema identifiers literally and preserves unknown errors safely', async () => {
  const { customModelError } = await import('$lib/i18n/customModelMessages');
  for (const name of ['TEXCOORD_9', 'CUSTOM_{name}', 'CUSTOM_<tag>']) {
    const source = `Invalid GLB geometry: Unsupported format for ${name}.`;
    expect(customModelError(source, 'en')).toBe(source);
    expect(customModelError(source, 'pt')).toContain(name);
    expect(customModelError(source, 'pt')).toContain('formato não suportado');
  }
  expect(customModelError('Unsupported GLB extension: KHR_draco_mesh_compression is not supported by local model import yet.', 'pt')).toContain('ainda não aceita KHR_draco_mesh_compression');
  expect(customModelError('Unsupported GLB extension: KHR_materials_unlit is missing from extensionsUsed.', 'pt')).toContain('não está declarada em extensionsUsed');
  for (const message of ['constructor', '__proto__', 'Unknown decoder diagnostic']) expect(customModelError(message, 'pt')).toBe(message);
});
