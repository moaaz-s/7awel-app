"use client";

import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { info, warn, error as logError } from "@/utils/logger";
import { hashPin, verifyPin } from '@/utils/pin-hash';
import { apiService } from '@/services/api-service';
import { getItem as getSecureItem, setItem as setSecureItem, removeItem as removeSecureItem } from '@/utils/secure-storage';
import { useLanguage } from "@/context/LanguageContext"
import { ErrorCode } from '@/types/errors';
import { isApiSuccess } from "@/utils/api-utils";
import * as storage from '@/utils/storage';

// Key for storing the auth token
const AUTH_TOKEN_KEY = "auth_token";

// Simplified Auth State
type AuthState = 'pending' | 'unauthenticated' | 'requires_pin' | 'authenticated';

// AuthResponse type to include errorCode
interface AuthResponse {
  success: boolean;
  error?: string;
  errorCode?: ErrorCode;
}

interface AuthContextType {
  authState: AuthState;
  isLoading: boolean; // General loading state for async operations
  isTokenReady: boolean;
  checkAuthStatus: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  signin: (phone: string) => Promise<AuthResponse>;
  verifyOtp: (phone: string, otp: string) => Promise<AuthResponse>;
  signup: (phone: string) => Promise<AuthResponse>; // Placeholder
  setPin: (pin: string) => Promise<void>;
  validatePin: (pin: string) => Promise<boolean>;
  checkPin: (pin: string) => Promise<boolean>; // new: validate without altering auth state
  logout: () => Promise<void>;
  // Add a way to check onboarding status explicitly if needed outside of initial check
  getOnboardingStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>('pending');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTokenReady, setIsTokenReady] = useState<boolean>(false);
  // Max wrong PIN attempts before we deny further attempts in this session
  const MAX_PIN_ATTEMPTS = 5;
  const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes
  const { t } = useLanguage();

  const checkAuthStatus = useCallback(async () => {
    info("Checking auth status...");
    setIsLoading(true);
    setIsTokenReady(false); // Reset on check
    try {
      const authToken = await getSecureItem(AUTH_TOKEN_KEY); // <-- Check for token first
      info(`  Retrieved authToken from storage: ${authToken ? '<token_found>' : authToken}`);
      const pinHash = await storage.getPinHash();
      const sessionActive = await storage.getSessionActive();

      if (authToken && pinHash) {
        // Scenario 1: Token AND PIN exist - Session valid, require PIN re-entry
        info("Token and PIN found. Setting state to requires_pin.");
        apiService.setToken(authToken); // Pre-load token for use after PIN
        setIsTokenReady(true);      // Mark token as ready
        setAuthState("requires_pin"); // Go to PIN entry screen
      } else if (authToken && !pinHash) {
        // Scenario 2: Token exists, but NO PIN (inconsistent state)
        // Force re-authentication to ensure PIN gets set up.
        warn("Auth state inconsistency: Token found but no PIN hash. Forcing re-login.");
        apiService.setToken(null);
        setAuthState("unauthenticated");
        setIsTokenReady(false); // Ensure false
      } else if (pinHash) {
        // We have a PIN set but no valid auth token ⇒ force full re-authentication (login + OTP) before unlocking.
        info("PIN hash found but no auth token – redirecting to login / OTP flow.");
        setAuthState('unauthenticated');
      } else {
        // No PIN means unauthenticated (onboarding status doesn't dictate auth state directly)
        info("No PIN hash or token, setting state to unauthenticated.");
        setAuthState('unauthenticated');
      }
    } catch (error) {
      logError("Error checking auth status:", error);
      apiService.setToken(null); // Clear token on error
      setAuthState('unauthenticated');
      setIsTokenReady(false); // Ensure false on error
    } finally {
      setIsLoading(false);
      info("Auth status check complete."); // Simplified logging
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const completeOnboarding = useCallback(async () => {
    info("Completing onboarding...");
    setIsLoading(true);
    try {
      await storage.setHasCompletedOnboarding(true);
      // No longer need to change authState here directly,
      // the calling component will handle navigation.
      info("Onboarding marked as complete in storage.");
    } catch (error) {
      logError("Error completing onboarding:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Added function to explicitly get onboarding status
  const getOnboardingStatus = useCallback(async (): Promise<boolean> => {
      return await storage.getHasCompletedOnboarding();
  }, []);

  const signin = useCallback(async (phone: string): Promise<AuthResponse> => {
    info(`Attempting Sign In for ${phone}...`);
    setIsLoading(true);
    try {
      // Validate phone number
      if (!phone || phone.trim() === "") {
        return { 
          success: false, 
          error: t("errors.PHONE_REQUIRED"),
          errorCode: ErrorCode.PHONE_REQUIRED
        };
      }
      
      const response = await apiService.login(phone);
      if (isApiSuccess(response) && response.data?.requiresOtp) {
        info("Sign In successful, OTP required.");
        setIsLoading(false);
        return { success: true };
      } else {
        // Handle case where login might directly fail
        warn("Sign In failed or unexpected response.");
        setIsLoading(false);
        return { 
          success: false, 
          error: t(`errors.${response.errorCode || ErrorCode.UNKNOWN}`),
          errorCode: response.errorCode || ErrorCode.UNKNOWN
        };
      }
    } catch (error: any) {
      logError("Sign In error:", error);
      setIsLoading(false);
      return { 
        success: false, 
        error: t("errors.NETWORK_ERROR"),
        errorCode: ErrorCode.NETWORK_ERROR
      };
    }
  }, [t]);

  const verifyOtp = useCallback(async (phone: string, otp: string): Promise<AuthResponse> => {
    info(`[verifyOtp] Function called for ${phone}...`);
    setIsLoading(true);
    let result: AuthResponse = { 
      success: false, 
      error: t("errors.UNKNOWN_ERROR"),
      errorCode: ErrorCode.UNKNOWN
    };

    try {
      // Validate OTP
      if (!otp || otp.trim() === "") {
        return { 
          success: false, 
          error: t("errors.OTP_REQUIRED"),
          errorCode: ErrorCode.OTP_REQUIRED
        };
      }
      
      const response = await apiService.verifyOtp(phone, otp);
      info(`[verifyOtp] Raw API response received:`, response);
      
      if (isApiSuccess(response) && response.data?.token) {
        try {
          // Store the auth token securely and initialize API
          await setSecureItem(AUTH_TOKEN_KEY, response.data.token);
          apiService.setToken(response.data.token); // Configure API for auth
          
          // Update auth state - we're considered auth'd but need PIN
          setAuthState('requires_pin');
          setIsTokenReady(true);
          info(`[verifyOtp] Auth state updated to: 'requires_pin'`);
          
          result = { success: true };
        } catch (secureStoreError) {
          logError("[verifyOtp] Error saving token to secure storage:", secureStoreError);
          setIsTokenReady(false);
          await removeSecureItem(AUTH_TOKEN_KEY);
          setAuthState('unauthenticated');
          result = { 
            success: false, 
            error: t("errors.TOKEN_SAVE_FAILED"),
            errorCode: ErrorCode.TOKEN_SAVE_FAILED
          };
        }
      } else {
        warn("OTP Verification failed (API level):", response.error);
        result = { 
          success: false, 
          error: t(`errors.${response.errorCode || ErrorCode.UNKNOWN}`),
          errorCode: response.errorCode || ErrorCode.UNKNOWN
        };
      }
    } catch (error: any) {
      logError("OTP Verification API call error:", error);
      result = { 
        success: false, 
        error: t("errors.NETWORK_ERROR"),
        errorCode: ErrorCode.NETWORK_ERROR
      };
    } finally {
      setIsLoading(false);
    }
    
    return result;
  }, [t]);

  const signup = useCallback(async (phone: string): Promise<AuthResponse> => {
    info(`Attempting Sign Up for ${phone}...`);
    setIsLoading(true);
    try {
      // Validate phone number
      if (!phone || phone.trim() === "") {
        return { 
          success: false, 
          error: t("errors.PHONE_REQUIRED"),
          errorCode: ErrorCode.PHONE_REQUIRED
        };
      }
      
      // Call the API service signup method
      const response = await apiService.signup(phone);
      if (isApiSuccess(response) && response.data?.requiresOtp) {
        info("Sign Up initiated, OTP required.");
        setIsLoading(false);
        return { success: true };
      } else {
        // Handle case where signup might directly fail
        warn("Sign Up failed or unexpected response.");
        setIsLoading(false);
        return { 
          success: false, 
          error: t(`errors.${response.errorCode || ErrorCode.UNKNOWN}`),
          errorCode: response.errorCode || ErrorCode.UNKNOWN
        };
      }
    } catch (error: any) {
      logError("Sign Up error:", error);
      setIsLoading(false);
      return { 
        success: false, 
        error: t("errors.NETWORK_ERROR"),
        errorCode: ErrorCode.NETWORK_ERROR
      };
    }
  }, [t]);

  const setPin = useCallback(async (pin: string) => {
    info("Setting PIN...");
    setIsLoading(true);
    try {
      // Validate PIN
      if (!pin || pin.trim() === "") {
        return; // PIN is required
      }
      
      const hashed = await hashPin(pin);
      await storage.setPinHash(hashed);
      setAuthState('authenticated'); // Setting PIN leads to authenticated state
      info("PIN set successfully, state is now authenticated.");
      // Redirect handled by AppInitializer based on new state
    } catch (error) {
      logError("Error setting PIN:", error);
      // Handle error state appropriately
    } finally {
      setIsLoading(false);
    }
  }, []);

  const validatePin = useCallback(async (pin: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Validate PIN
      if (!pin || pin.trim() === "") {
        return false; // PIN is required
      }
      
      // Check if locked out
      const lockedUntil = await storage.getPinLockUntil();
      if (lockedUntil && Date.now() < lockedUntil) {
        warn("PIN entry locked until", new Date(lockedUntil));
        setIsLoading(false);
        return false;
      }
      // --- TEST MODE --- Allow '1234' for easy testing
      if (pin === '1234') {
          warn("AuthContext: Test PIN '1234' used for validation.");
          setAuthState('authenticated'); // Assume success for test PIN
          await storage.setSessionActive();
          setIsLoading(false);
          await storage.resetPinAttempts();
          return true;
      }
      // --- END TEST MODE ---
      const storedHash = await storage.getPinHash();
      info('[AuthContext] Validating PIN:', { enteredPin: pin, retrievedHash: storedHash }); // <-- Log PIN and hash

      if (storedHash && (await verifyPin(pin, storedHash))) {
        info("[AuthContext] PIN validation successful.");
        // PIN is correct. Transition to authenticated state.
        // Assumes checkAuthStatus already loaded token if we reached 'requires_pin'.
        if (authState === "requires_pin") {
          info("Transitioning from requires_pin to authenticated.");
          setAuthState("authenticated");
        } else {
          // Log if we got here from an unexpected state, but still authenticate.
          info(`Transitioning from ${authState} to authenticated. Check flow logic.`);
          setAuthState("authenticated");
        }

        await storage.setSessionActive();
        setIsLoading(false);
        await storage.resetPinAttempts();
        return true;
      } else {
        warn("PIN validation failed.");
        const attempts = await storage.incrementPinAttempts();
        if (attempts >= MAX_PIN_ATTEMPTS) {
          await storage.setPinLockUntil(Date.now() + LOCK_DURATION_MS);
          await storage.resetPinAttempts();
          warn("Too many attempts - locked for", LOCK_DURATION_MS / 1000, "seconds");
        }
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      logError("Error validating PIN:", error);
      setIsLoading(false);
      return false;
    }
  }, []);

  // Check PIN without mutating authState (used in change PIN flow)
  const checkPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      // Allow test PIN as above
      if (pin === "1234") {
        return true;
      }
      const storedHash = await storage.getPinHash();
      return storedHash ? await verifyPin(pin, storedHash) : false;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    info("[AuthContext] logout called"); // Log call
    setIsLoading(true);
    try {
      // Optional: Call API logout endpoint if it exists
      // await apiService.logout(); 

      await removeSecureItem(AUTH_TOKEN_KEY); // <-- Clear token
      apiService.clearToken(); // <-- Use clearToken method
      await storage.clearSessionActive(); // <-- Clear session flag
      await storage.clearPinHash(); // Consider if PIN should be cleared on logout
      setAuthState('unauthenticated');
      setIsTokenReady(false); // Reset token ready state
      info("Logout successful.");
    } catch (error) {
      logError("Logout error:", error);
      // Still try to set state to unauthenticated even if clearing storage fails
      setAuthState('unauthenticated');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = {
    authState,
    isLoading,
    isTokenReady,
    checkAuthStatus,
    completeOnboarding,
    getOnboardingStatus, // Expose the function
    signin,
    verifyOtp,
    signup,
    setPin,
    validatePin,
    checkPin,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
