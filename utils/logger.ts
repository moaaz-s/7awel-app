// utils/logger.ts
// Simple logger wrapper. Avoid using console.log directly elsewhere – import functions from here.
// In production build these can be no-ops if desired.

/* eslint-disable no-console */
const enabled = typeof window === 'undefined' || process.env.NODE_ENV !== 'production'

function format(args: unknown[]) {
  return args
}

export function info(...args: unknown[]) {
  if (enabled) console.info(...format(args))
}
export function warn(...args: unknown[]) {
  if (enabled) console.warn(...format(args))
}
export function error(...args: unknown[]) {
  if (enabled) console.error(...format(args))
}
