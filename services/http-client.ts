// services/http-client.ts
// Minimal HTTP wrapper so other modules can centralise auth header & token persistence.
// In mock environment we just expose setToken/clearToken; real network calls are not yet wired.

import { setItem, removeItem } from "@/utils/secure-storage"
import { info, error as logError } from "@/utils/logger"
import { setHttpClientToken } from "@/utils/token-service"
import { getDeviceId } from "@/utils/device-fingerprint"

// Use either header or URL prefix for versioning.
const API_VERSION = "1"
const BASE_PREFIX = `http://localhost:3000/api/v${API_VERSION}`

function withPrefix(url: string): string {
  // If absolute (http/https) or already prefixed, return as-is
  if (/^https?:\/\//i.test(url) || url.startsWith(BASE_PREFIX)) {
    return url
  }
  // Ensure single slash between prefix and path
  return `${BASE_PREFIX}${url.startsWith("/") ? "" : "/"}${url}`
}

// Define allowed HTTP methods
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

class HttpClient {
  private skipAuth: boolean = false
  private token: string | null = null
  private deviceId: string | null = null
  private onAuthError: () => Promise<void> = async () => {}
  // Single-flight refresh control
  private refreshing: Promise<void> | null = null
  // Configurable retry/backoff options
  private retryDelayMs: number = 500
  private maxRetries: number = 1

  constructor(skipAuth: boolean = false) {
    this.skipAuth = skipAuth
  }

  async init() {
    if (!this.skipAuth) {
      await setHttpClientToken();
    }

    this.deviceId = await getDeviceId();
  }

  /**
   * Build a Fetch RequestInit with headers and optional body.
   * @param method HTTP method to use.
   * @param body Optional request payload.
   * @returns RequestInit object.
   */
  private makeRequestInit(method: HttpMethod, body?: unknown): RequestInit {
    let headers: Record<string, string> = {}
  
    if (this.deviceId)
      headers['X-Device-Fingerprint'] = this.deviceId
  
    if (!this.skipAuth && this.token)
      headers['Authorization'] = `Bearer ${this.token}`
  
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      return {
        method,
        headers,
        body: JSON.stringify(body),
      }
    }
  
    return { method, headers }
  }

  setToken(token: string) {
    this.token = token
    // Persist for native builds
    setItem("auth_token", token).catch(() => {})
  }

  /**
   * Set handler for token expiry (should refresh or logout)
   */
  initInterceptors(onAuthError: () => Promise<void>) {
    this.onAuthError = onAuthError
  }

  /** Configure retry attempts and backoff delay (ms) */
  public setRetryOptions(retries: number, delayMs: number) {
    this.maxRetries = retries
    this.retryDelayMs = delayMs
  }

  /** Delay helper */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /** Perform single-flight refresh via onAuthError */
  private async doRefresh(): Promise<void> {
    if (!this.refreshing) {
      this.refreshing = (async () => {
        try {
          await this.onAuthError()
        } finally {
          this.refreshing = null
        }
      })()
    }
    return this.refreshing
  }

  clearToken() {
    this.token = null
    removeItem("auth_token").catch(() => {})
  }

  private ensureToken() {
    if (this.skipAuth) 
      return;

    if (!this.token) {
      throw new Error("Unauthorized – missing token")
    }
  }

  /**
   * Executes a fetch function and retries once on 401/403 after refreshing token.
   */
  private async requestWithAuthRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.includes('401') || msg.includes('403')) {
        // perform single refresh
        await this.doRefresh()
        this.ensureToken();

        let lastError = err
        // retry fetch up to maxRetries times
        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
          if (this.retryDelayMs) {
            await this.delay(this.retryDelayMs)
          }
          try {
            return await fn()
          } catch (e: any) {
            lastError = e
          }
        }
        throw lastError
      }
      throw err
    }
  }

  private makeUrlWithParams(url: string, params?: Record<string, string>): string {
    if (!params) return url
    const urlObj = new URL(url)
    Object.entries(params).forEach(([key, value]) => urlObj.searchParams.append(key, value))
    return urlObj.toString()
  }

  // HTTP GET with retry on 401/403
  async get<T>(url: string, params?: Record<string, string>): Promise<T> {
    this.ensureToken()

    const fullUrl = withPrefix(url)
    info(`[httpClient] GET ${fullUrl}`)
    try {
      return await this.requestWithAuthRetry(async () => {
        const req = this.makeRequestInit('GET')

        const fullUrlWithParams = this.makeUrlWithParams(fullUrl, params)
        const res = await fetch(fullUrlWithParams, req)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as T
      })
    } catch (err: any) {
      logError('[httpClient] GET error', err)
      throw err
    }
  }

  // HTTP POST with retry on 401/403
  async post<T>(url: string, body: unknown): Promise<T> {
    this.ensureToken()
    const fullUrl = withPrefix(url)
    info(`[httpClient] POST ${fullUrl}`)
    try {
      return await this.requestWithAuthRetry(async () => {
        const req = this.makeRequestInit('POST', body)
        const res = await fetch(fullUrl, req)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as T
      })
    } catch (err: any) {
      logError('[httpClient] POST error', err)
      throw err
    }
  }

  /** HTTP PUT with retry */
  public async put<T>(url: string, body: unknown): Promise<T> {
    this.ensureToken()
    const fullUrl = withPrefix(url)
    info(`[httpClient] PUT ${fullUrl}`)
    try {
      return this.requestWithAuthRetry(async () => {
        const req = this.makeRequestInit('PUT', body)
        const res = await fetch(fullUrl, req)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as T
      })
    } catch (err: any) {
      logError('[httpClient] PUT error', err)
      throw err
    }
  }

  /** HTTP DELETE with retry */
  public async delete<T>(url: string, params?: Record<string, string>): Promise<T> {
    this.ensureToken()
    const fullUrl = withPrefix(url)
    info(`[httpClient] DELETE ${fullUrl}`)
    try {
      return this.requestWithAuthRetry(async () => {
        const req = this.makeRequestInit('DELETE')
        const fullUrlWithParams = this.makeUrlWithParams(fullUrl, params)
        const res = await fetch(fullUrlWithParams, req)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as T
      })
    } catch (err: any) {
      logError('[httpClient] DELETE error', err)
      throw err
    }
  }
}

export const httpClient = new HttpClient()
export const httpClientUnauthenticated = new HttpClient(true)