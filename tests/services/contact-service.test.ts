import { describe, it, expect, beforeEach } from "vitest";

import "@/tests/helpers/test-setup";
import { resetTestSpies, baseHttpClientSpies } from "@/tests/helpers/test-setup";
import { contactService } from "@/services/contact-service";
import { ErrorCode } from "@/types/errors";

beforeEach(() => {
  resetTestSpies();
});

describe("services/contact-service", () => {
  it("getContacts success path", async () => {
    baseHttpClientSpies.getContacts.mockResolvedValue({ statusCode: 200, data: { items: [{ id: "c1" }], nextCursor: null, total: 1 } } as any);
    const resp = await contactService.getContacts(1, 10);
    expect(resp.statusCode).toBe(200);
    expect(resp.data?.items).toHaveLength(1);
    expect(baseHttpClientSpies.getContacts).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  it("getContacts returns error when api fails", async () => {
    baseHttpClientSpies.getContacts.mockResolvedValue({ statusCode: 500, error: "boom" } as any);
    const resp = await contactService.getContacts();
    expect(resp.errorCode).toBe(ErrorCode.NETWORK_ERROR);
  });

  it("syncContacts validation", async () => {
    const resp = await contactService.syncContacts([]);
    expect(resp.errorCode).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it("toggleFavorite validation", async () => {
    const resp = await contactService.toggleFavorite("");
    expect(resp.errorCode).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it("recordInteraction calls correct endpoint", async () => {
    baseHttpClientSpies.recordInteraction.mockResolvedValue({ statusCode: 200, data: { success: true } } as any);
    const resp = await contactService.recordInteraction("c1");
    expect(resp.statusCode).toBe(200);
    expect(resp.data?.success).toBe(true);
    expect(baseHttpClientSpies.recordInteraction).toHaveBeenCalledWith("c1");
  });
});
