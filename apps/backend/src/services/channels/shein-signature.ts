import { createHmac, randomBytes } from 'node:crypto';

/** Official SHEIN signing: random prefix + base64 of hexadecimal HMAC. */
export function sheinSignature(openKeyId: string, secretKey: string, path: string, timestamp: string, randomKey = randomBytes(5).toString('base64url').slice(0, 5)) {
  if (!/^[A-Za-z0-9_-]{5}$/.test(randomKey) || !/^\d{13}$/.test(timestamp) || !path.startsWith('/open-api/')) throw new Error('Parâmetros de assinatura inválidos');
  const hex = createHmac('sha256', secretKey + randomKey).update(`${openKeyId}&${timestamp}&${path}`).digest('hex');
  return randomKey + Buffer.from(hex, 'utf8').toString('base64');
}
