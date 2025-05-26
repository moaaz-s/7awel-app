"use client"

import { PropsWithChildren } from "react"
import { SendTransactionProvider } from "@/context/transactions/SendTransactionContext"

export default function SendLayout({ children }: PropsWithChildren<{}>) {
  return <SendTransactionProvider>{children}</SendTransactionProvider>
}
