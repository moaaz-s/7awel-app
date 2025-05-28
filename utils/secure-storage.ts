// utils/secure-storage.ts
// Unified wrapper that delegates to the platform implementation at runtime.
// The exported helpers are asynchronous to support Capacitor Preferences.

import { loadPlatform } from "@/platform/index"
import { info } from "@/utils/logger";

type Impl = {
  secureStoreSet: (k: string, v: string) => Promise<void> | void
  secureStoreGet: (k: string) => Promise<string | null> | string | null
  secureStoreRemove?: (k: string) => Promise<void> | void
}

let implPromise: Promise<Impl> | null = null

async function getImpl() {
  if (!implPromise) {
    try {
      implPromise = loadPlatform() as Promise<any>
      await implPromise // Verify the promise resolves
    } catch (error) {
      implPromise = null // Reset on error
      throw error
    }
  }
  return implPromise
}

export async function setItem(key: string, value: string) {
  try {
    const impl = await getImpl()
    info(`[secure-storage] setItem called. key=${key}, value=${value}, impl=${(impl as any)?.secureStoreSet?.name ?? 'fn'}`);
    await impl.secureStoreSet(key, value)
  } catch (error) {
    throw error
  }
}

export async function getItem(key: string): Promise<string | null> {
  try {
    const impl = await getImpl()
    info(`[secure-storage] getItem called. key=${key}`);
    const val = await impl.secureStoreGet(key)
    info(`[secure-storage] getItem returned. key=${key}, value=${val}`);
    return val
  } catch (error) {
    throw error
  }
}

export async function removeItem(key: string) {
  try {
    const impl = await getImpl()
    info(`[secure-storage] removeItem called. key=${key}`);
    if (impl.secureStoreRemove) {
      await impl.secureStoreRemove(key)
    } else {
      // Fallback to empty string to preserve behaviour on older impls
      await impl.secureStoreSet(key, "")
    }
  } catch (error) {
    throw error
  }
}

// For testing purposes only
export function _resetImpl() {
  implPromise = null
}
