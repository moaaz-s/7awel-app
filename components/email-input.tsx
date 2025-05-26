"use client"

import React from 'react';
import { useForm, SubmitHandler, UseFormReturn, FieldValues } from 'react-hook-form'; 
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
} from "@/components/ui/form"; 
import { useLanguage } from '@/context/LanguageContext';

const emailSchema = z.object({
  email: z.string().email({ message: "validation.emailInvalid" }), 
});

type EmailFormValues = z.infer<typeof emailSchema>;

interface EmailInputProps {
  onSubmit: (email: string) => Promise<void> | void;
  isLoading?: boolean;
  errorMessage?: string | null; 
}

export function EmailInput({ onSubmit, isLoading = false, errorMessage }: EmailInputProps) {
  const { t } = useLanguage();
  const form: UseFormReturn<EmailFormValues> = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: '',
    },
  });

  const handleFormSubmit: SubmitHandler<EmailFormValues> = async (data) => {
    await onSubmit(data.email);
  };

  return (
    <Form form={form} onSubmit={handleFormSubmit} className="space-y-6 w-full">
      
      <FormField
        name="email" 
        label={t('common.email')}
      >
        <Input 
          placeholder={t('placeholders.email')}
          {...form.register('email')} 
          type="email" 
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect="off"
          disabled={isLoading}
        />
      </FormField>
      
      {errorMessage && (
        <p className="text-sm font-medium text-destructive">{errorMessage}</p>
      )}

      <Button 
        type="submit"
        variant="gradient"
        disabled={isLoading}
        isLoading={isLoading}
        size="lg"
        fullWidth>
        {t('common.continue')}
      </Button>
    </Form>
  );
}