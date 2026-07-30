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
