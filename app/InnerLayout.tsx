"use client";

import React, { useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

interface InnerLayoutProps {
  children: React.ReactNode;
}

export default function InnerLayout({ children }: InnerLayoutProps) {
  const { language, isRTL } = useLanguage();

  useEffect(() => {
    if (document.documentElement) {
      document.documentElement.lang = language;
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    }
  }, [language, isRTL]);

  // Render children directly, layout structure is handled by RootLayout
  return <>{children}</>;
}
