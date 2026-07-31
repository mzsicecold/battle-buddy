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

/**
 * Copies a picked file (from the document/image picker's temp URI) into our own documents
 * directory, byte-for-byte, under a collision-proof name. Returns the new file's URI and size.
 */
export async function saveDocumentFile(
  sourceUri: string,
  suggestedName: string
): Promise<{ uri: string; size: number }> {
  const dir = documentsDirectoryHandle();
  const dot = suggestedName.lastIndexOf('.');
  const ext = dot >= 0 ? suggestedName.slice(dot) : '';
  const uniqueName = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}${ext}`;

  const sourceFile = new File(sourceUri);
  const buffer = await sourceFile.arrayBuffer();
  const destFile = new File(dir, uniqueName);
  destFile.write(new Uint8Array(buffer));

  return { uri: destFile.uri, size: buffer.byteLength };
}

export function deleteDocumentFile(uri: string): void {
  const file = new File(uri);
  if (file.exists) file.delete();
}
