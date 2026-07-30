/**
 * Encryption for the Battle Buddy vault.
 *
 * Key derivation (PBKDF2-HMAC-SHA256) runs in pure JS via @noble/hashes, since
 * expo-crypto has no KDF of its own. The actual bulk cipher (AES-256-GCM) uses
 * expo-crypto's native implementation, which is both faster and backed by the
 * platform's own crypto library (CryptoKit on iOS) rather than a JS AES loop.
 *
 * PBKDF2_ITERATIONS is intentionally lower than the 600,000 used in the web
 * prototype: that number assumed a browser's native (C++) PBKDF2. Here the KDF
 * itself is pure JS, so the same iteration count would cost noticeably more
 * wall-clock time on a phone CPU. Re-benchmark on-device before shipping and
 * adjust so unlock stays comfortably under ~1s.
 */
import * as Crypto from 'expo-crypto';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';

export const PBKDF2_ITERATIONS = 210_000;
const SALT_BYTES = 16;

/** Shape persisted to disk. Never contains the password or the derived key. */
export interface VaultFile {
  saltHex: string;
  iterations: number;
  combinedB64: string;
}

export async function deriveKey(
  password: string,
  saltHex: string,
  iterations: number
): Promise<Crypto.AESEncryptionKey> {
  const salt = hexToBytes(saltHex);
  const keyBytes = await pbkdf2Async(sha256, password, salt, { dkLen: 32, c: iterations });
  return Crypto.AESEncryptionKey.import(keyBytes);
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

/** Creates a brand-new vault (new salt) from a password and initial data. */
export async function createVault(
  password: string,
  data: unknown
): Promise<{ file: VaultFile; key: Crypto.AESEncryptionKey }> {
  const saltBytes = await Crypto.getRandomBytesAsync(SALT_BYTES);
  const saltHex = bytesToHex(saltBytes);
  const key = await deriveKey(password, saltHex, PBKDF2_ITERATIONS);
  const combinedB64 = await encryptWithKey(key, data);
  return { file: { saltHex, iterations: PBKDF2_ITERATIONS, combinedB64 }, key };
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

/** Changes the password: verifies the current one, then re-derives + re-encrypts under a new salt/key. */
export async function changeVaultPassword<T>(
  currentPassword: string,
  newPassword: string,
  file: VaultFile
): Promise<{ file: VaultFile; key: Crypto.AESEncryptionKey }> {
  // Throws if currentPassword is wrong.
  const { data } = await unlockVault<T>(currentPassword, file);
  return createVault(newPassword, data);
}
