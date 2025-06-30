# Test Suite Overview

This folder contains **all non-UI tests** for the 7awel crypto-wallet code-base.  
Our goal is to reach **100 % coverage** across utilities, services, repositories and authentication logic while keeping the tests:

* **Realistic** – favour real implementations (local DB, API route-handlers, React Contexts) over heavy mocking.
* **Fast & deterministic** – each test runs in isolation, cleans up after itself and finishes in milliseconds.
* **Maintainable** – common helpers live in `tests/helpers` (coming soon) so specs stay focused on behaviour, not wiring.

---

## Why do we mock anything at all?
The guiding rule is: **mock only when the real dependency cannot run in the Node/JSDOM test environment or would make the test flaky**.  Currently two areas need lightweight stubbing:

| Dependency | Reason it can’t run as-is in Vitest | How we mock |
|------------|-------------------------------------|-------------|
| `secure-storage` wrapper (Capacitor Preferences / Web Secure Store) | Relies on native plugins that don’t exist in Node. | Inject an in-memory map that implements the same async interface. This keeps behaviour identical (async, key/value) without requiring a device or browser extension. |
| `pin-utils` cryptographic helpers (`hashPin`, `verifyPin`) | Use WebCrypto + PBKDF2 which is unavailable or painfully slow to polyfill in Node ≤ 18. | Replace with deterministic hash (`hash-<pin>`) so we can test lockout logic quickly. |

Everything else—IndexedDB, SQLite, API route handlers—will be exercised via **real implementations** using `fake-indexeddb`, `better-sqlite3`, and `next-test-api-route-handler` respectively.

---

## Folder layout

```
/tests
  ├─ utils/                 Unit tests for standalone utility modules
  │   ├─ pin-service.test.ts   ← uses small mocks described above
  │   ├─ secure-storage.test.ts
  │   └─ transaction-view-ui.test.tsx
  ├─ services/              (coming soon) integration tests hitting API + DB
  ├─ data-layer/            (coming soon) repository integration tests
  ├─ context/               (coming soon) AuthContext & DataContext tests
  └─ helpers/               Reusable setup/teardown helpers (DB, auth, etc.)
```

Continually revisit mocks: **if/when we introduce a polyfill or real environment for a currently mocked dependency, delete the mock and upgrade the test**. This README should be updated whenever those decisions change.
