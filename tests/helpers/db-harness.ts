/**
 * tests/helpers/db-harness.ts
 *
 * Utilities to spin up and tear down an in-memory IndexedDB (browser) or SQLite
 * database (Capacitor / native) so unit & integration tests can exercise the
 * real data-layer implementations with zero external dependencies.
 */
import { afterAll, beforeAll } from "vitest";

// ---------------------------------------------------------------------------
// IndexedDB harness (browser)
// ---------------------------------------------------------------------------

let originalIndexedDB: IDBFactory | undefined;

export function setupIndexedDB() {
  beforeAll(async () => {
    // lazy-import to avoid bringing fake-indexeddb into prod bundle
    const { indexedDB: fakeIDB, IDBKeyRange } = await import("fake-indexeddb");
    originalIndexedDB = globalThis.indexedDB as IDBFactory | undefined;
    // @ts-expect-error 3rd-party shim types not perfect
    globalThis.indexedDB = fakeIDB;
    // @ts-expect-error shim
    globalThis.IDBKeyRange = IDBKeyRange;
  });

  afterAll(() => {
    if (originalIndexedDB) {
      globalThis.indexedDB = originalIndexedDB;
    }
  });
}

// ---------------------------------------------------------------------------
// SQLite harness (node)
// ---------------------------------------------------------------------------

import path from "path";
import { tmpdir } from "os";
import fs from "fs";

let sqliteDb: import("better-sqlite3").Database | null = null;
let sqlitePath: string | null = null;

export function setupSQLite() {
  beforeAll(async () => {
    const { default: BetterSqlite3 } = await import("better-sqlite3");
    sqlitePath = path.join(tmpdir(), `test-db-${Date.now()}.sqlite`);
    sqliteDb = new BetterSqlite3(sqlitePath);
    // If your SQLiteManager expects something else, expose via global
    // @ts-ignore
    globalThis.__TEST_SQLITE__ = sqliteDb;
  });

  afterAll(() => {
    if (sqliteDb) {
      sqliteDb.close();
      sqliteDb = null;
    }
    if (sqlitePath && fs.existsSync(sqlitePath)) {
      fs.unlinkSync(sqlitePath);
    }
  });
}
