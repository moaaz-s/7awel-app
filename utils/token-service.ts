// utils/token-service.ts
// Centralized token storage and retrieval using secure storage

import { getItem, setItem, removeItem } from "@/utils/secure-storage";
import { AUTH_TOKEN, REFRESH_TOKEN } from "@/constants/storage-keys";
import { isTokenExpired } from "@/utils/token-utils";
import { authService } from "@/services/auth-service";
import { httpClient } from "@/services/http-client";
import { info, error as logError } from "./logger";

/**************************************************/
/******************* primitives *******************/
/**************************************************/

/**
 * Get the stored access token.
 * @returns token or null if not set
 */
async function getAuthToken(): Promise<string | null> {
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
  await setAuthToken(authToken);
  await setRefreshToken(refreshToken);

  info('[token-service] Set tokens');

  // httpsClient sets tokens automatically on acquisition & refresh.
}

/**
 * Clear both auth and refresh tokens.
 */
async function clearTokens(): Promise<void> {
  await removeAuthToken();
  await removeRefreshToken();

  httpClient.clearToken();
}

async function isTokenValid(authToken: string): Promise<boolean> {
  try {
    if (!authToken) return false;

    const valid = !isTokenExpired(authToken);
    if (!valid) {
      info('[token-service] Token invalid/expired');
      await clearTokens();
    }

    return valid;
  } catch (e) {
    logError("[token-service] validation failed:", e);
    return false;
  }
}

async function refreshToken(): Promise<boolean> {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) throw new Error("Refresh token not found");
    
    const { data, error, errorCode } = await authService.refreshToken(refreshToken);
    if (error) throw error;
    if (!data?.accessToken || !data?.refreshToken) throw new Error("Missing access or refresh token");
    
    await setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch (e) {
    logError("[token-service] refresh failed:", e);
    return false;
  }
}

/**************************************************/
/******************** Interface *******************/
/**************************************************/
export async function setHttpClientToken(){
  info('[token-service] Setting http client token');
  const authToken = await getAuthToken();
  if (!authToken) return
  
  info('[token-service] Token found');
  httpClient.setToken(authToken);
}

export async function acquireTokens(phone: string, email: string): Promise<boolean> {
  try {
    const { data, error, errorCode } = await authService.acquireToken(phone, email);
    if (error) throw error;
    if (!data?.accessToken || !data?.refreshToken) throw new Error("Missing access or refresh token");
    
    info('[token-service] Acquired token:');

    await setTokens(data.accessToken, data.refreshToken);
    return await isTokenValid(data.accessToken);
  } catch (e) {
    logError("[token-service] acquire failed:", e);
    return false;
  }
}

export async function initAndValidate(): Promise<boolean> {
  const authToken = await getAuthToken();
  if (!authToken) return false;
  if (await isTokenValid(authToken)) return true;
  return await refreshToken();
}

export async function signIn(phone: string, email: string): Promise<boolean> {
  try {
    const tokenAcquired = await acquireTokens(phone, email);
    if (!tokenAcquired) throw new Error("Token acquisition failed");

    return true
  } catch (e) {
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