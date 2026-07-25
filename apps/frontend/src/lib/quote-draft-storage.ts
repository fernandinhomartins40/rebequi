/**
 * Local backup of an unsent quote draft.
 *
 * The wizard state lived only in React state, so a refresh, an incoming call,
 * or the browser discarding a background tab lost the photo and every edit the
 * customer had made. This keeps enough to resume.
 */

const STORAGE_KEY = 'rebequi:quote-draft';
/** Matches the anonymous draft TTL on the server. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type StoredDraftItem = {
  key: string;
  productId?: string | null;
  name: string;
  quantity: number;
  unit?: string | null;
  notes?: string | null;
  confidence?: number | null;
  sourceLine?: string | null;
};

export type StoredDraft = {
  token: string;
  items: StoredDraftItem[];
  photoUrl?: string | null;
  savedAt: number;
};

export function saveDraftBackup(draft: { token: string; items: StoredDraftItem[]; photoUrl?: string | null }) {
  if (typeof window === 'undefined') return;

  try {
    const payload: StoredDraft = {
      token: draft.token,
      items: draft.items,
      // Object URLs die with the document, so they are not worth persisting;
      // the draft still carries the server-side document URL.
      photoUrl: draft.photoUrl?.startsWith('blob:') ? null : draft.photoUrl ?? null,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage full or blocked (private mode) — losing the backup is acceptable.
  }
}

export function loadDraftBackup(): StoredDraft | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredDraft;
    if (!parsed?.token || !Array.isArray(parsed.items)) {
      clearDraftBackup();
      return null;
    }

    if (Date.now() - (parsed.savedAt ?? 0) > MAX_AGE_MS) {
      clearDraftBackup();
      return null;
    }

    return parsed;
  } catch {
    clearDraftBackup();
    return null;
  }
}

export function clearDraftBackup() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
