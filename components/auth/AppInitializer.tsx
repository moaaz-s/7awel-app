"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import SplashScreen from './SplashScreen'; 

// Define routes that are part of the public authentication/entry process
// Onboarding is now treated like any other public page accessible when unauthenticated.
const PUBLIC_AUTH_ROUTES = [
  '/', 
  '/onboarding', // Keep onboarding here, accessible when unauthenticated
  '/sign-in',
  '/sign-up',
  '/welcome', 
];
const PIN_ENTRY_ROUTE = '/pin-entry';
const HOME_ROUTE = '/home'; // Main authenticated app route

export default function AppInitializer({ children }: { children: React.ReactNode }) {
  const { authState } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't run redirects until the auth state is determined and we have a pathname
    if (authState === 'pending' || !pathname) return;

    const isPinEntryRoute = pathname === PIN_ENTRY_ROUTE;
    // Public route detection: exact match for '/', prefix match for others
    const isPublicAuthRoute =
      pathname === "/" || PUBLIC_AUTH_ROUTES.some((route) => route !== "/" && pathname.startsWith(route));
    
    // --- Simplified Redirection Logic ---
    // Removed onboarding state check
    if (authState === 'unauthenticated' && !isPublicAuthRoute && !isPinEntryRoute) {
      // Unauthenticated user trying to access protected route (not public, not PIN entry)
      console.log('[AppInitializer] Unauthenticated on protected route, redirecting to /');
      router.replace('/'); // Redirect to root/auth entry
    } else if (authState === 'requires_pin' && !isPinEntryRoute) {
       // Needs PIN but not on PIN entry page
      console.log('[AppInitializer] Requires PIN, redirecting to /pin-entry');
      router.replace(PIN_ENTRY_ROUTE);
    } else if (authState === 'authenticated' && (isPublicAuthRoute || isPinEntryRoute)) {
       // Authenticated but on a public/auth/pin route
      console.log('[AppInitializer] Authenticated on public/PIN route, redirecting to /home');
      router.replace(HOME_ROUTE);
    } else {
      // Log cases where no redirect happens (e.g., authenticated on /home)
      console.log(`[AppInitializer] No redirect needed. State: ${authState}, Path: ${pathname}`);
    }
    // --- End Redirection Logic ---

  }, [authState, router, pathname]);

  // --- Simplified Render Logic --- 
  // Decide ONLY whether to show splash screen or children
  
  // 1. Always show splash screen while initial auth state is pending
  if (authState === 'pending') {
    console.log('[AppInitializer] Rendering SplashScreen (pending)');
    return <SplashScreen />;
  }

  const isPinEntryRoute = pathname === PIN_ENTRY_ROUTE;
  // Public route detection: exact match for '/', prefix match for others
  const isPublicAuthRoute = pathname === "/" || PUBLIC_AUTH_ROUTES.some((route) => route !== "/" && pathname?.startsWith(route));
  const isProtectedRoute = !isPublicAuthRoute && !isPinEntryRoute;

  // 2. Handle Authenticated State
  if (authState === 'authenticated') {
    // Redirecting from public/PIN route? Show splash.
    if (isPublicAuthRoute || isPinEntryRoute) {
      console.log('[AppInitializer] Rendering SplashScreen (authenticated on public/PIN route - redirecting)');
      return <SplashScreen />;
    }
    // Authenticated on protected route? Render children. Providers are handled by layout.
    console.log('[AppInitializer] Rendering children (authenticated)');
    return <>{children}</>; 
  }

  // 3. Handle Unauthenticated State
  if (authState === 'unauthenticated') {
    // On a valid public/auth route? Render children.
    if (isPublicAuthRoute) {
       console.log('[AppInitializer] Rendering children (unauthenticated on public route)');
       return <>{children}</>;
    }
    // On protected or PIN route? Show splash while redirecting.
    console.log(`[AppInitializer] Rendering SplashScreen (unauthenticated on invalid route: ${pathname} - redirecting)`);
    return <SplashScreen />;
  }

  // 4. Handle Requires PIN State
  if (authState === 'requires_pin') {
    // On the PIN entry route? Render children.
    if (isPinEntryRoute) {
       console.log('[AppInitializer] Rendering children (requires_pin on PIN route)');
       return <>{children}</>;
    }
    // On any other route? Show splash while redirecting.
    console.log(`[AppInitializer] Rendering SplashScreen (requires_pin on non-PIN route: ${pathname} - redirecting)`);
    return <SplashScreen />;
  }

  // 5. Fallback: Should not be reached
  console.log(`[AppInitializer] Rendering SplashScreen (fallback/unexpected state - State: ${authState}, Path: ${pathname})`);
  return <SplashScreen />;
}
