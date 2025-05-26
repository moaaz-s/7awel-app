"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthFlowType } from "@/context/auth/flow/flowsOrchestrator";
import { AuthFlowManager } from "@/components/auth/AuthFlowManager";
import { getItem, removeItem } from "@/utils/secure-storage";
import { PIN_FORGOT } from "@/constants/storage-keys";

export default function SignInPage() {
  const router = useRouter();
  const [flowType, setFlowType] = useState<AuthFlowType>(AuthFlowType.SIGNIN);
  useEffect(() => {
    (async () => {
      const isForgot = (await getItem(PIN_FORGOT)) === "true";
      setFlowType(isForgot ? AuthFlowType.FORGOT_PIN : AuthFlowType.SIGNIN);
    })();
  }, []);
  const handleComplete = async () => {
    if (flowType === AuthFlowType.FORGOT_PIN) {
      await removeItem(PIN_FORGOT);
    }
    router.replace('/home');
  };
  return <AuthFlowManager flowType={flowType} onComplete={handleComplete} />;
}
