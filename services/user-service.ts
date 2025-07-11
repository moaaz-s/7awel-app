// services/user-service.ts
import { privateHttpClient } from "@/services/httpClients/private";
import type { ApiResponse, User, AppSettings } from "@/types";
import { handleError, respondOk } from "@/utils/api-utils";
import { ErrorCode } from "@/types/errors";
import { isApiSuccess } from "@/utils/api-utils";
import { info, error as logError } from "@/utils/logger";

export const userService = {
  /** Fetch user profile and settings */
  async getUser(): Promise<ApiResponse<{ user: User; settings: AppSettings }>> {
    try {
      const response = await privateHttpClient.getUser();
      if (!isApiSuccess(response))
        return handleError(response.error || "Failed to fetch user", ErrorCode.USER_FETCH_FAILED);
      return response;
    } catch (e: any) {
      return handleError(e.message, ErrorCode.USER_FETCH_FAILED);
    }
  },

  /** Update user profile fields */
  async updateUser(data: Partial<User>): Promise<ApiResponse<User>> {
    if (!data) 
      return handleError("User data is required", ErrorCode.VALIDATION_ERROR);
    if (data.email || data.phone)
      return handleError("Email and phone can be updated through a separate authentication flow", ErrorCode.USER_CANNOT_UPDATE_EMAIL_PHONE);

    try {
      // Allow wallet address updates separately from profile completion
      if (data.walletAddress && Object.keys(data).length === 1) {
        info("[updateUser] Updating wallet address");
        const response = await privateHttpClient.updateUser(data);
        if (!isApiSuccess(response)) {
          logError("[updateUser] Failed to update wallet address");
          return handleError(response.error || "Failed to update wallet address", ErrorCode.USER_UPDATE_FAILED);
        }
        return response;
      }

      // For profile completion, require minimum fields
      if (!data.firstName || !data.lastName || !data.address) {
        info("[updateUser] First name, last name, and address are required for profile completion");
        return handleError("First name, last name, and address are required", ErrorCode.USER_UPDATE_MISSING_INFORMATION);
      }

      const response = await privateHttpClient.updateUser(data);
      if (!isApiSuccess(response)) {
        logError("[updateUser] Failed to update user");
        return handleError(response.error || "Failed to update user", ErrorCode.USER_UPDATE_FAILED);
      }
      return response;
    } catch (e:any) {
      logError("[updateUser] Unexpected error while updating user", e);
      return handleError("Failed to update user", ErrorCode.USER_UPDATE_FAILED);
    }
  },

  /** Update user preferences/settings */
  async updatePreferences(prefs: AppSettings): Promise<ApiResponse<AppSettings>> {
    if (!prefs) return handleError("Preferences are required", ErrorCode.VALIDATION_ERROR);
    try {
      const response = await privateHttpClient.updatePreferences(prefs);
      if (!isApiSuccess(response))
        return handleError(response.error || "Failed to update preferences", ErrorCode.USER_UPDATE_FAILED);
      return response;
    } catch (e:any) {
      return handleError("Failed to update preferences", ErrorCode.USER_UPDATE_FAILED);
    }
  }
};
