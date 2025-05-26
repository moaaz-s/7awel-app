"use client"

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth/AuthContext';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { Button } from "@/components/ui/button";

interface ActionPopupProps {
  isOpen?: boolean;
  open?: boolean;
  title: string;
  message?: string;
  description?: string;
  icon?: React.ReactNode;
  primaryActionText: string;
  onPrimaryAction: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  isLoading?: boolean;
  backHref?: string;
  backAction?: () => void;
  secondaryTimer?: string | number; // e.g. '00:17' or countdown in seconds
}

export function ActionPopup({
  isOpen,
  open = true,
  title,
  message,
  description,
  icon,
  primaryActionText,
  onPrimaryAction,
  secondaryActionText,
  onSecondaryAction,
  isLoading = false,
  backHref,
  backAction,
  secondaryTimer,
}: ActionPopupProps) {
  const router = useRouter();
  const { authStatus } = useAuth();
  
  // Use either open or isOpen prop (for backward compatibility)
  const isVisible = open !== undefined ? open : isOpen;
  
  // Use either description or message prop (for backward compatibility)
  const displayMessage = description || message;

  // Default back action is to navigate to home if authenticated, or root if not
  const defaultBackAction = () => {
    const isAuthenticated = authStatus === 'authenticated';
    router.push(isAuthenticated ? '/home' : '/');
  };
  
  // If component is not visible, don't render anything
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <AuthLayout
        title={""}
        subtitle={""}
        backAction={backAction || defaultBackAction}
        backHref={backHref}
      >
        <div className="flex flex-col">

          <div>
            {/* Icon */}
            {icon && (
              <div className="flex-1 flex items-center justify-center mb-6">
                {icon}
              </div>
            )}  
            
            {/* Main content area with vertical centering */}
            <div className="flex-1 flex flex-col items-center justify-center w-full px-6">
              <h2 className="text-2xl font-semibold text-center mb-4">
                {title}
              </h2>
              {displayMessage && (
                <p className="text-center text-muted-foreground mb-8">
                  {displayMessage}
                </p>
              )}
            </div>
          </div>
          
          {/* Bottom actions */}
          <div className="flex flex-col gap-2 mt-auto">
            {/* Primary action button (e.g. "Go to inbox") */}
            <Button 
              variant="default"
              onClick={onPrimaryAction} 
              disabled={isLoading}
              isLoading={isLoading}
              fullWidth
              size="lg"
            >
              {primaryActionText}
            </Button>
            
            {/* Secondary action with optional timer (e.g. "Resend code in 00:17") */}
            {secondaryActionText && onSecondaryAction && (
              <Button 
                variant="ghost" 
                onClick={onSecondaryAction} 
                disabled={isLoading || !!secondaryTimer}
                isLoading={isLoading}
                fullWidth
              >
                {secondaryActionText}
                {secondaryTimer && ` in ${secondaryTimer}`}
              </Button>
            )}
          </div>
        </div>
      </AuthLayout>
    </div>
  );
}
