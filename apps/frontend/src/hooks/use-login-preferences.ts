import { useCallback, useMemo } from 'react';

type StoredLoginPreferences = {
  identifier: string;
  keepSignedIn: boolean;
  rememberIdentifier: boolean;
};

const DEFAULT_LOGIN_PREFERENCES: StoredLoginPreferences = {
  identifier: '',
  keepSignedIn: false,
  rememberIdentifier: false,
};

function readStoredLoginPreferences(storageKey: string): StoredLoginPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_LOGIN_PREFERENCES;
  }

  try {
    const storedValue = window.localStorage.getItem(storageKey);
    if (!storedValue) {
      return DEFAULT_LOGIN_PREFERENCES;
    }

    const parsedValue = JSON.parse(storedValue) as Partial<StoredLoginPreferences>;
    const rememberIdentifier = parsedValue.rememberIdentifier === true;

    return {
      identifier: rememberIdentifier ? parsedValue.identifier?.trim() || '' : '',
      keepSignedIn: parsedValue.keepSignedIn === true,
      rememberIdentifier,
    };
  } catch {
    return DEFAULT_LOGIN_PREFERENCES;
  }
}

function writeStoredLoginPreferences(storageKey: string, value: StoredLoginPreferences) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    storageKey,
    JSON.stringify({
      identifier: value.rememberIdentifier ? value.identifier.trim() : '',
      keepSignedIn: value.keepSignedIn,
      rememberIdentifier: value.rememberIdentifier,
    })
  );
}

export function useLoginPreferences(storageKey: string) {
  const initialPreferences = useMemo(() => readStoredLoginPreferences(storageKey), [storageKey]);

  const persistPreferences = useCallback(
    (value: StoredLoginPreferences) => {
      writeStoredLoginPreferences(storageKey, value);
    },
    [storageKey]
  );

  return {
    initialPreferences,
    persistPreferences,
  };
}
