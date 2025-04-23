export type User = {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone: string
  avatar?: string
}

export type TransactionType = "send" | "receive" | "payment" | "cash_out"
export type TransactionStatus = "pending" | "completed" | "failed"

export type Transaction = {
  id: string
  name: string
  amount: number
  date: string
  type: TransactionType
  status: TransactionStatus
  reference?: string
  note?: string
  recipientId?: string
  senderId?: string
}

export type Contact = {
  id: string
  name: string
  phone: string
  email?: string
  initial: string
}

export type QRData = {
  userId: string
  amount?: number
  reference?: string
  timestamp: number
}

export type FlowState = {
  [key: string]: any
}

export type WalletBalance = {
  total: number
  available: number
  pending: number
}
