"use client";

import React, { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { info } from '@/utils/logger';
import { getSession } from '@/utils/storage';
import { useAuth } from '@/context/auth/AuthContext';
import { AuthStatus } from '@/context/auth/auth-state-machine'; 
import { usePathname } from 'next/navigation';
import SplashScreen from './SplashScreen'; 

// ---- Route constants ----
const PUBLIC_AUTH_ROUTES = ['/', '/sign-in', '/sign-up'];
const HOME_ROUTE = '/home';

export default function AppInitializer({ children }: { children: React.ReactNode }) {
  // Destructure currentStep as well
  const { authStatus, getAuthToken, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const computeRedirect = useCallback((): string | null => {
    if (!pathname || authStatus === AuthStatus.Pending) return null;

    const isPublicRoute = pathname === '/' || PUBLIC_AUTH_ROUTES.some((r) => r !== '/' && pathname.startsWith(r));

    // --- AuthStatus based routing ---
    if (authStatus === AuthStatus.Authenticated) {
      if (isPublicRoute) return HOME_ROUTE;
      return null;
    }

    if (authStatus === AuthStatus.Unauthenticated) {
      return isPublicRoute ? null : '/';
    }

    if (
      authStatus === AuthStatus.Locked ||
      authStatus === AuthStatus.PinSetupPending ||
      authStatus === AuthStatus.RequiresPin
    ) {
      return '/sign-in';
    }

    return null;
  }, [authStatus, pathname]);

  useEffect(() => {
    const target = computeRedirect();
    if (target && pathname !== target) {
      console.log(`[AppInitializer] Redirecting from ${pathname} to ${target}`);
      router.replace(target);
    }
  }, [computeRedirect, pathname, router]);

  // Clear expired local session on init
  useEffect(() => {
    (async () => {
      try {
        const session = await getSession();
        if (session && session.expiresAt <= Date.now()) {
          info('[AppInitializer] Session expired, clearing and logging out');
          await logout();
        }
      } catch (err) {
        console.error('[AppInitializer] Error checking session expiry:', err);
      }
    })();
  }, [logout]);

  // If a token is stored, redirect unauthenticated users to sign-in
  useEffect(() => {
    (async () => {
      try {
        const token = await getAuthToken();
        if (token && authStatus === AuthStatus.Unauthenticated && pathname !== '/sign-in') {
          info('[AppInitializer] Token found, redirecting to /sign-in');
          router.replace('/sign-in');
        }
      } catch (err) {
        console.error('[AppInitializer] Error checking stored token:', err);
      }
    })();
  }, [getAuthToken, authStatus, pathname, router]);

  // Decide render: while pending OR redirecting we show SplashScreen
  const redirectTarget = computeRedirect();

  if (authStatus === AuthStatus.Pending || (redirectTarget && pathname !== redirectTarget)) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}
