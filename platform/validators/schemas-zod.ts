// Data validation schemas using Zod
import { z } from 'zod';

/**
 * User Profile Schema
 */
export const userProfileSchema = z.object({
  id: z.string()
    .min(1, 'errors.VALIDATION_ID_REQUIRED'),
  firstName: z.string()
    .min(1, 'errors.VALIDATION_FIRST_NAME_REQUIRED')
    .max(50, 'errors.VALIDATION_NAME_TOO_LONG'),
  lastName: z.string()
    .min(1, 'errors.VALIDATION_LAST_NAME_REQUIRED')
    .max(50, 'errors.VALIDATION_NAME_TOO_LONG'),
  email: z.string()
    .email('errors.VALIDATION_EMAIL_INVALID'),
  phone: z.string()
    .min(1, 'errors.VALIDATION_PHONE_REQUIRED')
    .regex(/^\+?[0-9]+$/, 'errors.VALIDATION_PHONE_INVALID'),
  avatar: z.string()
    .url('errors.VALIDATION_URL_INVALID')
    .optional(),
  country: z.string()
    .optional(),
  address: z.string()
    .max(200, 'errors.VALIDATION_ADDRESS_TOO_LONG')
    .optional(),
  dob: z.string()
    .regex(/^[\d]{4}-[\d]{2}-[\d]{2}$/, 'errors.VALIDATION_DATE_FORMAT')
    .optional(),
  gender: z.enum(['male', 'female', 'other'])
    .optional(),
  lastUpdated: z.number()
    .positive('errors.VALIDATION_TIMESTAMP_INVALID'),
});

/**
 * Contact Schema
 */
// Core Contact (shared between API and UI)
export const contactSchema = z.object({
  id: z.string()
    .min(1, 'errors.VALIDATION_ID_REQUIRED'),
  name: z.string()
    .min(1, 'errors.VALIDATION_NAME_REQUIRED')
    .max(100, 'errors.VALIDATION_NAME_TOO_LONG'),
  phone: z.string()
    .min(1, 'errors.VALIDATION_PHONE_REQUIRED'),
  phoneHash: z.string()
    .min(1, 'errors.VALIDATION_HASH_REQUIRED'),
  email: z.string()
    .email('errors.VALIDATION_EMAIL_INVALID')
    .optional(),
  avatar: z.string()
    .url('errors.VALIDATION_URL_INVALID')
    .optional(),
  lastInteraction: z.number()
    .positive('errors.VALIDATION_TIMESTAMP_INVALID')
    .optional(),
  isFavorite: z.boolean(),
  initial: z.string().length(1),
  syncedAt: z.number()
    .positive('errors.VALIDATION_TIMESTAMP_INVALID'),
  hasAccount: z.boolean()
    .optional(),
});

/**
 * Transaction Schema - Frontend-focused with backend integration
 */
export const transactionSchema = z.object({
  id: z.string()
    .min(1, 'errors.VALIDATION_ID_REQUIRED'),
  reference: z.string()
    .min(1, 'errors.VALIDATION_REFERENCE_REQUIRED'),
  senderId: z.string()
    .optional(),
  recipientId: z.string() 
    .optional(),
  // Frontend transaction types (user-friendly)
  type: z.enum(['transfer', 'deposit', 'withdraw']),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
  amount: z.number()
    .positive('errors.VALIDATION_AMOUNT_INVALID'),
  assetSymbol: z.string().length(3),
  fee: z.number()
    .nonnegative('errors.VALIDATION_FEE_INVALID')
    .optional(),
  note: z.string()
    .max(500, 'errors.VALIDATION_DESCRIPTION_TOO_LONG')
    .optional(),
  createdAt: z.string()
    .datetime('errors.VALIDATION_DATETIME_INVALID'),
  updatedAt: z.string()
    .datetime('errors.VALIDATION_DATETIME_INVALID'),
  completedAt: z.string()
    .datetime('errors.VALIDATION_DATETIME_INVALID')
    .optional(),
  
  // Hashed phone numbers for contact resolution (sent by backend)
  senderPhoneHash: z.string()
    .optional(),
  recipientPhoneHash: z.string()
    .optional(),

  senderName: z.string()
    .optional(),
  recipientName: z.string()
    .optional(),
  
  // Blockchain details (minimal - only what frontend needs)
  txHash: z.string()
    .optional(),
  confirmations: z.number()
    .nonnegative('errors.VALIDATION_CONFIRMATIONS_INVALID')
    .optional(),
  errorMessage: z.string()
    .optional(),
  
  // Local storage metadata
  localOnly: z.boolean()
    .optional(),
  syncedAt: z.number()
    .positive('errors.VALIDATION_TIMESTAMP_INVALID'),
});

/**
 * Sync Metadata Schema
 */

/**
 * Local Balance schema (asset balance plus metadata)
 */
/*
 * Promotion Schema
 */
export const promotionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  linkUrl: z.string().url(),
  backgroundColor: z.string().optional(),
});

/*
 * Log Event Schema
 */
export const logEventSchema = z.object({
  eventType: z.string().min(1),
  payload: z.unknown(),
  timestamp: z.number().positive(),
});

export const balanceSchema = z.object({
  id: z.string().min(1),
  symbol: z.string().min(1),
  amount: z.number(),
  fiatValue: z.number().optional(),
  lastUpdated: z.number().positive(),
});

export const syncMetadataSchema = z.object({
  id: z.string()
    .min(1, 'errors.VALIDATION_ID_REQUIRED'),
  lastSync: z.number()
    .nonnegative('errors.VALIDATION_TIMESTAMP_INVALID'),
  status: z.enum(['syncing', 'synced', 'error'])
});

// Type exports
export type UserProfile = z.infer<typeof userProfileSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type AssetBalance = z.infer<typeof balanceSchema>;
export type Promotion = z.infer<typeof promotionSchema>;
export type LogEvent = z.infer<typeof logEventSchema>;
export type SyncMetadata = z.infer<typeof syncMetadataSchema>;

/**
 * Create validators with translation support
 */
export function createValidators(t: (key: string) => string) {
  // Generic validation function factory
  const createValidator = <T>(schema: z.ZodSchema<T>) => {
    return (data: unknown): { success: boolean; data?: T; error?: string } => {
      try {
        const result = schema.parse(data);
        return { success: true, data: result };
      } catch (error) {
        if (error instanceof z.ZodError) {
          const firstError = error.errors[0];
          return { 
            success: false, 
            error: t(firstError.message) 
          };
        }
        return { success: false, error: t('errors.VALIDATION_FAILED') };
      }
    };
  };

  return {
    userProfile: {
      validate: createValidator<UserProfile>(userProfileSchema)
    },
    contact: {
      validate: createValidator<Contact>(contactSchema)
    },
    transaction: {
      validate: createValidator<Transaction>(transactionSchema)
    },
    syncMetadata: {
      validate: createValidator<SyncMetadata>(syncMetadataSchema)
    }
  };
}