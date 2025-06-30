"use client";

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { info } from '@/utils/logger';
import { isPinForgotten } from '@/utils/storage';
import { useAuth } from '@/context/auth/AuthContext';
import { AuthStatus } from '@/context/auth/auth-state-machine'; 
import { usePathname } from 'next/navigation';
import SplashScreen from './SplashScreen'; 

// ---- Route constants ----
const SIGN_IN_ROUTE = '/sign-in';
const SIGN_UP_ROUTE = '/sign-up';
const HOME_ROUTE = '/home';

const PUBLIC_AUTH_ROUTES = ['/', SIGN_IN_ROUTE, SIGN_UP_ROUTE];


// Route configuration for different auth states
const ROUTE_CONFIG: Partial<Record<AuthStatus, {
  redirectAll?: string; // Regardless of current route (public or private): Redirect to this route
  redirectPublic?: string | false; // When user is on public route: redirect to this route, false to block access
  redirectPrivate?: string; // When user is on private route: redirect to this route
  blockedRoutes?: string[]; // Block access to these routes
}>> = {
  [AuthStatus.Unauthenticated]: {
    redirectPublic: false,
    redirectPrivate: '/'
  },
  [AuthStatus.PinSetupPending]: {
    redirectAll: SIGN_IN_ROUTE
  },
  [AuthStatus.RequiresPin]: {
    redirectAll: SIGN_IN_ROUTE
  },
  [AuthStatus.Authenticated]: {
    redirectPublic: HOME_ROUTE,
    blockedRoutes: [SIGN_UP_ROUTE]
  },
  [AuthStatus.Pending]: {},
  [AuthStatus.Initial]: {},
};

// Auth states that should show loading
const LOADING_STATES = [AuthStatus.Pending, AuthStatus.Initial];

export default function AppInitializer({ children }: { children: React.ReactNode }) {
  const { authStatus, isTokenReady } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  // All hooks must be declared at the top, before any conditional logic
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Memoize route type check
  const isPublicRoute = useMemo(() => {
    if (!pathname) return false;
    return PUBLIC_AUTH_ROUTES.some(route => 
      route === '/' ? pathname === '/' : pathname.startsWith(route)
    );
  }, [pathname]);

  // Compute redirect target based on auth state and current route
  const computeRedirect = useCallback(async (): Promise<string | null> => {
    // Skip computation if no pathname or in loading state
    if (!pathname || LOADING_STATES.includes(authStatus)) {
      return null;
    }

    // Priority 1: Handle PIN forgotten state
    if (await isPinForgotten() && pathname !== SIGN_IN_ROUTE) {
      info('[AppInitializer] PIN forgotten, redirecting to sign-in');
      return SIGN_IN_ROUTE;
    }

    // Priority 2: Use route configuration based on auth status
    const config = ROUTE_CONFIG[authStatus];
    if (!config) return null;

    // Handle redirect all cases
    if (config.redirectAll) {
      return pathname === config.redirectAll ? null : config.redirectAll;
    }

    // Handle blocked routes (e.g., authenticated users shouldn't access sign-up)
    if (config.blockedRoutes?.includes(pathname)) {
      info(`[AppInitializer] Blocking access to ${pathname} for ${authStatus} state`);
      return HOME_ROUTE;
    }

    // Handle public/private route redirects
    if (isPublicRoute && config.redirectPublic) {
      return config.redirectPublic;
    }
    
    if (!isPublicRoute && config.redirectPrivate) {
      return config.redirectPrivate;
    }

    return null;
  }, [authStatus, pathname, isPublicRoute]);

  // Main redirect effect
  useEffect(() => {
    let cancelled = false;

    const performRedirect = async () => {
      const target = await computeRedirect();
      
      if (!cancelled && target && pathname !== target) {
        info(`[AppInitializer] Redirecting: ${pathname} → ${target}`);
        router.replace(target);
      }
    };

    performRedirect();

    // Cleanup function to prevent redirects after unmount
    return () => {
      cancelled = true;
    };
  }, [computeRedirect, pathname, router]);

  // Handle special case: token becomes ready for unauthenticated user
  useEffect(() => {
    if (isTokenReady && 
        authStatus === AuthStatus.Unauthenticated && 
        pathname !== SIGN_IN_ROUTE) {
      info('[AppInitializer] Token ready, redirecting to sign-in');
      router.replace(SIGN_IN_ROUTE);
    }
  }, [isTokenReady, authStatus, pathname, router]);

  // Determine if we should show loading screen
  const shouldShowLoading = useMemo(() => {
    return LOADING_STATES.includes(authStatus);
  }, [authStatus]);

  // Check for redirects and update isRedirecting state
  useEffect(() => {
    let cancelled = false;

    const checkRedirect = async () => {
      const target = await computeRedirect();
      if (!cancelled && target && pathname !== target) {
        setIsRedirecting(true);
      } else if (!cancelled) {
        setIsRedirecting(false);
      }
    };

    checkRedirect();

    return () => {
      cancelled = true;
    };
  }, [computeRedirect, pathname]);

  // Show loading screen if auth is pending or if we're redirecting
  if (shouldShowLoading || isRedirecting) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}
