import { 
    ApiResponse, 
    CheckAvailabilityResponse,
    OtpInitiationResponse,
    TokenAcquisitionResponse 
} from "@/types"
import { HttpClient, ENDPOINTS } from "./base"
import { OTP_CHANNEL } from "@/context/auth/auth-types"

export class PublicHttpClient extends HttpClient {
    constructor() {
      super(true)
    }
  
    public async checkAvailability(medium: "phone" | "email", value: string): Promise<ApiResponse<CheckAvailabilityResponse>> {
      return this.get(ENDPOINTS.AUTH.CHECK_AVAILABILITY.url, { medium, value })
    }
  
    public async sendOtp(medium: "phone" | "email", value: string, channel: OTP_CHANNEL = OTP_CHANNEL.WHATSAPP, checkIfClaimed: boolean = false): Promise<ApiResponse<OtpInitiationResponse>> {
      return this.post(ENDPOINTS.AUTH.SEND_OTP.url, { medium, value, channel, checkIfClaimed })
    }
  
    public async verifyOtp(medium: "phone" | "email", value: string, otp: string): Promise<ApiResponse<boolean>> {
      return this.post(ENDPOINTS.AUTH.VERIFY_OTP.url, { medium, value, otp })
    }

    public async acquireToken(medium: "phone" | "email", value: string, otp: string): Promise<ApiResponse<TokenAcquisitionResponse>> {
      return this.post(ENDPOINTS.AUTH.ACQUIRE_TOKEN.url, { medium, value, otp })
    }
  
    public async refresh(): Promise<ApiResponse<TokenAcquisitionResponse>> {
      return this.post(ENDPOINTS.AUTH.REFRESH.url, {})
    }

    // TODO: Should be moved to the private http client. 
    public async logout(): Promise<ApiResponse<void>> {
      return this.post(ENDPOINTS.AUTH.LOGOUT.url, {})
    }
  }

export const publicHttpClient = new PublicHttpClient();