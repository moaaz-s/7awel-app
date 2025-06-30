import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logService } from "@/services/log-service";
import { privateHttpClient } from "@/services/httpClients/private";
import type { ApiResponse } from "@/types";

// helpers
const successResp = <T>(data?: T): ApiResponse<T> => ({
  statusCode: 200,
  message: "OK",
  data,
  traceId: "test",
});

const errorResp = <T = unknown>(msg = "error"): ApiResponse<T> => ({
  statusCode: 500,
  message: "ERR",
  error: msg,
  traceId: "test",
});

// Narrow queue flush interval for tests to avoid setInterval side-effects
vi.useFakeTimers();

describe("logService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("flushLogs returns immediately when queue empty", async () => {
    const batchSpy = vi.spyOn(privateHttpClient, "logEvents");
    const singleSpy = vi.spyOn(privateHttpClient, "logEvent");

    const resp = await logService.flushLogs();
    expect(resp.statusCode).toBe(200);
    expect(batchSpy).not.toHaveBeenCalled();
    expect(singleSpy).not.toHaveBeenCalled();
  });

  it("flushLogs sends batch and clears queue on success", async () => {
    const batchSpy = vi
      .spyOn(privateHttpClient, "logEvents")
      .mockResolvedValue(successResp());

    const singleSpy = vi.spyOn(privateHttpClient, "logEvent");

    logService.logEvent("test_evt", { foo: "bar" });
    const resp = await logService.flushLogs();

    expect(batchSpy).toHaveBeenCalledTimes(1);
    expect(singleSpy).not.toHaveBeenCalled();
    expect(resp.statusCode).toBe(200);

    // Another flush should not call batch again (queue cleared)
    batchSpy.mockClear();
    await logService.flushLogs();
    expect(batchSpy).not.toHaveBeenCalled();
  });

  it("falls back to individual logEvent when batch fails", async () => {
    const batchSpy = vi
      .spyOn(privateHttpClient, "logEvents")
      .mockRejectedValue(new Error("batch fail"));

    const singleSpy = vi
      .spyOn(privateHttpClient, "logEvent")
      .mockResolvedValue(successResp());

    logService.logEvent("evt1", {});
    logService.logEvent("evt2", {});

    const resp = await logService.flushLogs();

    expect(batchSpy).toHaveBeenCalledTimes(1);
    expect(singleSpy).toHaveBeenCalledTimes(2);
    expect(resp.statusCode).toBe(200);
  });
});
