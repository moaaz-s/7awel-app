"use client"

import { useState } from "react"
import { PageContainer } from "@/components/ui/page-container"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AmountInput } from "@/components/amount-input"
import { useData } from "@/context/DataContext"
import { CardContainer } from "@/components/ui/card-container"
import { FormField } from "@/components/ui/form-field"
import { spacing, typography } from "@/components/ui-config"
import { SearchInput } from "@/components/ui/search-input"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/context/LanguageContext"
import { useSendMoneyFlow } from "@/hooks/use-transaction-flow"
import { ContactCard } from "@/components/contact-card"
import { RecapLayout } from "@/components/layouts/RecapLayout"
import { PhoneNumber } from "@/components/ui/phone-number"

export default function SendMoneyPage() {
  const { contacts, balance, formatCurrency } = useData()
  const { t } = useLanguage()
  const { step, state, error, isLoading, setRecipient, setAmount, setNote, handleConfirm } = useSendMoneyFlow()

  const [searchQuery, setSearchQuery] = useState("")

  // Filter contacts based on search query
  const filteredContacts = contacts.filter(
    (contact) => contact.name.toLowerCase().includes(searchQuery.toLowerCase()) || contact.phone.includes(searchQuery),
  )

  // Get the title based on current step
  const getTitle = () => {
    switch (step) {
      case "recipient":
        return t("transaction.send")
      case "amount":
        return t("transaction.enterAmount")
      case "confirmation":
        return t("transaction.confirmPayment")
      default:
        return t("transaction.send")
    }
  }

  if (step === "recipient" || step === "amount") {
    return (
      <PageContainer title={getTitle()} backHref="/home">
        {step === "recipient" && (
          <div className={spacing.section}>
            <SearchInput placeholder={t("transaction.searchContact")} value={searchQuery} onChange={setSearchQuery} />

            <div className={spacing.stack}>
              <h3 className={`${typography.small} ${typography.muted}`}>
                {searchQuery ? t("transaction.searchResults") : t("transaction.recent")}
              </h3>
              <div className={spacing.stack}>
                {filteredContacts.length > 0 ? (
                  filteredContacts.map((contact) => (
                    <ContactCard key={contact.id} contact={contact} onSelect={() => setRecipient(contact)} />
                  ))
                ) : (
                  <p className="text-center py-4 text-muted-foreground">{t("transaction.noContacts")}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {step === "amount" && state.recipient && (
          <div className="flex flex-col items-center space-y-6">
            <div className="text-center">
              <Avatar className="mx-auto h-16 w-16">
                <AvatarFallback className="bg-gradient-to-r from-violet-500 to-blue-500 text-white text-xl">
                  {state.recipient.initial}
                </AvatarFallback>
              </Avatar>
              <h2 className="mt-2 text-lg font-medium">{state.recipient.name}</h2>
              <PhoneNumber value={state.recipient.phone} className={`${typography.small} ${typography.muted}`} />
            </div>

            <AmountInput
              onSubmit={setAmount}
              maxAmount={balance?.available ?? 0} // Use available balance
              showAvailableBalance={true}
              // Format the available balance correctly
              availableBalance={t("transaction.available", { amount: formatCurrency(balance?.available ?? 0) })}
            />
          </div>
        )}
      </PageContainer>
    )
  }

  if (step === "confirmation" && state.recipient) {
    return (
      <RecapLayout
        title={getTitle()}
        backHref={step === "confirmation" ? undefined : "/home"} // Made optional in RecapLayout
        onConfirm={handleConfirm}
        confirmText={t("transaction.send", { amount: state.amount })}
        isLoading={isLoading}
        error={error}
      >
        {/* Content for the RecapLayout */}
        <CardContainer header={<h3 className="text-center text-lg font-medium">{t("transaction.paymentDetails")}</h3>}>
          <div className={spacing.stack}>
            <div className="flex justify-between">
              <span className={typography.muted}>{t("transaction.to")}</span>
              <span className="font-medium">{state.recipient.name}</span>
            </div>
            <div className="flex justify-between">
              <span className={typography.muted}>{t("transaction.amount")}</span>
              <span className="font-medium">${state.amount}</span>
            </div>
            <div className="flex justify-between">
              <span className={typography.muted}>{t("transaction.fee")}</span>
              <span className="font-medium">$0.00</span>
            </div>
            <div className="border-t pt-4 flex justify-between">
              <span className="font-medium">{t("transaction.total")}</span>
              <span className="font-bold">${state.amount}</span>
            </div>
          </div>
        </CardContainer>

        <FormField label={t("transaction.addNote")} htmlFor="note">
          <Input
            id="note"
            placeholder={t("transaction.whatFor")}
            value={state.note}
            onChange={(e) => setNote(e.target.value)}
          />
        </FormField>
      </RecapLayout>
    )
  }

  // Fallback or handle initial state if necessary
  return null; // Or a loading indicator, or redirect
}
