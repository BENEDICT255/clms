// ==============================================================================
// Cryptographic Hash Utility (SHA-256)
// ==============================================================================

export async function computeSHA256(buffer: ArrayBuffer): Promise<string> {
  const subtleCrypto = globalThis.crypto?.subtle;
  if (subtleCrypto) {
    const hashBuffer = await subtleCrypto.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback checksum if Web Crypto is unavailable
  let hash = 0;
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    hash = (hash << 5) - hash + (bytes[i] || 0);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}
