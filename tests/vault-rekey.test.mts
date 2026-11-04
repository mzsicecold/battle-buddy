/**
 * Tests for src/lib/vault-rekey.ts: changing the vault password without losing documents.
 *
 * The bug these guard against: the vault key comes from the password and every stored document is
 * encrypted under it, so a new password used to leave existing documents unreadable.
 *
 * Same limits as vault-crypto.test.mts: AES and PBKDF2 are node:crypto stand-ins for the native modules,
 * and storage is an in-memory map. They verify this repo's logic (ordering, rollback, what is deleted
 * and when), not the phone's file system. The device behaviour is not covered here.
 */
import assert from 'node:assert/strict';
import { pbkdf2Sync } from 'node:crypto';
import { before, describe, it, mock } from 'node:test';

import { expoCryptoStandIn } from './expo-crypto-stand-in.mts';

type VaultCrypto = typeof import('../src/lib/vault-crypto.ts');
type Rekey = typeof import('../src/lib/vault-rekey.ts');
type DocumentEntry = import('../src/lib/app-data.ts').DocumentEntry;
type VaultFile = import('../src/lib/vault-crypto.ts').VaultFile;
type Key = Awaited<ReturnType<VaultCrypto['createVaultKey']>>['key'];

let vc: VaultCrypto;
let rk: Rekey;

before(async () => {
  mock.module('expo-crypto', { exports: expoCryptoStandIn });
  mock.module('../modules/pbkdf2-native/src/index.ts', {
    exports: {
      hasNativePbkdf2: true,
      nativePbkdf2Sha256Hex: async (password: string, saltHex: string, iterations: number, keyLength: number) =>
        pbkdf2Sync(password, Buffer.from(saltHex, 'hex'), iterations, keyLength, 'sha256').toString('hex'),
    },
  });
  vc = await import('../src/lib/vault-crypto.ts');
  rk = await import('../src/lib/vault-rekey.ts');
});

const OLD_PASSWORD = 'old password for the vault';
const NEW_PASSWORD = 'a brand new passphrase';

interface Faults {
  failWriteNumber?: number; // 1-based: the Nth call to writeDocument throws
  failCommit?: boolean;
  undeletable?: Set<string>;
}

