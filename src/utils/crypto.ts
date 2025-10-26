/**
 * Simple encryption utility for storing sensitive data in LocalStorage
 *
 * Note: This is NOT cryptographically secure for protecting against determined attackers.
 * The encryption key is derived from browser fingerprint, which can be discovered.
 * This mainly protects against:
 * - Casual inspection of LocalStorage
 * - Accidental exposure in screenshots/logs
 * - Simple automated scrapers
 *
 * For true security, use OAuth with HttpOnly cookies on a server.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

/**
 * Generate a deterministic key from browser fingerprint
 * This allows the same key to be used across sessions without storing it
 */
async function getDeterministicKey(): Promise<CryptoKey> {
  // Create a deterministic string from browser characteristics
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset().toString(),
    screen.colorDepth.toString(),
    screen.width.toString(),
    screen.height.toString(),
  ].join('|');

  // Hash the fingerprint to create key material
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Import as a CryptoKey
  return crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a string
 */
export async function encryptString(plaintext: string): Promise<string> {
  try {
    const key = await getDeterministicKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Generate a random IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the data
    const encrypted = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      data
    );

    // Combine IV + encrypted data and convert to base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a string
 */
export async function decryptString(ciphertext: string): Promise<string> {
  try {
    const key = await getDeterministicKey();

    // Decode from base64
    const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      encrypted
    );

    // Decode to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Check if Web Crypto API is available
 */
export function isCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
}
