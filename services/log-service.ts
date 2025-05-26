// services/log-service.ts
import { httpClient } from "@/services/http-client";
import { handleError, respondOk } from "@/utils/api-utils";
import { error as logError, info } from "@/utils/logger";
import type { ApiResponse } from "@/types";

interface LogEvent {
  eventType: string;
  payload: any;
  timestamp: number;
}

class LogService {
  private queue: LogEvent[] = [];

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        info("[logService] Online: flushing logs");
        this.flushLogs();
      });
    }
    // Flush logs every minute
    setInterval(() => {
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
      const response = await httpClient.post<void>("/logs/batch", eventsToSend);
      this.queue = [];
      return respondOk(response);
    } catch (batchErr) {
      logError("[logService] Batch flush failed, retrying individually", batchErr);
      let allSucceeded = true;
      for (const evt of eventsToSend) {
        try {
          await httpClient.post<void>("/logs", evt);
        } catch (e) {
          allSucceeded = false;
          logError(`[logService] Failed to log event ${evt.eventType}`, e);
        }
      }
      if (allSucceeded) {
        this.queue = [];
        return respondOk(undefined);
      }
      return handleError("Failed to flush logs", batchErr);
    }
  }
}

export const logService = new LogService();
