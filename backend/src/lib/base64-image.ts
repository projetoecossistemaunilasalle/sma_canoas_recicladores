const BASE64_IMAGE_PREFIX = /^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/]+=*)$/

export const MAX_IMAGE_BYTES = 1_000_000 // 1MB raw, before base64 inflation

// Validates a data URL is an image of an allowed type and that its decoded
// size doesn't exceed MAX_IMAGE_BYTES — computed from the base64 payload
// length (no need to actually decode the buffer).
export function isValidBase64Image(value: string): boolean {
  const match = BASE64_IMAGE_PREFIX.exec(value)
  if (!match) return false

  const payload = match[2]
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0
  const decodedBytes = (payload.length * 3) / 4 - padding

  return decodedBytes <= MAX_IMAGE_BYTES
}
