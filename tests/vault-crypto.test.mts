/**
 * Unit tests for src/lib/vault-crypto.ts.
 *
 * Run with `npm test`.
 *
 * IMPORTANT LIMIT: the app does AES-256-GCM through expo-crypto's native module, which does not exist
 * in Node. These tests replace it with a stand-in built on node:crypto that follows the same contract
 * (random 12-byte IV, ciphertext, 16-byte tag, packed as IV + ciphertext + tag, authentication failure
 * on any change). So they verify THIS repo's logic -- salting, key derivation, stored format, password
 * change, error handling -- against a faithful AES-GCM implementation. They do not test the native
 * module itself, and they do not replace testing on a device.
 */
import assert from 'node:assert/strict';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { before, describe, it, mock } from 'node:test';

const IV_BYTES = 12;
const TAG_BYTES = 16;

class StandInKey {
  readonly bytes: Uint8Array;
  constructor(bytes: Uint8Array) {
    this.bytes = Uint8Array.from(bytes);
  }
  static import(bytes: Uint8Array): StandInKey {
    return new StandInKey(bytes);
  }
}

class StandInSealedData {
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

type VaultCrypto = typeof import('../src/lib/vault-crypto.ts');
let vc: VaultCrypto;

before(async () => {
  mock.module('expo-crypto', {
    exports: {
      AESEncryptionKey: StandInKey,
      AESSealedData: StandInSealedData,
      aesEncryptAsync,
      aesDecryptAsync,
      getRandomBytesAsync,
    },
  });
  vc = await import('../src/lib/vault-crypto.ts');
});

const SAMPLE = {
  profile: { name: 'Doe, Jane', rank: 'E-7' },
  journal: [{ text: 'Rough week — tired but okay ☕' }],
  note: 'plaintext-marker-9f3a',
};
const PASSWORD = 'correct horse battery staple';

/** Flips one bit in the middle of the base64-encoded packed bytes. */
function tamperBase64(b64: string): string {
  const bytes = Buffer.from(b64, 'base64');
  bytes[Math.floor(bytes.length / 2)] ^= 0x01;
  return bytes.toString('base64');
}

describe('vault round trip', () => {
  it('unlocks with the right password and returns the original data', async () => {
    const { file } = await vc.createVault(PASSWORD, SAMPLE);
    const { data } = await vc.unlockVault<typeof SAMPLE>(PASSWORD, file);
    assert.deepEqual(data, SAMPLE);
  });

  it('rejects a wrong password', async () => {
    const { file } = await vc.createVault(PASSWORD, SAMPLE);
    await assert.rejects(vc.unlockVault('not the password', file));
  });

  it('rejects a password that differs only in case or by one character', async () => {
    const { file } = await vc.createVault(PASSWORD, SAMPLE);
    await assert.rejects(vc.unlockVault(PASSWORD.toUpperCase(), file));
    await assert.rejects(vc.unlockVault(PASSWORD + ' ', file));
  });
});

describe('stored file format', () => {
  it('records the salt and iteration count, and nothing secret', async () => {
    const { file } = await vc.createVault(PASSWORD, SAMPLE);
    assert.deepEqual(Object.keys(file).sort(), ['combinedB64', 'iterations', 'saltHex']);
    assert.equal(file.iterations, vc.PBKDF2_ITERATIONS);
    assert.match(file.saltHex, /^[0-9a-f]{32}$/, 'salt should be 16 random bytes in hex');
  });

  it('never contains the password or any plaintext field', async () => {
    const { file } = await vc.createVault(PASSWORD, SAMPLE);
    const onDisk = JSON.stringify(file);
    for (const secret of [PASSWORD, 'plaintext-marker-9f3a', 'Doe, Jane', 'E-7']) {
      assert.ok(!onDisk.includes(secret), `stored file leaked: ${secret}`);
    }
    const raw = Buffer.from(file.combinedB64, 'base64').toString('latin1');
    assert.ok(!raw.includes('plaintext-marker-9f3a'), 'ciphertext contains plaintext');
  });

  it('uses a fresh random salt and ciphertext for each vault, even with the same password and data', async () => {
    const a = await vc.createVault(PASSWORD, SAMPLE);
    const b = await vc.createVault(PASSWORD, SAMPLE);
    assert.notEqual(a.file.saltHex, b.file.saltHex);
    assert.notEqual(a.file.combinedB64, b.file.combinedB64);
  });

  it('reads the iteration count from the file, so changing it breaks the key', async () => {
    const { file } = await vc.createVault(PASSWORD, SAMPLE);
    await assert.rejects(vc.unlockVault(PASSWORD, { ...file, iterations: file.iterations - 1 }));
  });
});

describe('tamper detection', () => {
  it('rejects modified ciphertext', async () => {
    const { file } = await vc.createVault(PASSWORD, SAMPLE);
    await assert.rejects(vc.unlockVault(PASSWORD, { ...file, combinedB64: tamperBase64(file.combinedB64) }));
  });

  it('rejects a modified salt', async () => {
    const { file } = await vc.createVault(PASSWORD, SAMPLE);
    const flipped = (file.saltHex[0] === '0' ? '1' : '0') + file.saltHex.slice(1);
    await assert.rejects(vc.unlockVault(PASSWORD, { ...file, saltHex: flipped }));
  });

  it('rejects truncated ciphertext', async () => {
    const { file } = await vc.createVault(PASSWORD, SAMPLE);
    const truncated = Buffer.from(file.combinedB64, 'base64').subarray(0, 10).toString('base64');
    await assert.rejects(vc.unlockVault(PASSWORD, { ...file, combinedB64: truncated }));
  });
});

describe('saving', () => {
  it('re-encrypts under the same key with a new IV, keeping salt and iterations', async () => {
    const { file, key } = await vc.createVault(PASSWORD, SAMPLE);
    const updated = { ...SAMPLE, note: 'edited' };
    const saved = await vc.saveVault(key, file.saltHex, file.iterations, updated);

    assert.equal(saved.saltHex, file.saltHex);
    assert.equal(saved.iterations, file.iterations);
    assert.notEqual(saved.combinedB64, file.combinedB64);

    const { data } = await vc.unlockVault<typeof updated>(PASSWORD, saved);
    assert.equal(data.note, 'edited');
  });

  it('never reuses an IV: saving identical data twice gives different ciphertext', async () => {
    const { file, key } = await vc.createVault(PASSWORD, SAMPLE);
    const one = await vc.saveVault(key, file.saltHex, file.iterations, SAMPLE);
    const two = await vc.saveVault(key, file.saltHex, file.iterations, SAMPLE);
    assert.notEqual(one.combinedB64, two.combinedB64);
    const iv = (f: typeof one) => Buffer.from(f.combinedB64, 'base64').subarray(0, 12).toString('hex');
    assert.notEqual(iv(one), iv(two));
  });
});

describe('changing the password', () => {
  it('keeps the data, uses a new salt, and swaps which password works', async () => {
    const { file } = await vc.createVault(PASSWORD, SAMPLE);
    const next = await vc.changeVaultPassword<typeof SAMPLE>(PASSWORD, 'a brand new passphrase', file);

    assert.notEqual(next.file.saltHex, file.saltHex);
    await assert.rejects(vc.unlockVault(PASSWORD, next.file), 'old password must stop working');
    const { data } = await vc.unlockVault<typeof SAMPLE>('a brand new passphrase', next.file);
    assert.deepEqual(data, SAMPLE);
  });

  it('refuses when the current password is wrong, and leaves the original file usable', async () => {
    const { file } = await vc.createVault(PASSWORD, SAMPLE);
    const snapshot = JSON.stringify(file);
    await assert.rejects(vc.changeVaultPassword('wrong current', 'whatever new', file));
    assert.equal(JSON.stringify(file), snapshot, 'original file must not be modified');
    const { data } = await vc.unlockVault<typeof SAMPLE>(PASSWORD, file);
    assert.deepEqual(data, SAMPLE);
  });
});

describe('file bytes (documents)', () => {
  // A cheap key is fine here: these tests are about the byte encryption, not the password hashing.
  async function keyFor(password: string) {
    return vc.deriveKey(password, '00112233445566778899aabbccddeeff', 1000);
  }

  it('round-trips arbitrary binary data', async () => {
    const key = await keyFor('k1');
    const bytes = new Uint8Array(randomBytes(4096));
    const sealed = await vc.encryptBytes(key, bytes);
    assert.deepEqual(await vc.decryptBytes(key, sealed), bytes);
  });

  it('does not store the plaintext bytes, and adds IV and tag overhead', async () => {
    const key = await keyFor('k1');
    const pdfLike = new TextEncoder().encode('%PDF-1.3 hello world, this should not appear');
    const sealed = await vc.encryptBytes(key, pdfLike);
    assert.equal(sealed.length, pdfLike.length + IV_BYTES + TAG_BYTES);
    assert.ok(!Buffer.from(sealed).includes('%PDF'), 'ciphertext starts with plaintext magic bytes');
  });

  it('rejects the wrong key', async () => {
    const sealed = await vc.encryptBytes(await keyFor('right'), new Uint8Array([1, 2, 3, 4]));
    await assert.rejects(vc.decryptBytes(await keyFor('wrong'), sealed));
  });

  it('rejects modified or truncated data', async () => {
    const key = await keyFor('k1');
    const sealed = await vc.encryptBytes(key, new Uint8Array(randomBytes(256)));
    const modified = Uint8Array.from(sealed);
    modified[40] ^= 0x01;
    await assert.rejects(vc.decryptBytes(key, modified));
    await assert.rejects(vc.decryptBytes(key, sealed.subarray(0, 8)));
  });

  it('handles an empty file', async () => {
    const key = await keyFor('k1');
    const sealed = await vc.encryptBytes(key, new Uint8Array(0));
    assert.equal((await vc.decryptBytes(key, sealed)).length, 0);
  });
});
