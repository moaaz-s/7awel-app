/**
 * useTokenManager.ts
 * 
 * Centralized hook for managing authentication tokens and token-related state.
 */
import { useCallback } from 'react';
import { info, error as logError } from '@/utils/logger';
import { apiService } from '@/services/api-service';
import { 
  getItem as getSecureItem, 
  setItem as setSecureItem,
  removeItem as removeSecureItem 
} from '@/utils/secure-storage';
import { AUTH_TOKEN } from '@/constants/storage-keys';
import { AuthAction } from '../auth-types';
import { isTokenExpired } from '@/utils/token';

interface TokenCheckResult {
  authToken: string | null;
  isValid: boolean;
}

export function useTokenManager(
  dispatch: React.Dispatch<AuthAction>,
  scheduleLock: (exp: number) => void,
  t: (key: string) => string
) {
  const checkTokens = useCallback(async (): Promise<TokenCheckResult> => {
    try {
      const authToken = await getSecureItem(AUTH_TOKEN);
      // Token must exist and not be expired
      const valid = Boolean(authToken) && !isTokenExpired(authToken!);
      return {
        authToken: valid ? authToken : null,
        isValid: valid
      };
    } catch (err) {
      logError('Error checking tokens:', err);
      return {
        authToken: null,
        isValid: false
      };
    }
  }, []);

  const setTokens = useCallback(async (authToken: string | null) => {
    try {
      if (authToken) {
        await setSecureItem(AUTH_TOKEN, authToken);
        apiService.setToken(authToken);
        info('Auth token set');
      } else {
        await removeSecureItem(AUTH_TOKEN);
        apiService.setToken(null);
        info('Auth token cleared');
      }
    } catch (err) {
      logError('Error setting tokens:', err);
    }
  }, []);

  return {
    checkTokens,
    setTokens
  };
}
