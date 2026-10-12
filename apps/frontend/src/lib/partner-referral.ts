const KEY = 'rebequi.referral.intent.v1';
export function readReferralIntent(): string | null {
  try { const value = JSON.parse(sessionStorage.getItem(KEY) ?? 'null'); return value && /^RB[A-F0-9]{16}$/.test(value.code) && Number.isFinite(value.expiresAt) && value.expiresAt > Date.now() ? value.code : null; } catch { return null; }
}
export function saveReferralIntent(code: string) {
  if (!/^RB[A-F0-9]{16}$/.test(code)) throw new Error('Código inválido');
  try { sessionStorage.setItem(KEY, JSON.stringify({ code, expiresAt: Date.now() + 86400000 })); } catch { throw new Error('O navegador não permitiu guardar a indicação. Tente novamente com armazenamento habilitado.'); }
}
export function clearReferralIntent() { try { sessionStorage.removeItem(KEY); } catch { /* storage may be unavailable */ } }
