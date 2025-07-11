// utils/logger.ts
// Simple logger wrapper. Avoid using console.log directly elsewhere – import functions from here.
// In production build these can be no-ops if desired.

import { APP_CONFIG } from "@/constants/app-config";

function format(args: unknown[]) {
  return args
}

function isEnabled() {
  /* eslint-disable no-console */
  return typeof window === 'undefined' || APP_CONFIG.FEATURES.DEBUG_LOGGING
}

export function info(...args: unknown[]) {
  if (isEnabled()) console.info(...format(args))
}
export function warn(...args: unknown[]) {
  if (isEnabled()) console.warn(...format(args))
}
export function error(...args: unknown[]) {
  if (isEnabled()) console.error(...format(args))
}
