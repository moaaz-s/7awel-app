import type { ApiResponse } from "@/types"
import { warn } from "./logger";
import { ErrorCode } from "@/types/errors";

/**
 * Determines whether an ApiResponse represents a successful operation.
 */
export function isApiSuccess<T>(res: ApiResponse<T>): boolean {
  return typeof res.statusCode === "number" && res.statusCode >= 200 && res.statusCode < 300
}


  /**
   * Handle API errors and format as ApiResponse.
   * @param message Error summary message.
   * @param errorCode The error code from ErrorCode enum.
   * @param statusCode Optional HTTP status code (defaults to 500).
   * @returns ApiResponse indicating failure.
   */
export function handleError(error: string, errorCode: ErrorCode, statusCode: number = 500): ApiResponse<never> {
    warn(`[HttpClient] ${error}:`, errorCode);
    return {
      statusCode,
      message: "",
      error,
      errorCode,
      traceId: `trace-${Date.now()}`
    };
  }

  /**
   * Create a successful ApiResponse.
   * @param data Payload of the response.
   * @returns ApiResponse indicating success.
   */
export function respondOk<T>(data: T): ApiResponse<T> {
    // Return a success response with proper types
    return {
      statusCode: 200,
      message: "Success",
      data,
      traceId: `trace-${Date.now()}`
    };
  }
