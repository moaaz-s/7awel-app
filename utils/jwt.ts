// utils/jwt.ts
// Lightweight JWT decode (no signature verification).
// Returns the parsed payload or null on invalid token.

export function decodeJwt(token: string): Record<string, any> | null {
  if (!token) return null
  const parts = token.split(".")
  if (parts.length !== 3) return null
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const json = typeof window !== "undefined"
      ? atob(base64)
      : Buffer.from(base64, "base64").toString("utf-8")
    return JSON.parse(json)
  } catch {
    return null
  }
}
