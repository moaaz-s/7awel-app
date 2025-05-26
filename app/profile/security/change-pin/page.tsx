"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from 'sonner';
import { PinChange } from '@/components/auth/PinChange';
import { PageContainer } from '@/components/layouts/page-container';

export default function ChangePinScreen() {
  const { t } = useLanguage();
  const router = useRouter();

  const handleSuccess = () => {
    toast.success(t('pinPad.updateSuccess'));
    router.back(); // Go back to the previous page on success
  };

  const handleCancel = () => {
    router.back(); // Go back on cancel
  };

  const title = t('pinPad.changeTitle');

  return (
    <PageContainer 
      title={title}
      backHref="/profile/security" 
    >
      <div className="flex flex-col items-center justify-center mt-4">
         <PinChange 
            onSuccess={handleSuccess}
            onCancel={handleCancel}
         />
      </div>
    </PageContainer>
  );
}
