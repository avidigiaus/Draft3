/**
 * Helpers — input sanitization
 */

export function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  // Strip script-like content and trim
  return str
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();
}
