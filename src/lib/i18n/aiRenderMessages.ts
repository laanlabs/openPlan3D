import type { TranslationKey } from './index';

// Preserve provider-specific diagnostics; translate only app-owned messages.
export const aiRenderMessages: Record<string, TranslationKey> = {
  "Request cancelled. The provider may still finish and charge for work already started.": "aiRenderMessage.cancelled",
  "Browser storage is unavailable. This model will be used for this render only.": "aiRenderMessage.storage",
  "Rendering failed.": "aiRenderMessage.failed",
  "Please add your Gemini API key in Settings → AI first.": "aiRenderMessage.key",
  "No image returned. Try a different model or prompt.": "aiRenderMessage.noImage"
};
