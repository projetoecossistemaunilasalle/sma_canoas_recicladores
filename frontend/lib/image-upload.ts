export const MAX_IMAGE_BYTES = 1_000_000; // 1MB raw, before base64 inflation — mirrors backend/src/lib/base64-image.ts

export class ImageValidationError extends Error {}

// Validates type/size synchronously (so the form can reject immediately)
// before handing off to FileReader, then resolves a base64 data URL ready
// to send as-is to POST /announcements.
export function toBase64Image(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new ImageValidationError("O arquivo precisa ser uma imagem."));
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return Promise.reject(new ImageValidationError("A imagem precisa ter no máximo 1MB."));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new ImageValidationError("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}
