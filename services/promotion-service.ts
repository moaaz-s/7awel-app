// services/promotion-service.ts
import { publicHttpClient } from "@/services/httpClients/public";
import { error as logError } from "@/utils/logger";
import type { ApiResponse, Promotion } from "@/types";
import { handleError, respondOk, isApiSuccess } from "@/utils/api-utils";
import { ErrorCode } from "@/types/errors";

const BASE_PATH = "/promotions";

export const promotionService = {
  /** Fetch promotions for a given locale */
  async getPromotions(locale?: string): Promise<ApiResponse<Promotion[]>> {
    try {
      const params = locale ? { locale } : undefined;
      const response = await publicHttpClient.get<ApiResponse<Promotion[]>>(`${BASE_PATH}`, params);
      if (!isApiSuccess(response))
        return handleError(response.error || "Failed to fetch promotions", response.errorCode || ErrorCode.UNKNOWN);
      return response;
    } catch (e) {
      logError("[promotionService] getPromotions failed:", e);
      return handleError("Failed to fetch promotions", ErrorCode.UNKNOWN);
    }
  }
};
