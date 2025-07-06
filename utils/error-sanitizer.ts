// utils/error-sanitizer.ts
// Utility for sanitizing error messages to prevent XSS attacks

/**
 * Sanitize error message to remove potential XSS vectors
 * @param message - The error message to sanitize
 * @param maxLength - Maximum length of the message (default: 500)
 * @returns Sanitized error message
 */
export function sanitizeErrorMessage(message: string | null | undefined, maxLength: number = 500): string {
  if (!message) return 'An error occurred';
  
  // Convert to string and limit length
  let sanitized = String(message).slice(0, maxLength);
  
  // Remove script tags and their content (case insensitive)
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove other potentially dangerous tags (both opening and closing)
  sanitized = sanitized.replace(/<\/?(?:iframe|object|embed|link|meta|style|form|input|button|select|textarea)\b[^>]*>/gi, '');
  
  // Remove javascript: and data: protocols
  sanitized = sanitized.replace(/(?:javascript|data|vbscript):/gi, '');
  
  // Remove event handlers (onclick, onload, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^>\s]+/gi, '');
  
  // Replace HTML entities to prevent entity-based attacks
  sanitized = sanitized.replace(/&[#\w]+;/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized || 'An error occurred';
}