/** A vault with `count` encrypted documents, held in an in-memory "disk". */
async function setup(count: number, faults: Faults = {}) {
  const created = await vc.createVault(OLD_PASSWORD, { documents: [] });
  const disk = new Map<string, Uint8Array>();
  let nextName = 1;
  const plaintexts = new Map<string, Uint8Array>();

  const documents: DocumentEntry[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = new TextEncoder().encode(`document ${i} secret-marker-${i}`);
    const uri = `file:///docs/original-${i}.bbenc`;
    disk.set(uri, await vc.encryptBytes(created.key, bytes));
    plaintexts.set(`doc-${i}`, bytes);
    documents.push({
      id: `doc-${i}`,
      name: `receipt-${i}.pdf`,
      category: 'Other',
      note: `note ${i}`,
      mime: 'application/pdf',
      size: bytes.length,
      fileUri: uri,
      encrypted: true,
      addedDate: '2026-01-01',
    });
  }

  const data = { profile: { name: 'Doe, Jane' }, documents };
  let vaultOnDisk: VaultFile = await vc.saveVault(created.key, created.file.saltHex, created.file.iterations, data);

  const calls = { writes: 0, commits: 0, reads: [] as string[], deletes: [] as string[] };
  const storage = {
    async readDocument(uri: string) {
      calls.reads.push(uri);
      const bytes = disk.get(uri);
      if (!bytes) throw new Error(`no such file ${uri}`);
      return bytes;
    },
    async writeDocument(bytes: Uint8Array) {
      calls.writes++;
      if (faults.failWriteNumber === calls.writes) throw new Error('disk full');
      const uri = `file:///docs/new-${nextName++}.bbenc`;
      disk.set(uri, bytes);
      return uri;
    },
    async deleteDocument(uri: string) {
      calls.deletes.push(uri);
      if (faults.undeletable?.has(uri)) throw new Error('cannot delete');
      disk.delete(uri);
    },
    async commitVaultFile(file: VaultFile) {
      calls.commits++;
      if (faults.failCommit) throw new Error('could not write vault file');
      vaultOnDisk = file;
    },
  };

  return {
    oldKey: created.key as Key,
    file: vaultOnDisk,
    data,
    disk,
    storage,
    calls,
    plaintexts,
    vaultOnDisk: () => vaultOnDisk,
  };
}

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe('changing the password keeps documents readable', () => {
  it('opens the vault with the new password and not the old one', async () => {
    const s = await setup(2);
    const result = await rk.changePasswordKeepingDocuments(OLD_PASSWORD, NEW_PASSWORD, s.file, s.data, s.storage);

    assert.equal(s.calls.commits, 1);
    await vc.unlockVault(NEW_PASSWORD, s.vaultOnDisk());
    await assert.rejects(vc.unlockVault(OLD_PASSWORD, s.vaultOnDisk()));
    assert.notEqual(result.file.saltHex, s.file.saltHex, 'a new salt is used');
  });

  it('re-encrypts every document under the new key, with the same contents', async () => {
    const s = await setup(3);
    const result = await rk.changePasswordKeepingDocuments(OLD_PASSWORD, NEW_PASSWORD, s.file, s.data, s.storage);

    for (const doc of result.data.documents) {
      const stored = s.disk.get(doc.fileUri);
      assert.ok(stored, `new file exists for ${doc.id}`);
      assert.equal(text(await vc.decryptBytes(result.key, stored)), text(s.plaintexts.get(doc.id)!));
      await assert.rejects(vc.decryptBytes(s.oldKey, stored), 'the old key must no longer open it');
    }
  });

  it('keeps every other field of each entry, and the rest of the data', async () => {
    const s = await setup(2);
    const result = await rk.changePasswordKeepingDocuments(OLD_PASSWORD, NEW_PASSWORD, s.file, s.data, s.storage);

    assert.deepEqual(result.data.profile, s.data.profile);
    result.data.documents.forEach((doc, i) => {
      const { fileUri: newUri, ...rest } = doc;
      const { fileUri: oldUri, ...before } = s.data.documents[i];
      assert.deepEqual(rest, before);
      assert.notEqual(newUri, oldUri);
    });
  });

  it('writes the vault file with the new addresses, so a reopened vault finds the documents', async () => {
    const s = await setup(2);
    const result = await rk.changePasswordKeepingDocuments(OLD_PASSWORD, NEW_PASSWORD, s.file, s.data, s.storage);

    const reopened = await vc.unlockVault<typeof s.data>(NEW_PASSWORD, s.vaultOnDisk());
    assert.deepEqual(reopened.data.documents.map((d) => d.fileUri), result.data.documents.map((d) => d.fileUri));
    const first = reopened.data.documents[0];
    assert.equal(text(await vc.decryptBytes(reopened.key, s.disk.get(first.fileUri)!)), text(s.plaintexts.get(first.id)!));
  });

  it('deletes the old document files once the change has taken effect, and only then', async () => {
    const s = await setup(2);
    await rk.changePasswordKeepingDocuments(OLD_PASSWORD, NEW_PASSWORD, s.file, s.data, s.storage);

    assert.deepEqual(
      [...s.calls.deletes].sort(),
      s.data.documents.map((d) => d.fileUri).sort()
    );
    for (const doc of s.data.documents) assert.ok(!s.disk.has(doc.fileUri), 'old file removed');
    assert.equal(s.disk.size, 2, 'only the two new copies remain');
  });

  it('uses the current iteration count, so changing the password also upgrades an older vault', async () => {
    const s = await setup(1);
    const result = await rk.changePasswordKeepingDocuments(OLD_PASSWORD, NEW_PASSWORD, s.file, s.data, s.storage);
    assert.equal(result.file.iterations, vc.PBKDF2_ITERATIONS);
  });

  it('works with no documents', async () => {
    const s = await setup(0);
    const result = await rk.changePasswordKeepingDocuments(OLD_PASSWORD, NEW_PASSWORD, s.file, s.data, s.storage);
    assert.equal(s.calls.writes, 0);
    await vc.unlockVault(NEW_PASSWORD, result.file);
  });

  it('gives each document a fresh IV, never reusing the old ciphertext', async () => {
    const s = await setup(1);
    const before = Buffer.from(s.disk.get(s.data.documents[0].fileUri)!).toString('hex');
    const result = await rk.changePasswordKeepingDocuments(OLD_PASSWORD, NEW_PASSWORD, s.file, s.data, s.storage);
    const after = Buffer.from(s.disk.get(result.data.documents[0].fileUri)!).toString('hex');
    assert.notEqual(before.slice(0, 24), after.slice(0, 24));
  });
});

