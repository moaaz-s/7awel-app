"use client";

import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode, useRef } from 'react';
import * as storage from '@/utils/storage';
import { hashPin, verifyPin } from '@/utils/pin-hash';
import { apiService } from '@/services/api-service';
import { getItem as getSecureItem, setItem as setSecureItem, removeItem as removeSecureItem } from '@/utils/secure-storage';

// Key for storing the auth token
const AUTH_TOKEN_KEY = "auth_token";

// Simplified Auth State
type AuthState = 'pending' | 'unauthenticated' | 'requires_pin' | 'authenticated';

interface AuthContextType {
  authState: AuthState;
  isLoading: boolean; // General loading state for async operations
  checkAuthStatus: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  signin: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  signup: (/* details */) => Promise<void>; // Placeholder
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

  // Max wrong PIN attempts before we deny further attempts in this session
  const MAX_PIN_ATTEMPTS = 5;
  const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  const checkAuthStatus = useCallback(async () => {
    console.log("Checking auth status...");
    setIsLoading(true);
    setAuthState('pending'); // Start in pending state
    try {
      const authToken = await getSecureItem(AUTH_TOKEN_KEY); // <-- Check for token first
      const pinHash = await storage.getPinHash();
      const sessionActive = await storage.getSessionActive();

      if (authToken) { // <-- If token exists, assume authenticated (pending API validation)
        console.log("Auth token found, setting state to authenticated.");
        apiService.setToken(authToken); // <-- Set token in API service
        setAuthState('authenticated');
      } else if (pinHash && sessionActive) {
        console.log("Active session detected (no token) – requires PIN."); // Or could be authenticated if session implies it
        setAuthState('requires_pin'); // Let's require PIN if session is active but no token
      } else if (pinHash) {
        console.log("PIN hash found (no token), requires PIN validation.");
        setAuthState('requires_pin');
      } else {
         // No PIN means unauthenticated (onboarding status doesn't dictate auth state directly)
        console.log("No PIN hash or token, setting state to unauthenticated.");
        setAuthState('unauthenticated');
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setAuthState('unauthenticated'); // Default to unauthenticated on error
    } finally {
      setIsLoading(false);
      // Use a state snapshot in the callback to log the *updated* state reliably
      setAuthState(currentState => {
        console.log("Auth status check complete, state is now:", currentState);
        return currentState; // Return the state unchanged
      });
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const completeOnboarding = useCallback(async () => {
    console.log("Completing onboarding...");
    setIsLoading(true);
    try {
      await storage.setHasCompletedOnboarding(true);
      // No longer need to change authState here directly,
      // the calling component will handle navigation.
      console.log("Onboarding marked as complete in storage.");
    } catch (error) {
      console.error("Error completing onboarding:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Added function to explicitly get onboarding status
  const getOnboardingStatus = useCallback(async (): Promise<boolean> => {
      return await storage.getHasCompletedOnboarding();
  }, []);

  const signin = useCallback(async (phone: string): Promise<{ success: boolean; error?: string }> => {
    console.log(`Attempting Sign In for ${phone}...`);
    setIsLoading(true);
    try {
      const response = await apiService.login(phone);
      if (response.success && response.data.requiresOtp) {
        console.log("Sign In successful, OTP required.");
        // Don't change auth state yet, wait for OTP verification
        setIsLoading(false);
        return { success: true }; // Indicate success, UI should prompt for OTP
      } else {
        // Handle case where login might directly succeed or fail without OTP (if API supports)
        console.log("Sign In failed or unexpected response.");
        setIsLoading(false);
        return { success: false, error: response.error || "Login failed." };
      }
    } catch (error: any) {
      console.error("Sign In error:", error);
      setIsLoading(false);
      return { success: false, error: error.message || "An unexpected error occurred." };
    }
  }, []);

  const verifyOtp = useCallback(async (phone: string, otp: string): Promise<{ success: boolean; error?: string }> => {
    console.log(`Verifying OTP for ${phone}...`);
    setIsLoading(true);
    try {
      const response = await apiService.verifyOtp(phone, otp);
      if (response.success && response.data.token) {
        console.log("OTP Verification successful, token received.");
        await setSecureItem(AUTH_TOKEN_KEY, response.data.token);
        apiService.setToken(response.data.token);
        // Check if PIN needs to be set or validated
        const pinHash = await storage.getPinHash();
        if (pinHash) {
            setAuthState('requires_pin');
            console.log("OTP verified, requires PIN.");
        } else {
            // Should navigate to set PIN screen
            setAuthState('unauthenticated'); // Stay unauthenticated until PIN is set
            console.log("OTP verified, needs PIN setup.");
        }
        setIsLoading(false);
        return { success: true };
      } else {
        console.log("OTP Verification failed.");
        setIsLoading(false);
        return { success: false, error: response.error || "Invalid OTP." };
      }
    } catch (error: any) {
      console.error("OTP Verification error:", error);
      setIsLoading(false);
      return { success: false, error: error.message || "An unexpected error occurred." };
    }
  }, []);

  const signup = useCallback(async (/* userData */) => {
    console.log("Simulating Sign Up...");
    setIsLoading(true);
    // Simulate API Call
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Assume sign-up requires setting a PIN
    await storage.setHasCompletedOnboarding(true); // Sign up implies onboarding is done
    setAuthState('unauthenticated'); // Should likely go to a "set pin" screen or require PIN entry next
    // For now, let's assume they need to set a PIN after signup,
    // which might be handled by navigating them to a specific screen.
    // Let's stick to 'unauthenticated' and expect UI to guide to PIN setup.
     console.log("Sign Up successful (simulated), state set to unauthenticated (needs PIN setup next).");
    setIsLoading(false);
  }, []);

  const setPin = useCallback(async (pin: string) => {
    console.log("Setting PIN...");
    setIsLoading(true);
    try {
      const hashed = await hashPin(pin);
      await storage.setPinHash(hashed);
      setAuthState('authenticated'); // Setting PIN leads to authenticated state
      console.log("PIN set successfully, state is now authenticated.");
      // Redirect handled by AppInitializer based on new state
    } catch (error) {
      console.error("Error setting PIN:", error);
      // Handle error state appropriately
    } finally {
      setIsLoading(false);
    }
  }, []);

  const validatePin = useCallback(async (pin: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Check if locked out
      const lockedUntil = await storage.getPinLockUntil();
      if (lockedUntil && Date.now() < lockedUntil) {
        console.warn("PIN entry locked until", new Date(lockedUntil));
        setIsLoading(false);
        return false;
      }
      // --- TEST MODE --- Allow '1234' for easy testing
      if (pin === '1234') {
          console.warn("AuthContext: Test PIN '1234' used for validation.");
          setAuthState('authenticated'); // Assume success for test PIN
          await storage.setSessionActive();
          setIsLoading(false);
          await storage.resetPinAttempts();
          return true;
      }
      // --- END TEST MODE ---
      const storedHash = await storage.getPinHash();
      console.log('[AuthContext] Validating PIN:', { enteredPin: pin, retrievedHash: storedHash }); // <-- Log PIN and hash

      if (storedHash && await verifyPin(pin, storedHash)) {
        console.log("[AuthContext] PIN validation successful.");
        setAuthState('authenticated');
        await storage.setSessionActive();
        setIsLoading(false);
        await storage.resetPinAttempts();
        return true;
      } else {
        console.log("PIN validation failed.");
        const attempts = await storage.incrementPinAttempts();
        if (attempts >= MAX_PIN_ATTEMPTS) {
          await storage.setPinLockUntil(Date.now() + LOCK_DURATION_MS);
          await storage.resetPinAttempts();
          console.warn("Too many attempts - locked for", LOCK_DURATION_MS / 1000, "seconds");
        }
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error("Error validating PIN:", error);
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
    console.log("[AuthContext] logout called"); // Log call
    setIsLoading(true);
    try {
      // Optional: Call API logout endpoint if it exists
      // await apiService.logout(); 

      await removeSecureItem(AUTH_TOKEN_KEY); // <-- Clear token
      apiService.clearToken(); // <-- Use clearToken method
      await storage.clearSessionActive(); // <-- Clear session flag
      await storage.clearPinHash(); // Consider if PIN should be cleared on logout
      setAuthState('unauthenticated');
      console.log("Logout successful.");
    } catch (error) {
      console.error("Logout error:", error);
      // Still try to set state to unauthenticated even if clearing storage fails
      setAuthState('unauthenticated');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = {
    authState,
    isLoading,
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
