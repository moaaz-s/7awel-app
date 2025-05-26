"use client"

import { useState } from "react"
import { PageContainer } from "@/components/layouts/page-container"
import { Avatar } from "@/components/ui/avatar"
import { AmountInput } from "@/components/amount-input"
import { useData } from "@/context/DataContext"
import { ContentCard } from "@/components/ui/cards/content-card"
import { FormField } from "@/components/ui/form-field"
import { SearchInput } from "@/components/ui/search-input"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/context/LanguageContext"
import { useSendTransaction } from "@/context/transactions/SendTransactionContext"
import { ContactCard } from "@/components/contact-card"
import { RecapLayout } from "@/components/layouts/RecapLayout"
import { PhoneNumber } from "@/components/ui/phone-number"
import { ContentCardRowItem } from "@/components/ui/cards/content-card-row-item"
import { spacing } from "@/components/ui-config"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function SendMoneyPage() {
  const { contacts, balance, formatCurrency, isLoadingContacts } = useData()
  const { t } = useLanguage()
  const { step, state, error, isLoading, setRecipient, setAmount, setNote, confirmSend, goBack } = useSendTransaction()

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
        <div className="flex-1 flex flex-col justify-between w-full max-w-md mx-auto">
          {step === "recipient" && (
            <div className="space-y-4">
              <SearchInput 
                placeholder={t("transaction.searchContact")} 
                value={searchQuery} 
                onChange={setSearchQuery} 
                className="mb-4"
              />

              {/* Loading indicator - shows while fetching fresh data */}
              {isLoadingContacts && contacts.length > 0 && (
                <div className="flex justify-center py-2">
                  <LoadingSpinner size="sm" />
                </div>
              )}

              <ContentCard 
                title={searchQuery ? t("transaction.searchResults") : t("transaction.recent")}
                elevated={true} 
                padding="sm">
                <div>
                  <div className="space-y-1">
                    {filteredContacts.length > 0 ? (
                      filteredContacts.map((contact) => (
                        <ContactCard key={contact.id} contact={contact} onSelect={() => setRecipient(contact)} />
                      ))
                    ) : (
                      <p className="text-center py-4 text-muted-foreground">{t("transaction.noContacts")}</p>
                    )}
                  </div>
                </div>
              </ContentCard>
            </div>
          )}

          {step === "amount" && state.recipient && (
            <div className="flex flex-col items-center space-y-8">
              <div className="text-center">
                <Avatar 
                  size="lg" 
                  className="mx-auto" 
                  initials={state.recipient.initial}
                />
                <h2 className="mt-3 text-xl font-medium">{state.recipient.name}</h2>
                <PhoneNumber value={state.recipient.phone} className="text-sm text-muted-foreground" />
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
      </div>
      </PageContainer>
    )
  }

  if (step === "confirmation" && state.recipient) {
    return (
      <RecapLayout
        title={getTitle()}
        backHref={step === "confirmation" ? undefined : "/home"} // Only use URL for home navigation
        onBackClick={step === "confirmation" ? goBack : undefined} // Use goBack function for step navigation
        onConfirm={confirmSend}
        confirmText={t("transaction.send", { amount: state.amount })}
        isLoading={isLoading}
        error={error}
      >
        {/* Content for the RecapLayout */}
        <div className="flex flex-col space-y-4">
          <ContentCard elevated={false} padding="sm">
            <ContentCardRowItem label={t("transaction.to_label")}>
              {state.recipient.name}
            </ContentCardRowItem>
          </ContentCard>
          <ContentCard elevated={false} padding="sm">
            <ContentCardRowItem label={t("transaction.reception_date_label")}>
              {t("transaction.reception_immediate")}
            </ContentCardRowItem>
          </ContentCard>
          <ContentCard elevated={false} padding="sm">
            <div className={spacing.stack_sm}>
              <ContentCardRowItem label={t("transaction.amount")}> 
                ${state.amount}
              </ContentCardRowItem>
              <ContentCardRowItem label={t("transaction.fee_label")}>
                {t("transaction.fee_offered")}
              </ContentCardRowItem>
            </div>
          </ContentCard>
          <ContentCard>
            <FormField label={t("transaction.addNote")} htmlFor="note">
              <Input
                id="note"
                placeholder={t("transaction.whatFor")}
                value={state.note}
                onChange={(e) => setNote(e.target.value)}
                className=""
              />
            </FormField>
          </ContentCard>
        </div>
      </RecapLayout>
    )
  }

  // Fallback or handle initial state if necessary
  return null; // Or a loading indicator, or redirect
}
