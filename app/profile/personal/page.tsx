"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar } from "@/components/ui/avatar"
import { useLanguage } from "@/context/LanguageContext"
import { PhoneNumber } from "@/components/ui/phone-number"
import { Form, FormField } from "@/components/ui/form"
import { useData } from "@/context/DataContext-v2"
import type { User } from "@/types" // Import User type
import { ContentCard } from "@/components/ui/cards/content-card"
import { Loader2 } from "lucide-react"
import { PageContainer } from "@/components/layouts/page-container"

// Schema remains the same
const formSchema = z.object({
  firstName: z.string().min(1, { message: "validation.firstNameRequired" }),
  lastName: z.string().min(1, { message: "validation.lastNameRequired" }),
  email: z.string().email({ message: "validation.invalidEmail" }).optional().or(z.literal('')), 
})

// Removed splitName helper

// Simplified getInitials helper
const getInitials = (firstName?: string, lastName?: string): string => {
  const firstInitial = firstName?.[0]?.toUpperCase() || '';
  const lastInitial = lastName?.[0]?.toUpperCase() || '';
  return `${firstInitial}${lastInitial}` || '??';
};

export default function PersonalInfoPage() {
  const [phone, setPhone] = useState("")
  const { t } = useLanguage()
  const { user, updateUser } = useData()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
    },
  })

  // Simplified Effect: Set form defaults directly from user context
  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
      });
      setPhone(user.phone || "");
    }
  }, [user, form.reset]);

  // Simplified onSubmit handler: Compare directly and add delay
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!updateUser || !user) {
        return;
    }

    // Build updateData only with changed fields
    const updateData: Partial<User> = {};
    let changed = false;

    if (values.firstName.trim() !== user.firstName) {
        updateData.firstName = values.firstName.trim();
        changed = true;
    }
    if (values.lastName.trim() !== user.lastName) {
        updateData.lastName = values.lastName.trim();
        changed = true;
    }
    const currentEmail = user.email || "";
    const newEmail = values.email || "";
    if (newEmail !== currentEmail) {
        updateData.email = newEmail || undefined; // Send undefined if empty
        changed = true;
    }

    if (changed) {
        try {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000)); 
            await updateUser(updateData);
            // toast.success(t("profilePages.personalInfo.saveSuccess"));
            form.reset(values); // Reset form state to make it not dirty after save
        } catch (error) {
            // toast.error(t("profilePages.personalInfo.saveError"));
        }
    } else {
        // Optional: Notify user if no changes were made
        // toast.info(t("profilePages.personalInfo.noChanges"))
    }
  }

  // Loading state
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <PageContainer title={""} backHref="/profile" backIconStyle="cross">
      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="relative">
            <Avatar 
              size="xl" 
              initials={getInitials(user.firstName, user.lastName)}
              fallbackClassName="bg-gradient-to-r from-violet-500 to-blue-500"
            />
            <Button size="sm" className="absolute bottom-0 right-0 h-8 w-8 rounded-full p-0 bg-violet-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              <span className="sr-only">{t("profilePages.personalInfo.changeAvatar")}</span>
            </Button>
          </div>
        </div>

        <Form form={form} onSubmit={onSubmit} className="space-y-6">
            <ContentCard title="">
                <div className="grid grid-cols-2 gap-4">
                  <FormField name="firstName" label={t("profilePages.personalInfo.firstName")}>
                      <Input {...form.register("firstName")} />
                  </FormField>
                  <FormField name="lastName" label={t("profilePages.personalInfo.lastName")}>
                      <Input {...form.register("lastName")} />
                  </FormField>
                </div>

              <FormField name="email" label={t("profilePages.personalInfo.email")}>
                <Input type="email" {...form.register("email")} placeholder={t("profilePages.personalInfo.emailOptional")} />
              </FormField>

              <div className="space-y-2">
                <Label htmlFor="phone">{t("profilePages.personalInfo.phone")}</Label>
                <div className="relative">
                  <PhoneNumber value={phone} className="block w-full p-4 rounded-md border bg-muted opacity-75" />
                  <p className="text-xs text-muted-foreground">{t("profilePages.personalInfo.cantChange")}</p>
                </div>
              </div>
            </ContentCard>

            {/* Button disabled if not dirty (no changes) or submitting */}
            <Button type="submit" variant="gradient" className="w-full" disabled={!form.formState.isDirty || form.formState.isSubmitting}>
              {form.formState.isSubmitting ? t("common.saving") : t("profilePages.personalInfo.save")}
            </Button>
        </Form>
      </div>
    </PageContainer>
  )
}
