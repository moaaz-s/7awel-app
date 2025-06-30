import { defineConfig } from "vitest/config"
import path from "path"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: [
      "tests/**/*.test.{ts,tsx}",
      "tests/**/*.spec.{ts,tsx}",
    ],
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      all: true,
      reporter: ["text", "html", "lcov"],
      thresholds: {
        global: {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
      },
    },
      
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
