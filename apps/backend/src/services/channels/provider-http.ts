export class ProviderHttpError extends Error {
  constructor(public readonly status: number) { super('O provedor recusou ou não concluiu a consulta.'); }
}

/** Bounded response, fixed hosts at callers, no provider bodies in errors/logs. */
export async function providerJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(12_000) });
  if (!response.ok) { await response.body?.cancel(); throw new ProviderHttpError(response.status); }
  if (response.status === 204) return null as T;
  if (!response.body) throw new ProviderHttpError(502);
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 1024 * 1024) throw new ProviderHttpError(502);
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T;
  } catch { await reader.cancel(); throw new ProviderHttpError(502); }
  finally { reader.releaseLock(); }
}
