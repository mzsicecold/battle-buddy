/**
 * Encryption for the Battle Buddy vault.
 *
 * Key derivation (PBKDF2-HMAC-SHA256) uses modules/pbkdf2-native on iOS, which calls
 * the system's CommonCrypto, since expo-crypto has no KDF of its own. Where that module
 * is missing it falls back to pure JS via @noble/hashes, which gives the same key but is
 * far slower. The actual bulk cipher (AES-256-GCM) uses expo-crypto's native
 * implementation, backed by the platform's own crypto library (CryptoKit on iOS).
 *
 * Measured on an iPhone 16 release build at 210,000 iterations: the JS version took about
 * 11.2 s to create or unlock a vault, the native module about 0.1 s. Each vault file stores
 * its own iteration count, so changing PBKDF2_ITERATIONS only affects vaults created afterwards.
 */
import * as Crypto from 'expo-crypto';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';

import { nativePbkdf2Sha256Hex } from '../../modules/pbkdf2-native/src/index.ts';

/**
 * Used for vaults created from now on (current OWASP guidance for PBKDF2-HMAC-SHA256 is 600,000).
 * Vaults made earlier keep the count stored in their file, which was 210,000.
 * With the native module this takes about 0.3 s on an iPhone 16; the JavaScript fallback would take
 * over 30 s, so a build without the module should not be used for real vaults.
 */
export const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;

/** Shape persisted to disk. Never contains the password or the derived key. */
export interface VaultFile {
  saltHex: string;
  iterations: number;
  combinedB64: string;
}

const KEY_BYTES = 32;

/**
 * The native module (iOS) and @noble/hashes compute the same PBKDF2-HMAC-SHA256, so a vault keyed
 * by either one opens with the other. Native takes well under a second; the JavaScript version took
 * about 11 seconds for 210,000 iterations on an iPhone 16 release build (over 30 s at the current
 * 600,000), so it is only the fallback
 * for builds without the module (Android, web) or if the native call fails.
 */
async function pbkdf2Key(password: string, saltHex: string, iterations: number): Promise<Uint8Array> {
  try {
    const hex = await nativePbkdf2Sha256Hex(password, saltHex, iterations, KEY_BYTES);
    if (hex !== null && hex.length === KEY_BYTES * 2) return hexToBytes(hex);
  } catch {
    // Fall through to the JavaScript implementation, which gives the same key.
  }
  return pbkdf2Async(sha256, password, hexToBytes(saltHex), { dkLen: KEY_BYTES, c: iterations });
}

export async function deriveKey(
  password: string,
  saltHex: string,
  iterations: number
): Promise<Crypto.AESEncryptionKey> {
  return Crypto.AESEncryptionKey.import(await pbkdf2Key(password, saltHex, iterations));
}

async function encryptWithKey(key: Crypto.AESEncryptionKey, data: unknown): Promise<string> {
  const plaintextBytes = utf8ToBytes(JSON.stringify(data));
  const sealed = await Crypto.aesEncryptAsync(plaintextBytes, key);
  const combined = await sealed.combined('base64');
  return combined as string;
}

async function decryptWithKey<T>(key: Crypto.AESEncryptionKey, combinedB64: string): Promise<T> {
  const sealed = Crypto.AESSealedData.fromCombined(combinedB64);
  const plaintextBytes = await Crypto.aesDecryptAsync(sealed, key, { output: 'bytes' });
  const text = new TextDecoder().decode(plaintextBytes as Uint8Array);
  return JSON.parse(text) as T;
}

/** Encrypts raw file bytes under the vault key. Output is IV + ciphertext + tag, ready to write to disk. */
export async function encryptBytes(key: Crypto.AESEncryptionKey, bytes: Uint8Array): Promise<Uint8Array> {
  const sealed = await Crypto.aesEncryptAsync(bytes, key);
  return sealed.combined('bytes');
}

/** Reverses encryptBytes. Throws if the data was tampered with or the key is wrong. */
export async function decryptBytes(key: Crypto.AESEncryptionKey, combined: Uint8Array): Promise<Uint8Array> {
  const sealed = Crypto.AESSealedData.fromCombined(combined);
  return Crypto.aesDecryptAsync(sealed, key, { output: 'bytes' });
}

/** A new random salt and the key a password gives under it, at the current iteration count. */
export async function createVaultKey(
  password: string
): Promise<{ saltHex: string; iterations: number; key: Crypto.AESEncryptionKey }> {
  const saltBytes = await Crypto.getRandomBytesAsync(SALT_BYTES);
  const saltHex = bytesToHex(saltBytes);
  const key = await deriveKey(password, saltHex, PBKDF2_ITERATIONS);
  return { saltHex, iterations: PBKDF2_ITERATIONS, key };
}

/** Creates a brand-new vault (new salt) from a password and initial data. */
export async function createVault(
  password: string,
  data: unknown
): Promise<{ file: VaultFile; key: Crypto.AESEncryptionKey }> {
  const { saltHex, iterations, key } = await createVaultKey(password);
  const combinedB64 = await encryptWithKey(key, data);
  return { file: { saltHex, iterations, combinedB64 }, key };
}

/** Re-derives the key for an existing vault file and decrypts it. Throws on wrong password. */
export async function unlockVault<T>(
  password: string,
  file: VaultFile
): Promise<{ data: T; key: Crypto.AESEncryptionKey }> {
  const key = await deriveKey(password, file.saltHex, file.iterations);
  const data = await decryptWithKey<T>(key, file.combinedB64);
  return { data, key };
}

/** Re-encrypts data under an already-derived key (used on every save). */
export async function saveVault(
  key: Crypto.AESEncryptionKey,
  saltHex: string,
  iterations: number,
  data: unknown
): Promise<VaultFile> {
  const combinedB64 = await encryptWithKey(key, data);
  return { saltHex, iterations, combinedB64 };
}
