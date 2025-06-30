"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from "@/context/auth/AuthContext";
import { AuthStatus } from "@/context/auth/auth-state-machine";
import { PinPad } from './pin-pad';
import { useLanguage } from '@/context/LanguageContext';
import { error as logError } from '@/utils/logger';

export default function GlobalLockScreen({ children }: { children: React.ReactNode }) {
  const { authStatus, unlockSession } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track if this is the initial render
  const hasInitialized = useRef(false);
  const [wasAuthenticated, setWasAuthenticated] = useState(false);
  
  useEffect(() => {
    // After first render, track if user was authenticated
    if (hasInitialized.current && authStatus === AuthStatus.Authenticated) {
      setWasAuthenticated(true);
    }
    hasInitialized.current = true;
  }, [authStatus]);

  // Only show lock screen when auth status is Locked
  // This happens after session timeout/lock
  const shouldShowLockScreen = authStatus === AuthStatus.Locked && wasAuthenticated;
  
  if (!shouldShowLockScreen) {
    return <>{children}</>;
  }

  const handleComplete = async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      await unlockSession();
    } catch (err) {
      logError(err);
      setError(t("errors.PIN_UNEXPECTED_ISSUE"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <PinPad
        welcome_message={t("pinPad.lockedWelcomeMessage")}
        onValidPin={handleComplete}
        showBiometric
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
}
