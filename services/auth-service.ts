// services/auth-service.ts
import { privateHttpClient } from "@/services/httpClients/private";
import { publicHttpClient } from "@/services/httpClients/public";
import type {
  ApiResponse,
  CheckAvailabilityResponse,
  OtpInitiationResponse,
  OtpVerificationResponse,
  TokenAcquisitionResponse
} from "@/types";
import { OTP_CHANNEL } from "@/context/auth/auth-types";
import { handleError, respondOk } from "@/utils/api-utils";
import { ErrorCode } from "@/types/errors";
import { info } from "@/utils/logger";

const BASE_PATH = "/auth";

/*********************************************/
/******** Internal utility endpoints *********/
/*********************************************/

/**
 * TODO: shall we handle checkavailability here or in the backend only?
 * Check availability of phone or email
 */
async function checkAvailability(
  medium: "phone" | "email",
  value: string,
  skipAuth: boolean = false
): Promise<ApiResponse<boolean>> {
  const client = skipAuth ? publicHttpClient : privateHttpClient;
  const response = await client.get<ApiResponse<CheckAvailabilityResponse>>(
    `${BASE_PATH}/check-availability`,
    { medium, value }
  );

  // TODO: handle error cases from the API here via handleError.
  //       Feel free to add error codes to ErrorCode if necessary.

  if (response.error)
    return handleError(response.error, response.errorCode || ErrorCode.UNKNOWN);

  if (!response?.data?.available)
    return handleError(`${medium} [${value}] is not available.`, medium == "phone" ? ErrorCode.PHONE_ALREADY_REGISTERED : ErrorCode.EMAIL_ALREADY_REGISTERED);

  return respondOk(true);
}

/**
 * Send OTP to phone or email
 */
async function sendOtp(
  medium: "phone" | "email",
  value: string,
  channel: OTP_CHANNEL = OTP_CHANNEL.WHATSAPP,
  checkIfClaimed: boolean = false,
  skipAuth: boolean = false
): Promise<ApiResponse<OtpInitiationResponse>> {
  if (!medium || !value)
    return handleError(`Medium [${medium}] and value [${value}] are required.`, ErrorCode.OTP_MISSING_MEDIUM);
  
  if (medium === 'email' && !/\S+@\S+\.\S+/.test(value)) {
    return handleError(`Invalid email format [${value}].`, ErrorCode.EMAIL_INVALID);
  }

  if (checkIfClaimed) {
    const {error: checkAvailabilityError, errorCode: checkAvailabilityErrorCode} = await checkAvailability(medium, value, skipAuth);
    if (checkAvailabilityErrorCode) {
      return handleError(checkAvailabilityError || `Medium [${medium}] and value [${value}] are not available.`, checkAvailabilityErrorCode);
    }
  }

  const client = skipAuth ? publicHttpClient : privateHttpClient;
  
  const response = await client.post<ApiResponse<OtpInitiationResponse>>(
    `${BASE_PATH}/otp/send`,
    { medium, value, channel }
  );

  if (response.error)
    return handleError(response.error, response.errorCode || ErrorCode.UNKNOWN);

  // TODO: handle error cases from the API here via handleError.
  //       Feel free to add error codes to ErrorCode if necessary.

  return response;
}

/**
 * Verify OTP code
 */
async function verifyOtp(
  medium: "phone" | "email",
  value: string,
  otp: string,
  skipAuth: boolean = false
): Promise<ApiResponse<boolean>> {

  if (!medium || !value)
    return handleError(`Medium [${medium}] and value [${value}] are required.`, ErrorCode.OTP_MISSING_MEDIUM);
  
  if (!otp)
    return handleError("OTP is required.", ErrorCode.OTP_REQUIRED);
  
  const client = skipAuth ? publicHttpClient : privateHttpClient;
  const response = await client.post<ApiResponse<OtpVerificationResponse>>(
    `${BASE_PATH}/otp/verify`,
    { medium, value, otp }
  );

  if (response.error || !response.data)
    return handleError(response.error || "Failed to verify OTP", response.errorCode || ErrorCode.UNKNOWN);

  if (!response?.data?.valid)
    return handleError("Invalid OTP", ErrorCode.OTP_INVALID);

  // TODO: handle error cases from the API here via handleError.
  //       Feel free to add error codes to ErrorCode if necessary.

  return respondOk(true);
}

/*********************************************/
/************ External endpoints *************/
/*********************************************/

