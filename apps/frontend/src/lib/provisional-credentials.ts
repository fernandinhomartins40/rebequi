import type { ProvisionalCredentials } from '@/types';

const STORAGE_KEY = 'rebequi_provisional_credentials';

export function saveProvisionalCredentials(credentials?: ProvisionalCredentials | null) {
  if (!credentials) {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
}

export function readProvisionalCredentials(): ProvisionalCredentials | null {
  const value = window.sessionStorage.getItem(STORAGE_KEY);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as ProvisionalCredentials;
  } catch {
    return null;
  }
}

export function clearProvisionalCredentials() {
  window.sessionStorage.removeItem(STORAGE_KEY);
}
