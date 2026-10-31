import { Directory, File, Paths } from 'expo-file-system';

import type { VaultFile } from '@/lib/vault-crypto';

const VAULT_FILENAME = 'battle-buddy-vault.json';

function vaultFileHandle(): File {
  return new File(Paths.document, VAULT_FILENAME);
}

export function readVaultFile(): VaultFile | null {
  const file = vaultFileHandle();
  if (!file.exists) return null;
  return JSON.parse(file.textSync()) as VaultFile;
}

export function writeVaultFile(vault: VaultFile): void {
  vaultFileHandle().write(JSON.stringify(vault));
}

export function deleteVaultFile(): void {
  const file = vaultFileHandle();
  if (file.exists) file.delete();
}

/** Directory documents (receipts, contracts, etc.) are stored in, separate from the vault JSON itself. */
export function documentsDirectoryHandle(): Directory {
  const dir = new Directory(Paths.document, 'documents');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** Reads a picked file (from the document/image picker's temp URI) into memory. */
export async function readPickedFile(sourceUri: string): Promise<Uint8Array> {
  const buffer = await new File(sourceUri).arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Best-effort delete of the picker's plaintext temp copy. The picker hands us a copy in the cache
 * directory; once the encrypted copy is stored there is no reason to leave the original lying around.
 */
export function discardPickedCopy(sourceUri: string): void {
  try {
    deleteDocumentFile(sourceUri);
  } catch {
    // Not ours to delete (e.g. a content:// URI) or already gone.
  }
}

/** Writes already-encrypted bytes to the documents directory under a collision-proof name. Returns its URI. */
export function writeStoredDocument(encryptedBytes: Uint8Array): string {
  const uniqueName = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.bbenc`;
  const destFile = new File(documentsDirectoryHandle(), uniqueName);
  destFile.write(encryptedBytes);
  return destFile.uri;
}

/** Reads the raw (still encrypted) bytes of a stored document. */
export async function readStoredDocument(uri: string): Promise<Uint8Array> {
  return new Uint8Array(await new File(uri).arrayBuffer());
}

export function deleteDocumentFile(uri: string): void {
  const file = new File(uri);
  if (file.exists) file.delete();
}

/** Scratch directory for decrypted copies handed to the share sheet. Cleared on lock and on next share. */
function shareDirectoryHandle(): Directory {
  return new Directory(Paths.cache, 'bb-share');
}

/** Writes a decrypted copy under its original name (so the receiving app sees the right file type). */
export function writeShareCopy(name: string, bytes: Uint8Array): string {
  clearShareCopies();
  const dir = shareDirectoryHandle();
  dir.create({ intermediates: true });
  const file = new File(dir, name.replace(/[\\/]/g, '_'));
  file.write(bytes);
  return file.uri;
}

/** Removes every decrypted share copy. Safe to call when none exist. */
export function clearShareCopies(): void {
  try {
    const dir = shareDirectoryHandle();
    if (dir.exists) dir.delete();
  } catch {
    // Best effort: the cache directory is also purged by the OS.
  }
}
