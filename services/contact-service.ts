// services/contact-service.ts
import { privateHttpClient } from "@/services/httpClients/private";
import { isApiSuccess, handleError } from "@/utils/api-utils";
import { error as logError } from "@/utils/logger";
import type { ApiResponse, PaginatedWithTotal, Contact } from "@/types";
import { ErrorCode } from "@/types/errors";

const BASE_PATH = "/contacts";


export const contactService = {
    // TODO: Check if we have an endpoint for getting contacts.
    async getContacts(page?: number, limit?: number): Promise<ApiResponse<PaginatedWithTotal<Contact>>> {
        try {
            const params: Record<string, any> = {};
            if (page !== undefined) params.page = page;
            if (limit !== undefined) params.limit = limit;
            const resp = await privateHttpClient.getContacts(params);
            if (isApiSuccess(resp) && resp.data) return resp;
            return handleError("Failed to fetch contacts", ErrorCode.NETWORK_ERROR);
        } catch (e) {
            logError("[contactService] getContacts failed", e);
            return handleError("Failed to fetch contacts", e as any);
        }
    },

    async syncContacts(hashedPhones: string[]): Promise<ApiResponse<{ success: boolean }>> {
        if (!Array.isArray(hashedPhones) || !hashedPhones.length) {
            return handleError("Hashed phones array is required", ErrorCode.VALIDATION_ERROR);
        }
        try {
            const resp = await privateHttpClient.syncContacts(hashedPhones);
            if (isApiSuccess(resp) && resp.data) return resp;
            return handleError("Failed to sync contacts", ErrorCode.NETWORK_ERROR);
        } catch (e) {
            logError("[contactService] syncContacts failed", e);
            return handleError("Failed to sync contacts", e as any);
        }
    },

    async getRecentContacts(): Promise<ApiResponse<Contact[]>> {
        try {
            const resp = await privateHttpClient.getRecentContacts();
            if (isApiSuccess(resp) && resp.data) return resp;
            return handleError("Failed to fetch recent contacts", ErrorCode.NETWORK_ERROR);
        } catch (e) {
            logError("[contactService] getRecentContacts failed", e);
            return handleError("Failed to fetch recent contacts", e as any);
        }
    },

    async recordInteraction(contactId: string): Promise<ApiResponse<{ success: boolean }>> {
        if (!contactId) return handleError("Contact ID is required", ErrorCode.VALIDATION_ERROR);
        try {
            const resp = await privateHttpClient.recordInteraction(contactId);
            if (isApiSuccess(resp) && resp.data) return resp;
            return handleError("Failed to record interaction", ErrorCode.NETWORK_ERROR);
        } catch (e) {
            logError("[contactService] recordInteraction failed", e);
            return handleError("Failed to record interaction", e as any);
        }
    },

    async getFavoriteContacts(): Promise<ApiResponse<Contact[]>> {
        try {
            const resp = await privateHttpClient.getFavoriteContacts();
            if (isApiSuccess(resp) && resp.data) return resp;
            return handleError("Failed to fetch favorite contacts", ErrorCode.NETWORK_ERROR);
        } catch (e) {
            logError("[contactService] getFavoriteContacts failed", e);
            return handleError("Failed to fetch favorite contacts", e as any);
        }
    },

    async toggleFavorite(contactId: string): Promise<ApiResponse<{ success: boolean }>> {
        if (!contactId) return handleError("Contact ID is required", ErrorCode.VALIDATION_ERROR);
        try {
            const resp = await privateHttpClient.toggleFavorite(contactId);
            if (isApiSuccess(resp) && resp.data) return resp;
            return handleError("Failed to toggle favorite", ErrorCode.NETWORK_ERROR);
        } catch (e) {
            logError("[contactService] toggleFavorite failed", e);
            return handleError("Failed to toggle favorite", e as any);
        }
    },

    async importDeviceContacts(): Promise<ApiResponse<number>> {
        return handleError("importDeviceContacts handled in ContactRepository", ErrorCode.NOT_IMPLEMENTED);
    },
} as const;
