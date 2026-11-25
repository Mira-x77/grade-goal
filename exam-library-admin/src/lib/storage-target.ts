import { useEffect, useState } from 'react';

/** Where an admin upload should be stored. */
export type StorageProvider = 'r2' | 'supabase';

const STORAGE_KEY = 'exam_admin_storage_target';
const CHANGE_EVENT = 'exam-admin-storage-target';

/**
 * The destination is a per-operator choice, not a hard switch: the admin keeps
 * both providers available and remembers the last selection.
 */
export function getPreferredStorageTarget(): StorageProvider {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'supabase' ? 'supabase' : 'r2';
  } catch {
    return 'r2';
  }
}

export function setPreferredStorageTarget(target: StorageProvider): void {
  try {
    localStorage.setItem(STORAGE_KEY, target);
  } catch {
    /* private mode / storage disabled: keep the in-memory state only */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeStorageTarget(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Shared selection state: every form and banner stays in sync. */
export function useStorageTarget(): [StorageProvider, (target: StorageProvider) => void] {
  const [target, setTarget] = useState<StorageProvider>(getPreferredStorageTarget);

  useEffect(() => subscribeStorageTarget(() => setTarget(getPreferredStorageTarget())), []);

  return [target, setPreferredStorageTarget];
}
