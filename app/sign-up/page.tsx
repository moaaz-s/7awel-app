"use client"

import { AuthFlowType } from '@/context/auth/flow/flowsOrchestrator';
import { AuthFlowManager } from '@/components/auth/AuthFlowManager';

export default function SignUp() {
  return <AuthFlowManager flowType={AuthFlowType.SIGNUP} />
}
