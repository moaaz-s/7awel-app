// utils/token-service.ts
// Centralized token storage and retrieval using secure storage

import { getItem, setItem, removeItem } from "@/utils/secure-storage";
import { AUTH_TOKEN, REFRESH_TOKEN } from "@/constants/storage-keys";
import { isTokenExpired } from "@/utils/token-utils";
import { authService } from "@/services/auth-service";

import { info, error as logError } from "./logger";
import { privateHttpClient } from "@/services/httpClients/private";

/**************************************************/
/******************* primitives *******************/
/**************************************************/

/**
 * Get the stored access token.
 * @returns token or null if not set
 */
export async function getAuthToken(): Promise<string | null> {
  return await getItem(AUTH_TOKEN);
}

/**
 * Store the access token.
 * @param token Access token to store
 */
async function setAuthToken(token: string): Promise<void> {
  await setItem(AUTH_TOKEN, token);
}

/**
 * Remove the stored access token.
 */
async function removeAuthToken(): Promise<void> {
  await removeItem(AUTH_TOKEN);
}

/**
 * Get the stored refresh token.
 * @returns token or null if not set
 */
async function getRefreshToken(): Promise<string | null> {
  return await getItem(REFRESH_TOKEN);
}

/**
 * Store the refresh token.
 * @param token Refresh token to store
 */
async function setRefreshToken(token: string): Promise<void> {
  await setItem(REFRESH_TOKEN, token);
}

/**
 * Remove the stored refresh token.
 */
async function removeRefreshToken(): Promise<void> {
  await removeItem(REFRESH_TOKEN);
}

/**************************************************/
/**************** Cross-app helpers ***************/
/**************************************************/

/**
 * Store both auth and refresh tokens; throws if either missing.
 */
async function setTokens(authToken: string, refreshToken: string): Promise<void> {
  if (!authToken || !refreshToken) throw new Error("Both authToken and refreshToken are required");
  
  console.log('[token-service] Setting tokens...');
  await setAuthToken(authToken);
  await setRefreshToken(refreshToken);

  info('[token-service] Set tokens');
  console.log('[token-service] Tokens stored in secure storage');

  // Propagate to HTTP client
  if (privateHttpClient?.setToken) {
    privateHttpClient.setToken(authToken);
    console.log('[token-service] Token set on HTTP client');
  } else {
    console.warn('[token-service] Private HTTP client not available');
  }
}

/**
 * Clear both auth and refresh tokens.
 */
async function clearTokens(): Promise<void> {
  if (privateHttpClient?.clearToken) {
    privateHttpClient.clearToken();
  }
  await removeAuthToken();
  await removeRefreshToken();
}

async function isTokenValid(authToken: string): Promise<boolean> {
  try {
    console.log('[token-service] Checking token validity');
    info('[token-service] Checking token validity');
    if (!authToken) {
      console.log('[token-service] No auth token provided');
      return false;
    }

    console.log('[token-service] Token found, checking expiration...');
    info('[token-service] Token found');
    const isExpired = isTokenExpired(authToken);
    console.log('[token-service] Token expired?', isExpired);

    // Don't clear tokens here - let the refresh flow handle it
    if (isExpired) {
      console.log('[token-service] Token expired, will be handled by the refresh flow');
      info('[token-service] Token expired, will be handled by the refresh flow');
      throw new Error('Token expired');
    }

    console.log('[token-service] Token is valid');
    return true;
  } catch (e) {
    console.error("[token-service] validation failed:", e);
    info("[token-service] validation failed:", e);
    return false;
  }
}

async function refreshToken(): Promise<boolean> {
  try {
    info('[token-service] Refreshing token');
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      info('[token-service] No refresh token found, clearing all tokens');
      await clearTokens();
      return false;
    }
    
    const { data, error, errorCode } = await authService.refreshToken(refreshToken);
    if (error) throw error;
    if (!data?.accessToken || !data?.refreshToken) throw new Error("Missing access or refresh token");
    
    info('[token-service] Token refreshed');
    await setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch (e) {
    logError("[token-service] refresh failed:", e);
    await clearTokens();
    return false;
  }
}

/**************************************************/
/******************** Interface *******************/
/**************************************************/

/**
 * Check if we have a token (regardless of expiration).
 * Returns: { exists: boolean, isExpired: boolean }
 */
export async function checkTokenStatus(): Promise<{ exists: boolean; isExpired: boolean }> {
  const authToken = await getAuthToken();
  if (!authToken) {
    return { exists: false, isExpired: true };
  }
  
  try {
    const expired = isTokenExpired(authToken);
    return { exists: true, isExpired: expired };
  } catch (e) {
    return { exists: false, isExpired: true };
  }
}

/**
 * Initialize and validate tokens, attempting refresh if needed.
 * Use this when you need a valid token for API calls.
 */
export async function initAndValidate(): Promise<boolean> {
  info('[token-service] Initializing and validating tokens');
  const authToken = await getAuthToken();
  if (!authToken) return false;
  
  // Check if current token is valid
  if (await isTokenValid(authToken)) {
    if (privateHttpClient?.setToken) privateHttpClient.setToken(authToken);
    return true;
  }
  if (await refreshToken()) {
    return true;
  }

  return false;
}

export async function acquireTokens(phone: string, email: string): Promise<boolean> {
  try {
    console.log('[token-service] Acquiring tokens for:', { phone, email });
    const response = await authService.acquireToken(phone, email);
    console.log('[token-service] Auth service response:', response);
    
    const { data, error, errorCode } = response;
    if (error) {
      console.error('[token-service] Auth service error:', error, errorCode);
      throw new Error(error);
    }
    if (!data?.accessToken || !data?.refreshToken) {
      console.error('[token-service] Missing tokens in response:', data);
      throw new Error("Missing access or refresh token");
    }
    
    console.log('[token-service] Tokens acquired successfully:', { 
      hasAccessToken: !!data.accessToken, 
      hasRefreshToken: !!data.refreshToken 
    });

    await setTokens(data.accessToken, data.refreshToken);
    console.log('[token-service] Tokens stored, validating...');
    
    const isValid = await isTokenValid(data.accessToken);
    console.log('[token-service] Token validation result:', isValid);
    
    return isValid;
  } catch (e) {
    console.error("[token-service] acquire failed:", e);
    logError("[token-service] acquire failed:", e);
    return false;
  }
}

export async function signOut(): Promise<void> {
  await clearTokens();
  try {
    await authService.logout();
  } catch (e) {
    logError("[token-service] logout failed:", e);
  }
}