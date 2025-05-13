"use client"

import { AuthFlowType } from '@/constants/auth-flows';
import { AuthFlowManager } from '@/components/auth/AuthFlowManager';

export default function SignUp() {
  return <AuthFlowManager flowType={AuthFlowType.SIGNUP} />
}
