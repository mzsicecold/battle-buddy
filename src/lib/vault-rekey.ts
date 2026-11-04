/**
 * Changing the vault password.
 *
 * The vault key comes from the password, and every stored document is encrypted under that key. A new
 * password therefore means a new key, and every document has to be re-encrypted under it or it stops
 * opening. This file does that, and is written so a failure part-way leaves the old password and every
 * document exactly as they were.
 *
 * Order of events:
 *   1. Check the current password.
 *   2. Make the new salt and key.
 *   3. Write a re-encrypted copy of each document next to the original (never over it).
 *   4. Write the vault file, now pointing at the copies. THIS is the moment the change takes effect.
 *   5. Delete the old document files (best effort).
 * If anything fails before step 4, the copies are deleted and the error is thrown. If step 5 fails,
 * the change still stands and the leftovers are only unreferenced files encrypted under the old key.
 *
 * Storage is passed in so this can be tested without a device.
 */
import type * as Crypto from 'expo-crypto';

import type { DocumentEntry } from './app-data.ts';
import { createVaultKey, decryptBytes, encryptBytes, saveVault, unlockVault, type VaultFile } from './vault-crypto.ts';

/** The current password did not open the vault. Nothing was changed. */
export class WrongCurrentPasswordError extends Error {
  constructor() {
    super('Current password is incorrect.');
    this.name = 'WrongCurrentPasswordError';
  }
}

export interface RekeyStorage {
  readDocument(uri: string): Promise<Uint8Array>;
  /** Stores already-encrypted bytes under a new name and returns its URI. */
  writeDocument(encryptedBytes: Uint8Array): string | Promise<string>;
  deleteDocument(uri: string): void | Promise<void>;
  /** Replaces the vault file on disk. The single point at which the new password takes effect. */
  commitVaultFile(file: VaultFile): void | Promise<void>;
}

export interface RekeyResult<T> {
  file: VaultFile;
  key: Crypto.AESEncryptionKey;
  /** The data with each re-encrypted document's fileUri pointing at its new copy. */
  data: T;
  /** Ids of documents that could not be read under the old key (file missing or damaged). They are left as they were. */
  unreadable: string[];
}

export async function changePasswordKeepingDocuments<T extends { documents: DocumentEntry[] }>(
  currentPassword: string,
  newPassword: string,
  file: VaultFile,
  data: T,
  storage: RekeyStorage
): Promise<RekeyResult<T>> {
  // Checked before anything is written.
  let oldKey: Crypto.AESEncryptionKey;
  try {
    ({ key: oldKey } = await unlockVault(currentPassword, file));
  } catch {
    throw new WrongCurrentPasswordError();
  }
  const fresh = await createVaultKey(newPassword);

  const written: string[] = [];
  const replaced: string[] = [];
  const unreadable: string[] = [];

  try {
    const documents: DocumentEntry[] = [];
    for (const doc of data.documents) {
      // Files added before encryption existed are plaintext on disk and don't depend on the key.
      if (!doc.encrypted) {
        documents.push(doc);
        continue;
      }

      let plaintext: Uint8Array;
      try {
        plaintext = await decryptBytes(oldKey, await storage.readDocument(doc.fileUri));
      } catch {
        // Missing or damaged: it could not be opened before either. Keep the entry so it can still be removed.
        unreadable.push(doc.id);
        documents.push(doc);
        continue;
      }

      const newUri = await storage.writeDocument(await encryptBytes(fresh.key, plaintext));
      written.push(newUri);
      replaced.push(doc.fileUri);
      documents.push({ ...doc, fileUri: newUri });
    }

    const newData: T = { ...data, documents };
    const newFile = await saveVault(fresh.key, fresh.saltHex, fresh.iterations, newData);
    await storage.commitVaultFile(newFile);

    for (const uri of replaced) {
      try {
        await storage.deleteDocument(uri);
      } catch {
        // The change already stands. An unreferenced file encrypted under the old key is left behind.
      }
    }
    return { file: newFile, key: fresh.key, data: newData, unreadable };
  } catch (error) {
    for (const uri of written) {
      try {
        await storage.deleteDocument(uri);
      } catch {
        // Best effort. The copies are encrypted and nothing refers to them.
      }
    }
    throw error;
  }
}
