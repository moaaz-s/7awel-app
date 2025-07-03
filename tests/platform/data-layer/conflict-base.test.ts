import { describe, it, expect } from "vitest";
import { BaseRepository } from "@/platform/data-layer/repositories/base-repository";
import { MemoryDB } from "../../utils/memory-db";
import { RepositoryOptions } from "@/platform/data-layer/types";

// Use shared in-memory Local DB implementation for tests ----------------------
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
