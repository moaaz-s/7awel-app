"use client"

import { AmountInput } from "@/components/amount-input"
import { useData } from "@/context/DataContext-v2"
import { PageContainer } from "@/components/layouts/page-container"
import { CardContainer } from "@/components/ui/card-container"
import { spacing, typography } from "@/components/ui-config"
import { useCashOutFlow } from "@/hooks/use-transaction-flow"
import { CASH_OUT_METHODS } from "@/services/transaction-service"
import { ChevronRightIcon } from "@/components/icons"
import { useLanguage } from "@/context/LanguageContext"
import { RecapLayout } from "@/components/layouts/RecapLayout"

export default function CashOutPage() {
  const { t } = useLanguage()
  const { balance, formatCurrency } = useData()
  const { step, state, error, isLoading, setMethod, setAmount, handleConfirm, calculateFee, calculateTotal } =
    useCashOutFlow()

  // Get the title based on current step
  const getTitle = () => {
    switch (step) {
      case "method":
        return t("cashOut.title")
      case "amount":
        return t("cashOut.enterAmount")
      case "confirmation":
        return t("cashOut.confirmCashOut")
      default:
        return t("cashOut.title")
    }
  }

  // Use PageContainer for method and amount steps
  if (step === "method" || step === "amount") {
    return (
      <PageContainer title={getTitle()} backHref="/home">
        {step === "method" && (
          <div className={spacing.section}>
            <p className={`${typography.small} ${typography.muted}`}>{t("cashOut.selectMethod")}</p>

            <div className={spacing.stack}>
              {CASH_OUT_METHODS.map((cashOutMethod) => (
                <CardContainer
                  key={cashOutMethod.id}
                  hoverable
                  onClick={() => setMethod(cashOutMethod)}
                  className="cursor-pointer"
                >
                  <div className="flex justify-between items-center p-4">
                    <div>
                      <h3 className="font-medium">{cashOutMethod.name}</h3>
                      <p className={`${typography.small} ${typography.muted}`}>
                        {t("cashOut.fee")}: {cashOutMethod.fee}
                      </p>
                    </div>
                    <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContainer>
              ))}
            </div>
          </div>
        )}

        {step === "amount" && state.method && (
          <div className={spacing.section}>
            <div className="text-center">
              <h2 className="font-medium">{state.method.name}</h2>
              <p className={`${typography.small} ${typography.muted}`}>Fee: {state.method.fee}</p>
            </div>

            <AmountInput
              onSubmit={setAmount}
              maxAmount={balance?.available ?? 0}
              showAvailableBalance={true}
              availableBalance={formatCurrency(balance?.available ?? 0)}
            />
          </div>
        )}
      </PageContainer>
    )
  }

  // Use RecapLayout for confirmation step
  if (step === "confirmation" && state.method) {
    return (
      <RecapLayout
        title={getTitle()}
        backHref={step === "confirmation" ? undefined : "/home"} // Made optional in RecapLayout
        onConfirm={handleConfirm}
        confirmText={t("cashOut.confirmButton")}
        isLoading={isLoading}
        error={error}
      >
        {/* Content for the RecapLayout */}
        <CardContainer header={<h3 className="text-center text-lg font-medium">{t("cashOut.details")}</h3>}>
          <div className={spacing.stack}>
            <div className="flex justify-between">
              <span className={typography.muted}>{t("cashOut.method")}</span>
              <span className="font-medium">{state.method.name}</span>
            </div>
            <div className="flex justify-between">
              <span className={typography.muted}>{t("cashOut.amount")}</span>
              <span className="font-medium">${state.amount}</span>
            </div>
            <div className="flex justify-between">
              <span className={typography.muted}>{t("cashOut.feeDetails", { fee: state.method.fee })}</span>
              <span className="font-medium">${calculateFee()}</span>
            </div>
            <div className="border-t pt-4 flex justify-between">
              <span className="font-medium">{t("cashOut.total")}</span>
              <span className="font-bold">${calculateTotal()}</span>
            </div>
          </div>
        </CardContainer>
      </RecapLayout>
    )
  }

  // Fallback or handle initial state if necessary
  return null // Or a loading indicator, or redirect
}
