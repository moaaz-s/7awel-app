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
  dateOfBirth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'errors.VALIDATION_DATE_FORMAT')
    .optional(),
  gender: z.enum(['male', 'female', 'other'])
    .optional(),
  lastUpdated: z.number()
    .positive('errors.VALIDATION_TIMESTAMP_INVALID'),
});

/**
 * Contact Schema
 */
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
  syncedAt: z.number()
    .positive('errors.VALIDATION_TIMESTAMP_INVALID'),
  hasAccount: z.boolean()
    .optional(),
});

/**
 * Transaction Schema
 */
export const transactionSchema = z.object({
  id: z.string()
    .min(1, 'errors.VALIDATION_ID_REQUIRED'),
  type: z.string(),
  amount: z.number()
    .positive('errors.VALIDATION_AMOUNT_INVALID'),
  currency: z.string()
    .length(3, 'errors.VALIDATION_CURRENCY_INVALID'),
  status: z.string(),
  createdAt: z.string()
    .datetime('errors.VALIDATION_DATETIME_INVALID'),
  recipientId: z.string()
    .optional(),
  senderId: z.string()
    .optional(),
  recipientName: z.string()
    .optional(),
  senderName: z.string()
    .optional(),
  note: z.string()
    .max(500, 'errors.VALIDATION_DESCRIPTION_TOO_LONG')
    .optional(),
  localOnly: z.boolean()
    .optional(),
  syncedAt: z.number()
    .positive('errors.VALIDATION_TIMESTAMP_INVALID'),
});

/**
 * Sync Metadata Schema
 */
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