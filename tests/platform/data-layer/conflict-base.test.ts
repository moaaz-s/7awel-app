import { describe, it, expect } from "vitest";
import { BaseRepository } from "@/platform/data-layer/repositories/base-repository";
import { BaseLocalDatabaseManager } from "@/platform/local-db/local-db-common";
import type { LocalDatabase, StoreName } from "@/platform/local-db/local-db-types";
import type { RepositoryOptions } from "@/platform/data-layer/repositories/base-repository";

// Minimal in-memory Local DB implementation ----------------------------------
class MemoryDB extends BaseLocalDatabaseManager {
  private store = new Map<string, any>();
  async init() { this.isInitialized = true; }
  key(store: StoreName, id: string) { return `${store}:${id}`; }
  async get<T extends StoreName>(s:T,k:string){return this.store.get(this.key(s,k));}
  async getAll<T extends StoreName>(s:T){const arr:LocalDatabase[T][]=[];for(const [k,v] of this.store.entries()){if(k.startsWith(`${s}:`)) arr.push(v);}return arr;}
  async set<T extends StoreName>(s:T,v:LocalDatabase[T]){this.store.set(this.key(s,(v as any).id),v);}
  async delete<T extends StoreName>(s:T,k:string){this.store.delete(this.key(s,k));}
  async clear<T extends StoreName>(s:T){for(const k of [...this.store.keys()]) if(k.startsWith(`${s}:`)) this.store.delete(k);} 
  async transaction<R>(){throw new Error("not implemented");}
}

const localDB = new MemoryDB();
const storageManager = { local: localDB } as any; // StorageManager shape for tests

// Dummy repository exposing resolveConflict -----------------------------------
class DummyRepo extends BaseRepository<'contacts'> {
  public callResolve(local:any, remote:any, opt?: RepositoryOptions){
    if(opt) (this as any).options = opt;
    // @ts-ignore protected
    return this.resolveConflict(local, remote);
  }
  constructor(opts?:RepositoryOptions){ super(storageManager,'contacts',opts); }
}

describe("BaseRepository.resolveConflict", () => {
  const local = { v: 1 };
  const remote = { v: 2 };

  it("remote default", () => {
    const repo = new DummyRepo();
    expect(repo.callResolve(local, remote)).toEqual(remote);
  });

  it("local-wins", () => {
    const repo = new DummyRepo({ conflictResolution:{ strategy:'local-wins' }} as any);
    expect(repo.callResolve(local, remote)).toEqual(local);
  });

  it("remote-wins", () => {
    const repo = new DummyRepo({ conflictResolution:{ strategy:'remote-wins' }} as any);
    expect(repo.callResolve(local, remote)).toEqual(remote);
  });

  it("merge with resolver", () => {
    const resolver = (l:any,r:any)=>({ ...l, merged:true });
    const repo = new DummyRepo({ conflictResolution:{ strategy:'merge', resolver }} as any);
    expect(repo.callResolve(local, remote)).toEqual({ v:1, merged:true });
  });
});

// -----------------------------------------------------------------------------
// BaseLocalDatabaseManager contract simple test
// -----------------------------------------------------------------------------

describe("BaseLocalDatabaseManager basic CRUD", () => {
  it("set/get/clear lifecycle", async () => {
    await localDB.set('contacts', { id:'c1', name:'Alice', phone:'+1', phoneHash:'h', isFavorite:false, syncedAt:0, initial:'A' } as any);
    const item = await localDB.get('contacts','c1');
    expect(item?.name).toBe('Alice');

    const all = await localDB.getAll('contacts');
    expect(all.length).toBe(1);

    await localDB.delete('contacts','c1');
    expect(await localDB.get('contacts','c1')).toBeUndefined();

    await localDB.set('contacts', { id:'c2', name:'Bob', phone:'+2', phoneHash:'h2', isFavorite:false, syncedAt:0, initial:'B' } as any);
    await localDB.clear('contacts');
    expect((await localDB.getAll('contacts')).length).toBe(0);
  });
});
