// services/log-service.ts
import { privateHttpClient } from "@/services/httpClients/private";
import { handleError, respondOk, isApiSuccess } from "@/utils/api-utils";
import { error as logError, info } from "@/utils/logger";
import type { ApiResponse } from "@/types";
import { ErrorCode } from "@/types/errors";
import { LogEvent } from "@/platform/data-layer/types";

class LogService {
  private queue: LogEvent[] = [];
  private flushInterval: NodeJS.Timeout;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        info("[logService] Online: flushing logs");
        this.flushLogs();
      });
    }
    // Flush logs every minute
    this.flushInterval = setInterval(() => {
      this.flushLogs();
    }, 60 * 1000);
  }

  /** Enqueue an event for logging */
  logEvent(eventType: string, payload: any): void {
    this.queue.push({ eventType, payload, timestamp: Date.now() });
  }

  /** Flush queued logs via batch endpoint, fallback to individual */
  async flushLogs(): Promise<ApiResponse<void>> {
    if (this.queue.length === 0) {
      return respondOk(undefined);
    }

    const eventsToSend = [...this.queue];
    try {
      const response = await privateHttpClient.logEvents(eventsToSend);
      if (isApiSuccess(response)) {
        this.queue = [];
        return response;
      }
      // If batch failed, try individual
      throw new Error(response.error || "Batch logging failed");
    } catch (batchErr) {
      logError("[logService] Batch flush failed, retrying individually", batchErr);
      let allSucceeded = true;
      for (const evt of eventsToSend) {
        try {
          const response = await privateHttpClient.logEvent(evt);
          if (!isApiSuccess(response)) {
            allSucceeded = false;
            logError(`[logService] Failed to log event ${evt.eventType}`, response.error);
          }
        } catch (e) {
          allSucceeded = false;
          logError(`[logService] Failed to log event ${evt.eventType}`, e);
        }
      }
      if (allSucceeded) {
        this.queue = [];
        return respondOk(undefined);
      }
      return handleError("Failed to flush logs", ErrorCode.UNKNOWN);
    }
  }

  /** Clear the log queue and stop flushing */
  destroy(): void {
    this.queue = [];
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
  }
}

export const logService = new LogService();
