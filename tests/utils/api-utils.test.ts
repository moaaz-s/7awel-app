import { describe, it, expect } from "vitest";
import { isApiSuccess, handleError, respondOk } from "@/utils/api-utils";
import { ErrorCode } from "@/types/errors";

describe("utils/api-utils", () => {
  it("isApiSuccess recognises 2xx status codes", () => {
    expect(isApiSuccess({ statusCode: 200 } as any)).toBe(true);
    expect(isApiSuccess({ statusCode: 299 } as any)).toBe(true);
  });

  it("isApiSuccess rejects non-2xx status codes", () => {
    for (const code of [199, 300, 404, 500]) {
      expect(isApiSuccess({ statusCode: code } as any)).toBe(false);
    }
  });

  it("respondOk wraps data with status 200", () => {
    const obj = { foo: "bar" };
    const res = respondOk(obj);
    expect(res.statusCode).toBe(200);
    expect(res.data).toBe(obj);
    expect(res.message).toBe("Success");
    expect(res.traceId).toMatch(/^trace-/);
  });

  it("handleError returns structured error response", () => {
    const res = handleError("Boom", ErrorCode.UNKNOWN, 418);
    expect(res.statusCode).toBe(418);
    expect(res.error).toBe("Boom");
    expect(res.errorCode).toBe(ErrorCode.UNKNOWN);
    expect(res.traceId).toMatch(/^trace-/);
  });
});
