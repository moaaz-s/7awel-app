/**
 * Sync related constants
 */
export const DB_NAME = '7awel-local-db';
export const DB_VERSION = 2; // Increment this when adding new stores

export const OFFLINE_SYNC_MAX_RETRIES = 3;
export const OFFLINE_QUEUE_SYNC_INTERVAL_MS = 30000; // 30 seconds

export const SYNC_STATUS_UPDATE_INTERVAL_MS = 5000; // 5 seconds

/**
 * Caching related constants
 */

// repository sync
export const USER_REPOSITORY_TTL_MS = 5 * 60 * 1000; // 5 minutes
