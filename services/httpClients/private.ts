import { HttpClient, ENDPOINTS } from "./base";
import { getAuthToken } from "@/utils/token-service";
import type { ApiResponse, Paginated, PaginatedWithTotal, Transaction, CashOutResponse, AssetBalance, Contact, OtpInitiationResponse } from "@/types";
import type { SendMoneyRequest, RequestMoneyPayload, CashOutRequest } from "@/types";
import { LogEvent } from "@/platform/data-layer/types";
import { OTP_CHANNEL } from "@/context/auth/auth-types";

class PrivateHttpClient extends HttpClient {
  constructor() {
    super(false, getAuthToken); // auth required with token provider
  }

  /* ---------------- Auth --------------- */

  public async sendOtp(medium: "phone" | "email", value: string, channel: OTP_CHANNEL = OTP_CHANNEL.WHATSAPP, checkIfClaimed: boolean = false): Promise<ApiResponse<OtpInitiationResponse>> {
    return this.post(ENDPOINTS.AUTH.SEND_OTP.url, { medium, value, channel, checkIfClaimed })
  }

  public async verifyOtp(medium: "phone" | "email", value: string, otp: string): Promise<ApiResponse<boolean>> {
    return this.post(ENDPOINTS.AUTH.VERIFY_OTP.url, { medium, value, otp })
  }

  /* ---------------- Transactions --------------- */
  listTransactions(params: Record<string, string> = {}): Promise<ApiResponse<Paginated<Transaction>>> {
    return this.get(ENDPOINTS.TRANSACTIONS.GET_MANY.url, params);
  }

  getTransaction(id: string): Promise<ApiResponse<Transaction>> {
    return this.get(ENDPOINTS.TRANSACTIONS.GET_ONE.url.replace(":id", id));
  }

  sendMoney(body: SendMoneyRequest): Promise<ApiResponse<Transaction>> {
    return this.post(ENDPOINTS.TRANSACTIONS.SEND_MONEY.url, body);
  }

  requestMoney(body: RequestMoneyPayload): Promise<ApiResponse<void>> {
    return this.post(ENDPOINTS.TRANSACTIONS.REQUEST_MONEY.url, body);
  }

  cashOut(body: CashOutRequest): Promise<ApiResponse<CashOutResponse>> {
    return this.post(ENDPOINTS.TRANSACTIONS.CASH_OUT.url, body);
  }

  /* ---------------- Wallet --------------- */
  getBalances(): Promise<ApiResponse<AssetBalance[]>> {
    return this.get(ENDPOINTS.WALLET.BALANCES.url);
  }

  getBalance(): Promise<ApiResponse<AssetBalance>> {
    return this.get(ENDPOINTS.WALLET.BALANCE.url);
  }

  getBalanceOf(symbol: string): Promise<ApiResponse<AssetBalance>> {
    return this.get(ENDPOINTS.WALLET.BALANCE_OF.url.replace(":symbol", symbol));
  }

  getFeePayer(): Promise<ApiResponse<{ feePayer: string }>> {
    return this.get(ENDPOINTS.WALLET.GET_FEE_PAYER.url);
  }

  submitStablecoinTransaction(userSignedTransaction: string): Promise<ApiResponse<{
    signature?: string;
  }>> {
    return this.post(ENDPOINTS.WALLET.SUBMIT_STABLECOIN_TRANSACTION.url, {
      userSignedTransaction,
    });
  }

  createUserWallet(): Promise<ApiResponse<{ walletAddress: string }>> {
    return this.post(ENDPOINTS.WALLET.CREATE_USER_WALLET.url, {});
  }

  /* ---------------- User --------------- */
  getUser(): Promise<ApiResponse<{ user: any; settings: any }>> {
    return this.get(ENDPOINTS.USER.GET_PROFILE.url);
  }

  updateUser(payload: Record<string, any>): Promise<ApiResponse<any>> {
    return this.put(ENDPOINTS.USER.UPDATE.url, payload);
  }

  updatePreferences(payload: Record<string, any>): Promise<ApiResponse<any>> {
    return this.put(ENDPOINTS.USER.PREFERENCES.url, payload);
  }

  /* ---------------- Contact --------------- */
  getContacts(params: { page?: number; limit?: number } = {}): Promise<ApiResponse<PaginatedWithTotal<Contact>>> {
    const strParams: Record<string, string> = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
    );
    return this.get(ENDPOINTS.CONTACTS.GET.url, strParams) as Promise<ApiResponse<PaginatedWithTotal<Contact>>>;
  }

  syncContacts(hashedPhones: string[]): Promise<ApiResponse<{ success: boolean }>> {
    return this.post(ENDPOINTS.CONTACTS.SYNC.url, { phones: hashedPhones });
  }

  getRecentContacts(): Promise<ApiResponse<Contact[]>> {
    return this.get(ENDPOINTS.CONTACTS.RECENT.url);
  }

  getFavoriteContacts(): Promise<ApiResponse<Contact[]>> {
    return this.get(ENDPOINTS.CONTACTS.FAVORITES.url);
  }

  recordInteraction(contactId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.post(ENDPOINTS.CONTACTS.INTERACTION.url.replace(":id", contactId), {});
  }

  toggleFavorite(contactId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.put(ENDPOINTS.CONTACTS.FAVORITE.url.replace(":id", contactId), {});
  }

  unFavorite(contactId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.delete(ENDPOINTS.CONTACTS.UNFAVORITE.url.replace(":id", contactId));
  }

  /******************** Logs ******************** */
  logEvent(event: LogEvent): Promise<ApiResponse<void>> {
    return this.post(ENDPOINTS.LOGS.SINGLE.url, event);
  }

  logEvents(events: LogEvent[]): Promise<ApiResponse<void>> {
    return this.post(ENDPOINTS.LOGS.BATCH.url, events);
  }
}

export const privateHttpClient = new PrivateHttpClient();
