"use client";

import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import * as storage from '@/utils/storage';

// Simplified Auth State
type AuthState = 'pending' | 'unauthenticated' | 'requires_pin' | 'authenticated';

interface AuthContextType {
  authState: AuthState;
  isLoading: boolean; // General loading state for async operations
  checkAuthStatus: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  signin: (/* credentials */) => Promise<void>; // Placeholder
  signup: (/* details */) => Promise<void>; // Placeholder
  setPin: (pin: string) => Promise<void>;
  validatePin: (pin: string) => Promise<boolean>;
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

  const checkAuthStatus = useCallback(async () => {
    console.log("Checking auth status...");
    setIsLoading(true);
    setAuthState('pending'); // Start in pending state
    try {
      const pinHash = await storage.getPinHash();

      // TODO: Add actual session validation logic here (e.g., check token)
      // For now, we only check if a PIN exists.

      if (pinHash) {
        console.log("PIN hash found, requires PIN validation.");
        setAuthState('requires_pin');
      } else {
         // No PIN means unauthenticated (onboarding status doesn't dictate auth state directly)
        console.log("No PIN hash, setting state to unauthenticated.");
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

  const signin = useCallback(async (/* credentials */) => {
    console.log("Simulating Sign In...");
    setIsLoading(true);
    // Simulate API Call
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Assume sign-in is successful and PIN is required next
    // In a real app, API would confirm if PIN setup is needed or directly authenticate

    // Check if PIN exists to determine next state
    const pinHash = await storage.getPinHash();
    if (pinHash) {
        setAuthState('requires_pin');
        console.log("Sign In successful (simulated), requires PIN.");
    } else {
        // If no PIN exists after sign-in, maybe they need to set one?
        // Or maybe sign-in failed conceptually. Let's assume success means requires_pin for now.
        // This logic needs refinement based on actual API flow.
        setAuthState('requires_pin'); // Or navigate to set PIN screen
        console.log("Sign In successful (simulated), requires PIN (assuming PIN exists or needs setup).");
    }

    setIsLoading(false);
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
      // Simulate hashing and saving PIN
      const dummyHash = `dummy-hash-${pin}`;
      await storage.setPinHash(dummyHash);
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

  const validatePin = useCallback(async (pin: string): Promise<boolean> => { // <<< MODIFIED FOR TESTING
    console.log("Validating PIN...");
    setIsLoading(true);
    try {
      // --- TEST MODE --- Allow '1234' for easy testing
      if (pin === '1234') {
          console.warn("AuthContext: Test PIN '1234' used for validation.");
          setAuthState('authenticated'); // Assume success for test PIN
          setIsLoading(false);
          return true;
      }
      // --- END TEST MODE ---
      const storedHash = await storage.getPinHash();
      const inputHash = `dummy-hash-${pin}`; // Simulate hashing input

      if (storedHash && storedHash === inputHash) {
        console.log("PIN validation successful.");
        setAuthState('authenticated');
        setIsLoading(false);
        return true;
      } else {
        console.log("PIN validation failed.");
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error("Error validating PIN:", error);
      setIsLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    console.log("Logging out...");
    setIsLoading(true);
    try {
      await storage.clearAll(); // Clear PIN hash and onboarding status
      setAuthState('unauthenticated');
      console.log("Logout complete, state set to unauthenticated.");
    } catch (error) {
      console.error("Error logging out:", error);
      // Handle error state appropriately? Maybe still force unauthenticated state.
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
    signup,
    setPin,
    validatePin,
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
