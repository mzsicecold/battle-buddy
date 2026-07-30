import * as Crypto from 'expo-crypto';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { AppData, defaultAppData } from '@/lib/app-data';
import {
  VaultFile,
  changeVaultPassword,
  createVault,
  saveVault,
  unlockVault,
} from '@/lib/vault-crypto';
import { readVaultFile, writeVaultFile } from '@/lib/vault-storage';

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
}

const VaultContext = createContext<VaultContextValue | null>(null);
const SAVE_DEBOUNCE_MS = 300;

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<VaultStatus>('checking');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AppData | null>(null);
  const [vaultFile, setVaultFile] = useState<VaultFile | null>(null);
  const [key, setKey] = useState<Crypto.AESEncryptionKey | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyRef = useRef<Crypto.AESEncryptionKey | null>(null);
  const vaultFileRef = useRef<VaultFile | null>(null);
  keyRef.current = key;
  vaultFileRef.current = vaultFile;

  useEffect(() => {
    const existing = readVaultFile();
    if (existing) {
      setVaultFile(existing);
      setStatus('locked');
    } else {
      setStatus('no-vault');
    }
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
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setKey(null);
    setData(null);
    setStatus('locked');
  }, []);

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

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const activeKey = keyRef.current;
        const activeVaultFile = vaultFileRef.current;
        if (!activeKey || !activeVaultFile) return;
        saveVault(activeKey, activeVaultFile.saltHex, activeVaultFile.iterations, next).then(
          (file) => {
            vaultFileRef.current = file;
            setVaultFile(file);
            writeVaultFile(file);
          }
        );
      }, SAVE_DEBOUNCE_MS);

      return next;
    });
  }, []);

  const value = useMemo<VaultContextValue>(
    () => ({ status, error, data, createPassword, unlock, lock, changePassword, updateData, clearError }),
    [status, error, data, createPassword, unlock, lock, changePassword, updateData, clearError]
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error('useVault must be used within a VaultProvider');
  return ctx;
}
