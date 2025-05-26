// services/promotion-service.ts
import { httpClient } from "@/services/http-client";
import { error as logError } from "@/utils/logger";
import type { ApiResponse, Promotion } from "@/types";
import { handleError, respondOk } from "@/utils/api-utils";

const BASE_PATH = "/promotions";

export const promotionService = {
  /** Fetch promotions for a given locale */
  async getPromotions(locale?: string): Promise<ApiResponse<Promotion[]>> {
    try {
      const params = locale ? { locale } : undefined;
      const response = await httpClient.get<Promotion[]>(`${BASE_PATH}`, params);
      return respondOk(response);
    } catch (e) {
      logError("[promotionService] getPromotions failed:", e);
      return handleError("Failed to fetch promotions", e);
    }
  }
};
