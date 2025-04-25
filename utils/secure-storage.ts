// utils/secure-storage.ts
// Unified wrapper that delegates to the platform implementation at runtime.
// The exported helpers are asynchronous to support Capacitor Preferences.

import { loadPlatform } from "@/platform/index"

let implPromise: Promise<{
  secureStoreSet: (k: string, v: string) => Promise<void> | void
  secureStoreGet: (k: string) => Promise<string | null> | string | null
}> | null = null

async function getImpl() {
  if (!implPromise) {
    implPromise = loadPlatform() as Promise<any>
  }
  return implPromise
}

export async function setItem(key: string, value: string) {
  const impl = await getImpl()
  await impl.secureStoreSet(key, value)
}

export async function getItem(key: string): Promise<string | null> {
  const impl = await getImpl()
  return await impl.secureStoreGet(key)
}

export async function removeItem(key: string) {
  await setItem(key, "")
}
