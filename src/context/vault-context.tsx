import * as Crypto from 'expo-crypto';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { AppData, DocumentEntry, defaultAppData } from '@/lib/app-data';
import {
  VaultFile,
  changeVaultPassword,
  createVault,
  decryptBytes,
  encryptBytes,
  saveVault,
  unlockVault,
} from '@/lib/vault-crypto';
import {
  clearShareCopies,
  readStoredDocument,
  readVaultFile,
  writeShareCopy,
  writeStoredDocument,
  writeVaultFile,
} from '@/lib/vault-storage';

export type VaultStatus = 'checking' | 'no-vault' | 'locked' | 'unlocked';

interface VaultContextValue {
  status: VaultStatus;
  error: string | null;
  data: AppData | null;
  createPassword: (password: string, confirm: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  changePassword: (current: string, next: string, confirm: string) => Promise<boolean>;
  updateData: (updater: (draft: AppData) => AppData) => void;
  clearError: () => void;
  /** Encrypts file bytes under the vault key, stores them, and returns the stored file's URI. */
  storeDocument: (bytes: Uint8Array) => Promise<string>;
  /** Returns a URI the share sheet can open: a temporary decrypted copy, or the file itself if it predates encryption. */
  prepareDocumentForShare: (entry: DocumentEntry) => Promise<string>;
}

const VaultContext = createContext<VaultContextValue | null>(null);
const SAVE_DEBOUNCE_MS = 300;
/** How long the app can sit in the background before the vault locks itself. */
const AUTO_LOCK_MS = 60_000;

export function VaultProvider({ children }: { children: React.ReactNode }) {
  // The vault file is read synchronously, so the first render already knows whether to show unlock or create.
  const [vaultFile, setVaultFile] = useState<VaultFile | null>(() => readVaultFile());
  const [status, setStatus] = useState<VaultStatus>(() => (vaultFile ? 'locked' : 'no-vault'));
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AppData | null>(null);
  const [key, setKey] = useState<Crypto.AESEncryptionKey | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<AppData | null>(null);
  const keyRef = useRef<Crypto.AESEncryptionKey | null>(null);
  const vaultFileRef = useRef<VaultFile | null>(null);
  // Mirror state into refs after each commit so callbacks (auto-lock, flush) read the latest key and file.
  useEffect(() => {
    keyRef.current = key;
    vaultFileRef.current = vaultFile;
  }, [key, vaultFile]);

  /** Encrypts and writes `next`. Takes the key and file as arguments so it still works after lock() clears state. */
  const persist = useCallback(
    async (activeKey: Crypto.AESEncryptionKey, activeVaultFile: VaultFile, next: AppData) => {
      try {
        const file = await saveVault(activeKey, activeVaultFile.saltHex, activeVaultFile.iterations, next);
        vaultFileRef.current = file;
        setVaultFile(file);
        writeVaultFile(file);
      } catch {
        setError('Could not save your latest changes. Check that your device has free storage.');
      }
    },
    []
  );

  /** Saves any debounced edit right now instead of waiting out the timer. No-op if nothing is pending. */
  const flushPendingSave = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const next = pendingSave.current;
    pendingSave.current = null;
    const activeKey = keyRef.current;
    const activeVaultFile = vaultFileRef.current;
    if (!next || !activeKey || !activeVaultFile) return;
    void persist(activeKey, activeVaultFile, next);
  }, [persist]);

  useEffect(() => {
    // Clear decrypted share copies left behind if the app was killed mid-share.
    clearShareCopies();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const createPassword = useCallback(async (password: string, confirm: string) => {
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    const initial = defaultAppData();
    const { file, key: newKey } = await createVault(password, initial);
    writeVaultFile(file);
    setVaultFile(file);
    setKey(newKey);
    setData(initial);
    setStatus('unlocked');
  }, []);

  const unlock = useCallback(
    async (password: string) => {
      setError(null);
      if (!vaultFile) return;
      try {
        const { data: decrypted, key: unlockedKey } = await unlockVault<Partial<AppData>>(
          password,
          vaultFile
        );
        setData({ ...defaultAppData(), ...decrypted });
        setKey(unlockedKey);
        setStatus('unlocked');
      } catch {
        setError('Incorrect password.');
      }
    },
    [vaultFile]
  );

  const lock = useCallback(() => {
    // Flush before clearing the key: persist() captures the key and data synchronously, so the final
    // write still completes in the background even though the UI locks immediately.
    flushPendingSave();
    clearShareCopies();
    setKey(null);
    setData(null);
    setStatus('locked');
  }, [flushPendingSave]);

  // Auto-lock after AUTO_LOCK_MS in the background. Uses timestamps rather than a timer because JS
  // timers don't run reliably while suspended. Only 'background' counts: system sheets (file picker,
  // share sheet, permission prompts) make the app 'inactive', which must not lock the vault.
  useEffect(() => {
    if (status !== 'unlocked') return;
    let backgroundedAt: number | null = null;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        backgroundedAt = Date.now();
      } else if (next === 'active') {
        if (backgroundedAt !== null && Date.now() - backgroundedAt >= AUTO_LOCK_MS) lock();
        backgroundedAt = null;
      }
    });
    return () => subscription.remove();
  }, [status, lock]);

  const changePassword = useCallback(
    async (current: string, next: string, confirm: string) => {
      setError(null);
      if (!vaultFile) return false;
      if (next.length < 8) {
        setError('New password must be at least 8 characters.');
        return false;
      }
      if (next !== confirm) {
        setError('New passwords do not match.');
        return false;
      }
      try {
        const { file, key: newKey } = await changeVaultPassword<AppData>(current, next, vaultFile);
        writeVaultFile(file);
        setVaultFile(file);
        setKey(newKey);
        return true;
      } catch {
        setError('Current password is incorrect.');
        return false;
      }
    },
    [vaultFile]
  );

  const updateData = useCallback((updater: (draft: AppData) => AppData) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = updater(prev);

      pendingSave.current = next;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flushPendingSave, SAVE_DEBOUNCE_MS);

      return next;
    });
  }, [flushPendingSave]);

  const storeDocument = useCallback(async (bytes: Uint8Array) => {
    const activeKey = keyRef.current;
    if (!activeKey) throw new Error('Vault is locked.');
    return writeStoredDocument(await encryptBytes(activeKey, bytes));
  }, []);

  const prepareDocumentForShare = useCallback(async (entry: DocumentEntry) => {
    // Files added before encryption existed are plaintext on disk; share them as they are.
    if (!entry.encrypted) return entry.fileUri;
    const activeKey = keyRef.current;
    if (!activeKey) throw new Error('Vault is locked.');
    const plaintext = await decryptBytes(activeKey, await readStoredDocument(entry.fileUri));
    return writeShareCopy(entry.name, plaintext);
  }, []);

  const value = useMemo<VaultContextValue>(
    () => ({
      status,
      error,
      data,
      createPassword,
      unlock,
      lock,
      changePassword,
      updateData,
      clearError,
      storeDocument,
      prepareDocumentForShare,
    }),
    [
      status,
      error,
      data,
      createPassword,
      unlock,
      lock,
      changePassword,
      updateData,
      clearError,
      storeDocument,
      prepareDocumentForShare,
    ]
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error('useVault must be used within a VaultProvider');
  return ctx;
}
