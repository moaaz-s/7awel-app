// platform/index.ts
// Thin abstraction that dynamically imports the correct platform bundle.
// The choice is controlled at build time via Vite/Next.js env var `VITE_MOBILE`.
// Web build = tree‑shakes Capacitor away.

export async function loadPlatform() {
  // Detect Capacitor either by env flag set at build‑time (NEXT_PUBLIC_MOBILE) or by
  // the existence of the global Capacitor object exposed by the runtime.
  const isMobileBuild = process.env.NEXT_PUBLIC_MOBILE === "true"
  const hasCapacitorRuntime = typeof window !== "undefined" && Boolean((window as any).Capacitor)

  if (isMobileBuild || hasCapacitorRuntime) {
    return await import("./capacitor")
  }
  return await import("./web")
}
