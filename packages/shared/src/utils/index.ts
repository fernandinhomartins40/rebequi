/**
 * Shared Utility Functions
 * Reusable utility functions across frontend and backend
 */

/**
 * Generate a URL-friendly slug from a string
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start
    .replace(/-+$/, ''); // Trim - from end
}

/**
 * Format price to Brazilian Real (BRL)
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

/**
 * Calculate discount percentage
 */
export function calculateDiscount(originalPrice: number, currentPrice: number): number {
  if (originalPrice <= 0) return 0;
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
}

/**
 * Format date to Brazilian format
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dateObj);
}

/**
 * Format datetime to Brazilian format
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Check if a value is a valid email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Normalize a Brazilian WhatsApp number to digits only.
 * Accepts values with or without country code (+55).
 */
export function normalizeWhatsapp(value: string): string {
  const digits = value.replace(/\D/g, '');

  if (digits.length === 13 && digits.startsWith('55')) {
    return digits.slice(2);
  }

  if (digits.length === 12 && digits.startsWith('55')) {
    return digits.slice(2);
  }

  return digits;
}

/**
 * Check if the normalized Brazilian WhatsApp number is valid with DDD.
 */
export function isValidWhatsapp(value: string): boolean {
  const normalized = normalizeWhatsapp(value);
  return normalized.length === 10 || normalized.length === 11;
}

/**
 * Format normalized WhatsApp number for display.
 */
export function formatWhatsapp(value: string): string {
  const normalized = normalizeWhatsapp(value);

  if (normalized.length === 11) {
    return normalized.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }

  if (normalized.length === 10) {
    return normalized.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }

  return value;
}

/**
 * Build a provisional password from the first 3 letters of the customer name.
 */
export function buildProvisionalPassword(name: string): string {
  const lettersOnly = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z]/g, '')
    .toLowerCase();

  const base = lettersOnly.slice(0, 3) || 'cli';
  return base.padEnd(3, 'x');
}

/**
 * Sanitize string (remove HTML tags)
 */
export function sanitize(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Delay execution (Promise-based)
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate random ID (simple UUID v4-like)
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
