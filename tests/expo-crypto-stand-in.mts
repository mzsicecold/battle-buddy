/**
 * Stand-in for expo-crypto, whose native AES module does not exist in Node. It follows the same contract
 * (random 12-byte IV, ciphertext, 16-byte tag, packed as IV + ciphertext + tag, authentication failure on
 * any change), built on node:crypto. Shared by the vault tests; see the notes at the top of
 * vault-crypto.test.mts for what that does and does not prove.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export const IV_BYTES = 12;
export const TAG_BYTES = 16;

export class StandInKey {
  readonly bytes: Uint8Array;
  constructor(bytes: Uint8Array) {
    this.bytes = Uint8Array.from(bytes);
  }
  static import(bytes: Uint8Array): StandInKey {
    return new StandInKey(bytes);
  }
}

export class StandInSealedData {
  readonly packed: Uint8Array;
  constructor(packed: Uint8Array) {
    this.packed = packed;
  }
  static fromCombined(combined: Uint8Array | string): StandInSealedData {
    const bytes = typeof combined === 'string' ? Buffer.from(combined, 'base64') : combined;
    return new StandInSealedData(Uint8Array.from(bytes));
  }
  async combined(encoding?: 'bytes' | 'base64'): Promise<Uint8Array | string> {
    return encoding === 'base64' ? Buffer.from(this.packed).toString('base64') : this.packed;
  }
}

async function aesEncryptAsync(plaintext: Uint8Array, key: StandInKey): Promise<StandInSealedData> {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key.bytes, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return new StandInSealedData(Buffer.concat([iv, ciphertext, cipher.getAuthTag()]));
}

async function aesDecryptAsync(
  sealed: StandInSealedData,
  key: StandInKey,
  _options?: { output?: 'bytes' | 'base64' }
): Promise<Uint8Array> {
  const packed = Buffer.from(sealed.packed);
  if (packed.length < IV_BYTES + TAG_BYTES) throw new Error('Sealed data is too short');
  const iv = packed.subarray(0, IV_BYTES);
  const tag = packed.subarray(packed.length - TAG_BYTES);
  const ciphertext = packed.subarray(IV_BYTES, packed.length - TAG_BYTES);
  const decipher = createDecipheriv('aes-256-gcm', key.bytes, iv);
  decipher.setAuthTag(tag);
  // final() throws if the tag does not verify (wrong key or modified data).
  return new Uint8Array(Buffer.concat([decipher.update(ciphertext), decipher.final()]));
}

async function getRandomBytesAsync(length: number): Promise<Uint8Array> {
  return new Uint8Array(randomBytes(length));
}

export const expoCryptoStandIn = {
  AESEncryptionKey: StandInKey,
  AESSealedData: StandInSealedData,
  aesEncryptAsync,
  aesDecryptAsync,
  getRandomBytesAsync,
};
