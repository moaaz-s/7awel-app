// services/user-service.ts
import { httpClient } from "@/services/http-client";
import type { ApiResponse, User, AppSettings } from "@/types";
import { handleError, respondOk } from "@/utils/api-utils";
import { ErrorCode } from "@/types/errors";
import { Yesteryear } from "next/font/google";

const BASE_PATH = "/user";

export const userService = {
  /** Fetch user profile and settings */
  async getUser(): Promise<ApiResponse<{ user: User; settings: AppSettings }>> {
    try {
      const response = await httpClient.get<{ user: User; settings: AppSettings }>(`${BASE_PATH}`);
      return respondOk(response);
    } catch (e) {
      return handleError("Failed to fetch user", e);
    }
  },

  /** Update user profile fields */
  async updateUser(data: Partial<User>): Promise<ApiResponse<User>> {
    if (!data) 
      return handleError("User data is required", ErrorCode.VALIDATION_ERROR);
    if (data.email || data.phone)
      return handleError("Email and phone can be updated through a separate authentication flow", ErrorCode.USER_CANNOT_UPDATE_EMAIL_PHONE);

    // This endpoint can only be called if the user has no information
    try {
      const user = await this.getUser();
      if (user.data?.user?.firstName || user.data?.user?.lastName || user.data?.user?.address)
        return handleError("User already has information", ErrorCode.USER_UPDATE_FAILED);

      if (!data.firstName || !data.lastName || !data.address)
        return handleError("First name, last name, and address are required", ErrorCode.USER_UPDATE_MISSING_INFORMATION);

      const response = await httpClient.put<User>(`${BASE_PATH}`, data);
      return respondOk(response);
    } catch (e) {
      return handleError("Failed to update user", e);
    }
  },

  /** Update user preferences/settings */
  async updatePreferences(prefs: AppSettings): Promise<ApiResponse<AppSettings>> {
    if (!prefs) return handleError("Preferences are required", ErrorCode.VALIDATION_ERROR);
    try {
      const response = await httpClient.put<AppSettings>(`${BASE_PATH}/preferences`, prefs);
      return respondOk(response);
    } catch (e) {
      return handleError("Failed to update preferences", e);
    }
  }
};
