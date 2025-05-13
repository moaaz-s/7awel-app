"use client"

import React, { useState } from 'react';
import { useAuth } from "@/context/auth/AuthContext";
import { AuthStatus } from "@/context/auth/auth-state-machine";
import { PinEntry } from './pin-entry';
import { useLanguage } from '@/context/LanguageContext';
import { useSession } from "@/context/SessionContext";
import { SessionStatus } from '@/context/auth/auth-types';

export default function GlobalLockScreen() {
  const { authStatus, validatePin } = useAuth();
  const { status: sessionStatus, activate } = useSession();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only show when auth is locked or session is locked/expired
  const isSessionExpired = sessionStatus === SessionStatus.Expired;
  const isSessionLocked = sessionStatus === SessionStatus.Locked;
  
  if (authStatus !== AuthStatus.Locked && !isSessionLocked && !isSessionExpired) {
    return null;
  }

  const handleComplete = async (pinOrBio: string) => {
    setError(null);
    setIsLoading(true);
    
    try {
      // When using biometric shortcut, pinOrBio==="bio"
      let success = false;
      
      if (pinOrBio === "bio") {
        success = true; // Biometric is already validated
      } else if (isSessionLocked || isSessionExpired) {
        // Use session activation for locked/expired sessions
        success = await activate(pinOrBio);
      } else {
        // Use PIN validation for locked auth status
        success = await validatePin(pinOrBio);
      }
      
      if (!success) {
        setError(t("auth.incorrectPin"));
      }
    } catch (err) {
      setError(t("auth.errorValidatingPin"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <h2 className="text-lg font-medium mb-6 text-center">
        {isSessionExpired
          ? t("auth.sessionExpired")
          : t("auth.enterPin")}
      </h2>
      {error && (
        <div className="text-destructive mb-4 text-sm">{error}</div>
      )}
      <PinEntry
        onComplete={handleComplete}
        showBiometric
        showForgotPin={false}
        isLoading={isLoading}
      />
    </div>
  );
}
