"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { useLanguage } from '@/context/LanguageContext';
import { SESSION_LOCKOUT_TIMEOUT_WARNING_MS } from '@/constants/auth-constants';
import { info } from '@/utils/logger';

export function IdleWarning() {
  const { isIdle, idleTimeRemaining } = useAuth();
  const { t } = useLanguage();
  const [hasShownWarning, setHasShownWarning] = useState(false);

  useEffect(() => {
    // Debug logs
    info('[IdleWarning] isIdle:', isIdle, 'idleTimeRemaining:', idleTimeRemaining, 'hasShownWarning:', hasShownWarning);
    
    // Show warning when user has 30 seconds left
    const shouldShowWarning = idleTimeRemaining > 0 && idleTimeRemaining <= SESSION_LOCKOUT_TIMEOUT_WARNING_MS && !isIdle;
    
    if (shouldShowWarning && !hasShownWarning) {
      info('[IdleWarning] Showing warning toast');
      toast({
        title: t("auth.idle.warningTitle"),
        description: t("auth.idle.warningDescription"),
        variant: "destructive",
      });
      setHasShownWarning(true);
    }
    
    // Reset warning flag when user becomes active again
    if (idleTimeRemaining > SESSION_LOCKOUT_TIMEOUT_WARNING_MS && hasShownWarning) {
      info('[IdleWarning] Resetting warning flag');
      setHasShownWarning(false);
    }
  }, [idleTimeRemaining, isIdle, hasShownWarning, t]);

  return null;
}
