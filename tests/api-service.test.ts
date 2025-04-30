import { describe, it, expect, vi, beforeEach } from "vitest"
import { apiService } from "@/services/api-service"
import { ErrorCode } from "@/types"
import { isApiSuccess } from "@/utils/api-utils"

// Reset token and env for each test
beforeEach(() => {
  apiService.clearToken()
  // @ts-ignore
  process.env.NEXT_PUBLIC_MOCK_ERROR_RATE = "0"
})

describe("ApiService – Auth flow", () => {
  it("login should require OTP", async () => {
    const res = await apiService.login("+123")
    expect(isApiSuccess(res)).toBe(true)
    expect(res.data?.requiresOtp).toBe(true)
    expect(res.traceId).toBeTruthy()
  })

  it("verifyOtp happy path", async () => {
    // Mock storage helpers to no-op
    vi.mock("@/utils/storage", () => ({
      getOtpLockUntil: () => Promise.resolve(undefined),
      incrementOtpAttempts: () => Promise.resolve(1),
      setOtpLockUntil: () => Promise.resolve(),
      resetOtpAttempts: () => Promise.resolve(),
    }))

    const res = await apiService.verifyOtp("+123", "111111")
    expect(isApiSuccess(res)).toBe(true)
    expect(res.data?.token).toBeDefined()
  })
})

describe("ApiService – error injection", () => {
  it("mockErrorRate forces failure", async () => {
    // Store original rate and force 100% errors directly on the instance
    const originalRate = (apiService as any).mockErrorRate;
    (apiService as any).mockErrorRate = 1;

    // Set a dummy token to bypass ensureAuthorized check
    apiService.setToken("dummy-test-token");

    try {
        const res = await apiService.getUser()
        expect(isApiSuccess(res)).toBe(false)
        expect(res.statusCode).toBeGreaterThanOrEqual(400)
    } finally {
        // Clean up: Clear the dummy token and restore original error rate
        apiService.clearToken();
        (apiService as any).mockErrorRate = originalRate;
    }
  })
})
