import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"

// Force no latency & deterministic behaviour BEFORE importing service
vi.stubGlobal("process", { env: { NEXT_PUBLIC_MOCK_LATENCY_MS: "0", NEXT_PUBLIC_MOCK_ERROR_RATE: "0" } })

// Dynamically import after env vars stubbed
// eslint-disable-next-line import/no-mutable-exports
let apiService: typeof import("@/services/api-service")["apiService"]
let isApiSuccess: typeof import("@/utils/api-utils").isApiSuccess

beforeAll(async () => {
  const svc = await import("@/services/api-service")
  apiService = svc.apiService
  isApiSuccess = (await import("@/utils/api-utils")).isApiSuccess

  // Neutralise the internal delay regardless of per-method maps
  // @ts-expect-error accessing private
  apiService.defaultMockDelay = 0
  // @ts-expect-error accessing private method
  vi.spyOn(apiService as any, "delay").mockImplementation((d: unknown) => Promise.resolve(d))
})

// Mock OTP storage helpers once (used by verifyOtp)
vi.mock("@/utils/storage", () => ({
  getOtpLockUntil: () => Promise.resolve(undefined),
  incrementOtpAttempts: () => Promise.resolve(1),
  setOtpLockUntil: () => Promise.resolve(),
  resetOtpAttempts: () => Promise.resolve(),
}))

beforeEach(() => {
  apiService.clearToken()
  apiService.setToken("unit-test-token")
  // @ts-expect-error private
  apiService.mockErrorRate = 0
})

describe("Auth endpoints", () => {
  it("login initiates OTP", async () => {
    const res = await apiService.login("+1555")
    expect(isApiSuccess(res)).toBe(true)
    expect(res.data?.requiresOtp).toBe(true)
  })

  it("verifyOtp returns auth token", async () => {
    const res = await apiService.verifyOtp("+1555", "123456")
    expect(isApiSuccess(res)).toBe(true)
    expect(res.data?.token).toBeDefined()
  })
})

describe("User endpoints", () => {
  it("getUser returns profile", async () => {
    const res = await apiService.getUser()
    expect(isApiSuccess(res)).toBe(true)
    expect(res.data?.firstName).toBeDefined()
  })

  it("updateUser merges fields", async () => {
    const res = await apiService.updateUser({ firstName: "Alice" })
    expect(isApiSuccess(res)).toBe(true)
    expect(res.data?.firstName).toBe("Alice")
  })
})

describe("Transaction endpoints", () => {
  it("getTransactions paginates", async () => {
    const res = await apiService.getTransactions({ limit: 1 })
    expect(isApiSuccess(res)).toBe(true)
    expect(res.data?.items.length).toBe(1)
  })

  it("getTransaction returns by id", async () => {
    const res = await apiService.getTransaction("tx1")
    expect(isApiSuccess(res)).toBe(true)
    expect(res.data?.id).toBe("tx1")
  })

  it("sendMoney creates outgoing transaction", async () => {
    const res = await apiService.sendMoney("contact1", 10, "note")
    expect(isApiSuccess(res)).toBe(true)
    expect(res.data?.amount).toBe(-10)
  })
})

describe("Request / Cash-out", () => {
  it("requestMoney returns pending request", async () => {
    const res = await apiService.requestMoney(25)
    expect(isApiSuccess(res)).toBe(true)
    expect(res.data?.amount).toBe(25)
  })

  it("cashOut creates reference", async () => {
    const res = await apiService.cashOut(50, "bank")
    expect(isApiSuccess(res)).toBe(true)
    expect(res.data?.reference).toMatch(/^WD/)
  })
})

describe("Contacts", () => {
  let createdId: string
  it("addContact", async () => {
    const res = await apiService.addContact({ name: "Bob Dylan", phone: "+1999" })
    expect(isApiSuccess(res)).toBe(true)
    createdId = res.data!.id
  })

  it("updateContact", async () => {
    const res = await apiService.updateContact(createdId, { phone: "+1222" })
    expect(isApiSuccess(res)).toBe(true)
    expect(res.data?.phone).toBe("+1222")
  })

  it("searchContacts finds by name", async () => {
    const res = await apiService.searchContacts("bob")
    expect(isApiSuccess(res)).toBe(true)
    expect(res.data?.[0].name.toLowerCase()).toContain("bob")
  })

  it("deleteContact", async () => {
    const res = await apiService.deleteContact(createdId)
    expect(isApiSuccess(res)).toBe(true)
  })
})

describe("Settings & Push", () => {
  it("get / update settings", async () => {
    const getRes = await apiService.getSettings()
    expect(isApiSuccess(getRes)).toBe(true)
    const upd = await apiService.updateSettings({ language: "ar" })
    expect(isApiSuccess(upd)).toBe(true)
    expect(upd.data?.language).toBe("ar")
  })

  it("register / unregister push", async () => {
    const reg = await apiService.registerPush("token123")
    expect(isApiSuccess(reg)).toBe(true)
    const unreg = await apiService.unregisterPush()
    expect(isApiSuccess(unreg)).toBe(true)
  })
})

describe("Wallet & Gas", () => {
  it("balances array length > 0", async () => {
    const res = await apiService.getBalances()
    expect(isApiSuccess(res)).toBe(true)
    expect(res.data!.length).toBeGreaterThan(0)
  })

  it("walletBalance wrapper returns first asset", async () => {
    const res = await apiService.getWalletBalance()
    expect(isApiSuccess(res)).toBe(true)
  })

  it("getPaymentAddress returns string", async () => {
    const res = await apiService.getPaymentAddress()
    expect(isApiSuccess(res)).toBe(true)
    expect(res.data).toMatch(/^0x/)
  })

  it("estimateGas computes fee", async () => {
    const res = await apiService.estimateGas({ assetSymbol: "USD", amount: 100 })
    expect(isApiSuccess(res)).toBe(true)
    expect(res.data!.fee).toBeGreaterThan(0)
  })
})

// Error-injection test at 100% rate

describe("mockErrorRate", () => {
  it("forces random error", async () => {
    // @ts-expect-error private
    apiService.mockErrorRate = 1
    const res = await apiService.getUser()
    expect(isApiSuccess(res)).toBe(false)
    expect(res.statusCode).toBeGreaterThanOrEqual(400)
  })
})
