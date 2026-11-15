const encoder = new TextEncoder();

export const MAX_NARRATIVE_BYTES = 2048;
export const MAX_CHUNK_BYTES = 128;

/** Split text without splitting a UTF-8 encoded Unicode code point. */
export function splitNarrative(text: string): string[] {
  const length = encoder.encode(text).length;
  if (!text.trim() || length > MAX_NARRATIVE_BYTES || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(text)) {
    throw new Error('Invalid narrative');
  }
  // TextEncoder replaces unpaired surrogates, which would break exact readback.
  if (new TextDecoder('utf-8', { fatal: true }).decode(encoder.encode(text)) !== text) {
    throw new Error('Invalid Unicode');
  }
  const chunks: string[] = [];
  let chunk = '';
  let chunkBytes = 0;
  for (const character of text) {
    const size = encoder.encode(character).length;
    if (chunkBytes + size > MAX_CHUNK_BYTES) {
      chunks.push(chunk);
      chunk = '';
      chunkBytes = 0;
    }
    chunk += character;
    chunkBytes += size;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}
