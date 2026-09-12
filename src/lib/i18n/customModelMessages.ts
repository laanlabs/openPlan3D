import type { TranslationKey } from './index';

// Preserve unknown validator diagnostics instead of hiding useful detail.
export const customModelMessages: Record<string, TranslationKey> = {
  "Choose a GLB file up to 16 MiB.": "customModelError.file",
  "Use a model filename of at most 256 characters.": "customModelError.filename",
  "The model file changed while reading.": "customModelError.changedFile",
  "This browser cannot verify local model files.": "customModelError.verify",
  "Furniture models need nonzero width, depth and height. Export a solid model.": "customModelError.dimensions",
  "This model preview has expired. Choose the file again.": "customModelError.expired",
  "The existing model source is missing or damaged.": "customModelError.damaged",
  "A different model has the same identifier.": "customModelError.identifier",
  "A different attachment has the same filename.": "customModelError.collision",
  "This project already has the maximum number of attachments.": "customModelError.attachments",
  "This model would exceed the 64 MiB project and saved-version budget. Export a backup and remove unused attachments.": "customModelError.budget",
  "Browser storage has too little space for this model and its saved versions.": "customModelError.quota",
  "This custom model is no longer defined in the project.": "customModelError.missing",
  "Remove this model’s placed furniture before removing its definition.": "customModelError.used",
  "This custom model or floor is no longer available.": "customModelError.floor",
  "Choose a position inside the supported plan area.": "customModelError.position",
  "A model texture could not be decoded.": "customModelError.decode",
  "Model texture decoding timed out.": "customModelError.timeout",
  "This browser cannot decode local model textures.": "customModelError.browser",
  "Invalid custom model: Invalid model name.": "customModelError.name",
  "Invalid custom model: Invalid source URL.": "customModelError.source",
  "Invalid custom model: Use a public HTTP or HTTPS source URL.": "customModelError.publicSource",
  "Invalid custom model: Use at most 64 model definitions per project.": "customModelError.count",
  "Invalid GLB: Only glTF 2.0 binary containers are supported.": "customModelError.binary",
};
