// services/http-client.ts
// Minimal HTTP wrapper so other modules can centralise auth header & token persistence.
// In mock environment we just expose setToken/clearToken; real network calls are not yet wired.

import { setItem, removeItem } from "@/utils/secure-storage"
import { info, error as logError } from "@/utils/logger"
import { apiService } from "@/services/api-service"
import { isApiSuccess } from "@/utils/api-utils"

// Use either header or URL prefix for versioning.
const API_VERSION = "1"
const BASE_PREFIX = "/v" + API_VERSION

function withPrefix(url: string): string {
  // If absolute (http/https) or already prefixed, return as-is
  if (/^https?:\/\//i.test(url) || url.startsWith(BASE_PREFIX)) {
    return url
  }
  // Ensure single slash between prefix and path
  return `${BASE_PREFIX}${url.startsWith("/") ? "" : "/"}${url}`
}

class HttpClient {
  private token: string | null = null

  setToken(token: string) {
    this.token = token
    // Persist for native builds
    setItem("auth_token", token).catch(() => {})
  }

  clearToken() {
    this.token = null
    removeItem("auth_token").catch(() => {})
  }

  private ensureToken() {
    if (!this.token) {
      throw new Error("Unauthorized – missing token")
    }
  }

  // Mocked fetch wrappers that include Authorization header when token exists.
  async get<T>(url: string): Promise<T> {
    this.ensureToken()
    const fullUrl = withPrefix(url)
    info(`[httpClient] GET ${fullUrl}`)
    // In mock phase, just throw not implemented so caller uses ApiService mocks
    throw new Error("Network GET not implemented – using mock ApiService")
  }

  async post<T>(url: string, body: unknown): Promise<T> {
    this.ensureToken()
    const fullUrl = withPrefix(url)
    info(`[httpClient] POST ${fullUrl}`)
    try {
      const res = await fetch(fullUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Version": API_VERSION,
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      return (await res.json()) as T
    } catch (err) {
      logError("[httpClient] POST error", err)
      throw err
    }
  }
}

export const httpClient = new HttpClient()