export const authService = {
  /**
   * Send OTP shortcut for signin purposes
   * Doesn't require checking for availability & doesn't require auth token
   */
  async sendOtpSignin(
    medium: "phone" | "email",
    value: string,
    channel: OTP_CHANNEL = OTP_CHANNEL.WHATSAPP,
  ): Promise<ApiResponse<OtpInitiationResponse>> {
    return sendOtp(medium, value, channel, false, true);
  },

  /**
   * Send OTP shortcut for signup purposes
   * Requires checking for availability & doesn't require auth token
   */
  async sendOtpSignup(
    medium: "phone" | "email",
    value: string,
    channel: OTP_CHANNEL = OTP_CHANNEL.WHATSAPP,
  ): Promise<ApiResponse<OtpInitiationResponse>> {
    return sendOtp(medium, value, channel, true, true);
  },

  /**
   * Send OTP shortcut for user info update purposes
   * Requires checking for availability & requires auth token
   */
  async sendOtpUpdateAuthenticated(
    medium: "phone" | "email",
    value: string,
    channel: OTP_CHANNEL = OTP_CHANNEL.WHATSAPP,
  ): Promise<ApiResponse<OtpInitiationResponse>> {
    return sendOtp(medium, value, channel, true, false);
  },

  /**
   * Send OTP shortcut for transaction/operation purposes
   * Doesn't require checking for availability & requires auth token
   */
  async sendOtpOperationAuthenticated(
    medium: "phone" | "email",
    value: string,
    channel: OTP_CHANNEL = OTP_CHANNEL.WHATSAPP,
  ): Promise<ApiResponse<OtpInitiationResponse>> {
    return sendOtp(medium, value, channel, false, false);
  },

  /**
   * Verify OTP shortcut for unauthenticated flows
   */
  async verifyOtpUnauthenticated(
    medium: "phone" | "email",
    value: string,
    otp: string
  ): Promise<ApiResponse<boolean>> {
    return verifyOtp(medium, value, otp, true);
  }, 

  /**
   * Verify OTP shortcut for authenticated flows
   */
  async verifyOtpAuthenticated(
    medium: "phone" | "email",
    value: string,
    otp: string
  ): Promise<ApiResponse<boolean>> {
    return verifyOtp(medium, value, otp, false);
  }, 

  /**
   * Intended to be used ONLY by token manager
   * Login with credentials
   */
  async acquireToken(
    phone: string,
    email: string
  ): Promise<ApiResponse<TokenAcquisitionResponse>> {
    
    // TODO: do we really need phone & email at this stage?
    //       whatever we may need as params should be checked for validity
    //       Feel free to add error codes to ErrorCode if necessary.
    
    const response = await publicHttpClient
                            .post<ApiResponse<TokenAcquisitionResponse>>
                            (`${BASE_PATH}/login`, { phone, email });

    if (response.error || !response.data?.accessToken || !response.data?.refreshToken)
      return handleError(response.error || "Failed to acquire token", response.errorCode || ErrorCode.UNKNOWN);
    
    // TODO: handle error cases from the API here via handleError.
    //       Feel free to add error codes to ErrorCode if necessary.

    privateHttpClient.setToken(response.data.accessToken);
    return response;
  },

  /**
   * Refresh the authentication token
   */
  async refreshToken(
    refreshToken: string
  ): Promise<ApiResponse<TokenAcquisitionResponse>> {
    const response = await privateHttpClient.post<ApiResponse<TokenAcquisitionResponse>>(`${BASE_PATH}/refresh`, { refreshToken });
    if (response.error || !response.data?.accessToken || !response.data?.refreshToken)
      return handleError(response.error || "Failed to refresh token", response.errorCode || ErrorCode.UNKNOWN);
        
    privateHttpClient.setToken(response.data.accessToken);
    return response;
  },

  /**
   * Logout and clear tokens
   */
  async logout(): Promise<void> {
    // TODO: Force expire on remote token

    // const response = await privateHttpClient.post<{
    //   accessToken: string;
    //   refreshToken: string;
    // }>(`${BASE_PATH}/logout`);

    // TODO: handle error cases from the API here via handleError.
    //       Feel free to add error codes to ErrorCode if necessary.
    
    privateHttpClient.clearToken();
  },

  /** Get list of active devices/sessions */
  async getDevices(): Promise<ApiResponse<any>> {
    try {
      const response = await privateHttpClient.get<any>(`${BASE_PATH}/devices`);
      return respondOk(response);
    } catch (e) {
      return handleError("Failed to fetch devices", ErrorCode.SERVER_ERROR);
    }
  },

  /** Revoke a specific device/session by ID */
  async revokeDevice(deviceId: string): Promise<ApiResponse<void>> {
    if (!deviceId) return handleError("Device ID is required", ErrorCode.VALIDATION_ERROR);
    try {
      const response = await privateHttpClient.delete<void>(`${BASE_PATH}/devices/${deviceId}`);
      return respondOk(response);
    } catch (e) {
      return handleError(`Failed to revoke device ${deviceId}`, ErrorCode.SERVER_ERROR);
    }
  },

  /** Revoke all sessions/devices */
  async revokeAllSessions(): Promise<ApiResponse<void>> {
    try {
      const response = await privateHttpClient.delete<void>(`${BASE_PATH}/devices`);
      return respondOk(response);
    } catch (e) {
      return handleError("Failed to revoke all sessions", ErrorCode.SERVER_ERROR);
    }
  }
};
