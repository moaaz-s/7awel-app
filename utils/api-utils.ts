import type { ApiResponse } from "@/types"

/**
 * Determines whether an ApiResponse represents a successful operation.
 */
export function isApiSuccess<T>(res: ApiResponse<T>): boolean {
  return typeof res.statusCode === "number" && res.statusCode >= 200 && res.statusCode < 300
}
