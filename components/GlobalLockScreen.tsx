"use client"

import React, { useState } from 'react';
import { useAuth } from "@/context/auth/AuthContext";
import { AuthStatus } from "@/context/auth/auth-state-machine";
import { PinPad } from './pin-pad';
import { useLanguage } from '@/context/LanguageContext';
import { useSession } from "@/context/SessionContext";
import { SessionStatus } from '@/context/auth/auth-types';
import { error as logError } from '@/utils/logger';

export default function GlobalLockScreen({ children }: { children: React.ReactNode }) {
  const { authStatus, validatePin } = useAuth();
  const { status: sessionStatus, activate } = useSession();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only show when auth is locked or session is locked/expired
  const isSessionExpired = sessionStatus === SessionStatus.Expired;
  const isSessionLocked = sessionStatus === SessionStatus.Locked;
  
  const locked = authStatus === AuthStatus.Locked || isSessionLocked || isSessionExpired;
  if (!locked) {
    return <>{children}</>;
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
        setError(t("errors.PIN_INVALID"));
      }
    } catch (err) {
      logError(err);
      setError(t("errors.PIN_UNEXPECTED_ISSUE"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      {/* 
        <h2 className="text-lg font-medium mb-6 text-center">
          {isSessionExpired
            ? t("auth.sessionExpired")
            : t("auth.enterPin")}
        </h2> 
      */}
      <PinPad
        welcome_message={t("pinPad.lockedWelcomeMessage")}
        onValidPin={handleComplete}
        showBiometric
        showForgotPin={false}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
}
