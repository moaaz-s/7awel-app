import { describe, it, expect, vi, beforeEach } from "vitest";
import * as logger from "@/utils/logger";

describe("utils/logger", () => {
  const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    infoSpy.mockClear();
    warnSpy.mockClear();
    errorSpy.mockClear();
  });

  it("info/warn/error proxy to console when enabled", () => {
    logger.info("hello", 1);
    logger.warn("warn");
    logger.error("err");
    expect(infoSpy).toHaveBeenCalledWith("hello", 1);
    expect(warnSpy).toHaveBeenCalledWith("warn");
    expect(errorSpy).toHaveBeenCalledWith("err");
  });
});
