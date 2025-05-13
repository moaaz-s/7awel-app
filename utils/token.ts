/**
 * Token utility functions for JWT handling, validation and refreshing
 * 
 * This module provides utilities for working with JWT tokens in the application,
 * including decoding, validation, and expiration checking.
 */
import { info, warn, error as logError } from '@/utils/logger';

/**
 * Basic interface for JWT payload structure
 */
export interface JwtPayload {
  sub?: string;       // Subject (usually user identifier)
  iat?: number;       // Issued at timestamp
  exp?: number;       // Expiration timestamp
  deviceId?: string;  // Device identifier for binding
  [key: string]: any; // Allow for additional claims
}

/**
 * Parse and decode a JWT token without validation
 * @param token JWT token string
 * @returns Decoded payload or null if invalid format
 */
export function decodeToken(token: string): JwtPayload | null {
  if (!token) return null;
  
  try {
    // Split the token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      warn('[TokenUtils] Invalid token format');
      return null;
    }
    
    // Decode the payload (middle part)
    const payloadBase64 = parts[1];
    // Handle base64url format used in JWTs
    const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    
    // Decode using atob for browser compatibility (instead of Buffer)
    const jsonPayload = atob(normalized);
    return JSON.parse(jsonPayload);
  } catch (e) {
    logError('[TokenUtils] Error decoding token:', e);
    return null;
  }
}

/**
 * Check if a token is expired
 * @param token JWT token string
 * @param bufferSeconds Time buffer in seconds to consider a token as expired before actual expiration
 * @returns boolean indicating if token is expired or invalid
 */
export function isTokenExpired(token: string | null, bufferSeconds = 300): boolean {
  if (!token) return true;
  
  try {
    const payload = decodeToken(token);
    if (!payload || !payload.exp) return true;
    
    // Get current time in seconds
    const now = Math.floor(Date.now() / 1000);
    
    // Consider token expired if within buffer period before actual expiration
    // This helps avoid edge cases where token expires during an operation
    return payload.exp <= (now + bufferSeconds);
  } catch (e) {
    logError('[TokenUtils] Error checking token expiration:', e);
    return true; // Consider invalid tokens as expired
  }
}

/**
 * Extract token information for debugging
 * @param token JWT token
 * @returns Object with token information or null if invalid
 */
export function getTokenInfo(token: string | null): { 
  isValid: boolean;
  expiresAt?: Date;
  subject?: string;
  deviceId?: string;
  remainingSeconds?: number;
} | null {
  if (!token) return { isValid: false };
  
  const payload = decodeToken(token);
  if (!payload) return { isValid: false };
  
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = payload.exp ? new Date(payload.exp * 1000) : undefined;
  const remainingSeconds = payload.exp ? payload.exp - now : undefined;
  
  return {
    isValid: !isTokenExpired(token),
    expiresAt,
    subject: payload.sub,
    deviceId: payload.deviceId,
    remainingSeconds
  };
}

/**
 * Create a JWT token with the provided payload
 * @param payload Data to include in the token
 * @param expiresInSeconds Token expiration time in seconds (default: 24 hours)
 * @returns JWT token string with header, payload, and signature parts
 */
export function createToken(payload: Partial<JwtPayload>, expiresInSeconds = 86400): string {
  try {
    // Current timestamp in seconds
    const issuedAt = Math.floor(Date.now() / 1000);
    
    // Set expiration time
    const expiresAt = issuedAt + expiresInSeconds;
    
    // Create complete payload with timing fields
    const tokenPayload: JwtPayload = {
      ...payload,
      iat: issuedAt,
      exp: expiresAt
    };
    
    // Encode the payload to base64
    const encodedPayload = btoa(JSON.stringify(tokenPayload))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    // Use a standard JWT structure with header.payload.signature
    // Note: In a real implementation, this would be signed with a secret key
    return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${encodedPayload}.UNSIGNED`;
  } catch (e) {
    logError('[TokenUtils] Error creating token:', e);
    throw new Error('Failed to create token');
  }
}
