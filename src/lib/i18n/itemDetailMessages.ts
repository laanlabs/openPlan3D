import type { TranslationKey } from './index';

// Translate known UI messages while retaining unrecognized service diagnostics.
export const itemDetailMessages: Record<string, TranslationKey> = {
  "This attachment could not be downloaded. Export a JSON backup to retain the original saved data.": "itemDetailMessage.download",
  "Could not update item details.": "itemDetailMessage.update",
  "Enter a cost of zero or more, or clear the field.": "itemDetailMessage.cost",
  "Enter a positive ceiling height, or clear the field to use the default.": "itemDetailMessage.ceiling",
  "Photo attached. Save the project to keep it in this browser.": "itemDetailMessage.attached",
  "Could not add the photo. The project has not changed.": "itemDetailMessage.add",
  "Existing attachment reused.": "itemDetailMessage.reused",
  "Could not attach the photo.": "itemDetailMessage.attach",
  "This file is still used by an item or tracing image. Remove those references first.": "itemDetailMessage.used",
  "Could not check attachment references.": "itemDetailMessage.references",
  "File removed from this project’s future exports. Save to keep this change.": "itemDetailMessage.deleted",
  "Could not delete the attachment.": "itemDetailMessage.delete"
};
