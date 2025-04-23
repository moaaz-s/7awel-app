"use client"

import { AmountInput } from "@/components/amount-input"
import { useApp } from "@/context/AppContext"
import { PageContainer } from "@/components/ui/page-container"
import { CardContainer } from "@/components/ui/card-container"
import { ButtonPrimary } from "@/components/ui/button-primary"
import { spacing, typography } from "@/components/ui-config"
import { useCashOutFlow } from "@/hooks/use-transaction-flow"
import { CASH_OUT_METHODS } from "@/services/transaction-service"
import { ChevronRightIcon } from "@/components/icons"
import { useLanguage } from "@/context/LanguageContext"

export default function CashOutPage() {
  const { t } = useLanguage()
  const { balance, formatCurrency } = useApp()
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
            maxAmount={balance}
            showAvailableBalance={true}
            availableBalance={formatCurrency(balance)}
          />
        </div>
      )}

      {step === "confirmation" && state.method && (
        <div className={spacing.section}>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

          <CardContainer header={<h3 className="text-center text-lg font-medium">Cash Out Details</h3>}>
            <div className={spacing.stack}>
              <div className="flex justify-between">
                <span className={typography.muted}>Method</span>
                <span className="font-medium">{state.method.name}</span>
              </div>
              <div className="flex justify-between">
                <span className={typography.muted}>Amount</span>
                <span className="font-medium">${state.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className={typography.muted}>Fee ({state.method.fee})</span>
                <span className="font-medium">${calculateFee()}</span>
              </div>
              <div className="border-t pt-4 flex justify-between">
                <span className="font-medium">Total</span>
                <span className="font-bold">${calculateTotal()}</span>
              </div>
            </div>
          </CardContainer>

          <ButtonPrimary onClick={handleConfirm} disabled={isLoading} loading={isLoading} fullWidth size="xl">
            Confirm Cash Out
          </ButtonPrimary>
        </div>
      )}
    </PageContainer>
  )
}