describe('a failure leaves everything as it was', () => {
  it('refuses a wrong current password without writing or deleting anything', async () => {
    const s = await setup(2);
    await assert.rejects(
      rk.changePasswordKeepingDocuments('not the password', NEW_PASSWORD, s.file, s.data, s.storage),
      rk.WrongCurrentPasswordError
    );

    assert.equal(s.calls.writes, 0);
    assert.equal(s.calls.commits, 0);
    assert.deepEqual(s.calls.deletes, []);
    assert.equal(s.disk.size, 2);
  });

  it('rolls back when writing a document copy fails part-way', async () => {
    const s = await setup(3, { failWriteNumber: 2 });
    await assert.rejects(
      rk.changePasswordKeepingDocuments(OLD_PASSWORD, NEW_PASSWORD, s.file, s.data, s.storage),
      /disk full/
    );

    assert.equal(s.calls.commits, 0, 'the vault file must not be replaced');
    assert.equal(s.disk.size, 3, 'the one copy already written is removed again');
    for (const doc of s.data.documents) {
      assert.ok(s.disk.has(doc.fileUri), 'original still there');
      assert.equal(text(await vc.decryptBytes(s.oldKey, s.disk.get(doc.fileUri)!)), text(s.plaintexts.get(doc.id)!));
    }
    // The old password still opens the vault on disk.
    await vc.unlockVault(OLD_PASSWORD, s.vaultOnDisk());
    await assert.rejects(vc.unlockVault(NEW_PASSWORD, s.vaultOnDisk()));
  });

  it('rolls back when the vault file cannot be written, deleting no original', async () => {
    const s = await setup(2, { failCommit: true });
    await assert.rejects(
      rk.changePasswordKeepingDocuments(OLD_PASSWORD, NEW_PASSWORD, s.file, s.data, s.storage),
      /could not write vault file/
    );

    assert.equal(s.disk.size, 2, 'only the originals remain');
    for (const doc of s.data.documents) assert.ok(s.disk.has(doc.fileUri));
    await vc.unlockVault(OLD_PASSWORD, s.vaultOnDisk());
  });

  it('still succeeds when an old file cannot be deleted, since the change already stands', async () => {
    const s = await setup(2);
    const stuck = s.data.documents[0].fileUri;
    const faulty = await setup(2, { undeletable: new Set([stuck]) });
    const result = await rk.changePasswordKeepingDocuments(OLD_PASSWORD, NEW_PASSWORD, faulty.file, faulty.data, faulty.storage);

    await vc.unlockVault(NEW_PASSWORD, faulty.vaultOnDisk());
    assert.equal(result.data.documents.length, 2);
    assert.ok(faulty.disk.has(stuck), 'the stuck leftover remains');
    assert.ok(!faulty.disk.has(faulty.data.documents[1].fileUri), 'the other one was removed');
  });
});

describe('documents that are not ordinary encrypted files', () => {
  it('leaves a plaintext file from before encryption alone: same address, never read or rewritten', async () => {
    const s = await setup(1);
    const legacy: DocumentEntry = { ...s.data.documents[0], id: 'legacy', fileUri: 'file:///docs/legacy.pdf', encrypted: undefined };
    s.disk.set(legacy.fileUri, new TextEncoder().encode('plain legacy file'));
    const data = { ...s.data, documents: [...s.data.documents, legacy] };

    const result = await rk.changePasswordKeepingDocuments(OLD_PASSWORD, NEW_PASSWORD, s.file, data, s.storage);

    const kept = result.data.documents.find((d) => d.id === 'legacy')!;
    assert.equal(kept.fileUri, legacy.fileUri);
    assert.ok(!s.calls.reads.includes(legacy.fileUri));
    assert.ok(!s.calls.deletes.includes(legacy.fileUri));
    assert.equal(text(s.disk.get(legacy.fileUri)!), 'plain legacy file');
  });

  it('does not let one missing file block the change: it is reported, kept, and the rest are re-encrypted', async () => {
    const s = await setup(3);
    const lostUri = s.data.documents[1].fileUri;
    s.disk.delete(lostUri);

    const result = await rk.changePasswordKeepingDocuments(OLD_PASSWORD, NEW_PASSWORD, s.file, s.data, s.storage);

    assert.deepEqual(result.unreadable, ['doc-1']);
    assert.equal(result.data.documents[1].fileUri, lostUri, 'entry kept so it can still be deleted');
    for (const i of [0, 2]) {
      const doc = result.data.documents[i];
      assert.equal(text(await vc.decryptBytes(result.key, s.disk.get(doc.fileUri)!)), text(s.plaintexts.get(doc.id)!));
    }
    await vc.unlockVault(NEW_PASSWORD, s.vaultOnDisk());
  });

  it('treats a damaged file the same way as a missing one', async () => {
    const s = await setup(2);
    const damaged = Uint8Array.from(s.disk.get(s.data.documents[0].fileUri)!);
    damaged[20] ^= 0x01;
    s.disk.set(s.data.documents[0].fileUri, damaged);

    const result = await rk.changePasswordKeepingDocuments(OLD_PASSWORD, NEW_PASSWORD, s.file, s.data, s.storage);
    assert.deepEqual(result.unreadable, ['doc-0']);
    assert.equal(result.data.documents[0].fileUri, s.data.documents[0].fileUri);
  });
});
