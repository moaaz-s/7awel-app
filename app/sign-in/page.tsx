"use client"

import { useRouter } from "next/navigation"
import { AuthFlowType } from '@/constants/auth-flows';
import { AuthFlowManager } from '@/components/auth/AuthFlowManager';

export default function SignInPage() {
  const router = useRouter();
  return (
    <AuthFlowManager
      flowType={AuthFlowType.SIGNIN}
      onComplete={() => router.replace('/home')}
    />
  );
}
