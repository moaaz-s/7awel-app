import { httpClient } from './http-client';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalAny: any = global;

describe('HttpClient', () => {
  beforeEach(() => {
    // Reset singleton state
    httpClient.clearToken();
    httpClient.initInterceptors(async () => {});
    httpClient.setRetryOptions(1, 0);
    // Mock fetch
    globalAny.fetch = vi.fn();
  });

  it('returns data when GET succeeds first try', async () => {
    const mockData = { foo: 'bar' };
    globalAny.fetch.mockResolvedValueOnce({ ok: true, json: async () => mockData });
    httpClient.setToken('token');
    const result = await httpClient.get('/test');
    expect(result).toEqual(mockData);
    expect(globalAny.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries once on 401 then succeeds', async () => {
    const mockData = { foo: 'baz' };
    const onAuthError = vi.fn(async () => {
      httpClient.setToken('new-token');
    });
    httpClient.initInterceptors(onAuthError);
    httpClient.setToken('old-token');
    globalAny.fetch
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: true, json: async () => mockData });
    const result = await httpClient.get('/retry');
    expect(result).toEqual(mockData);
    expect(onAuthError).toHaveBeenCalledTimes(1);
    expect(globalAny.fetch).toHaveBeenCalledTimes(2);
  });

  it('throws if GET fails after retry', async () => {
    const onAuthError = vi.fn(async () => {
      httpClient.setToken('new-token');
    });
    httpClient.initInterceptors(onAuthError);
    httpClient.setToken('old-token');
    globalAny.fetch
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: false, status: 403 });
    await expect(httpClient.get('/fail')).rejects.toThrow('HTTP 403');
    expect(onAuthError).toHaveBeenCalledTimes(1);
    expect(globalAny.fetch).toHaveBeenCalledTimes(2);
  });

  it('calls onAuthError only once for concurrent GETs', async () => {
    const onAuthError = vi.fn(async () => {
      // simulate delay
      await new Promise(res => setTimeout(res, 10));
      httpClient.setToken('refreshed');
    });
    httpClient.initInterceptors(onAuthError);
    httpClient.setToken('old');
    const responses = [
      { ok: false, status: 401 },
      { ok: false, status: 401 },
      { ok: true, json: async () => ({ a: 1 }) },
      { ok: true, json: async () => ({ b: 2 }) },
    ];
    globalAny.fetch.mockImplementation(() => {
      const resp = responses.shift();
      return Promise.resolve(resp);
    });
    const p1 = httpClient.get('/c1');
    const p2 = httpClient.get('/c2');
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual({ a: 1 });
    expect(r2).toEqual({ b: 2 });
    expect(onAuthError).toHaveBeenCalledTimes(1);
  });

  it('respects retry options', async () => {
    httpClient.setRetryOptions(2, 0);
    const onAuthError = vi.fn(async () => {
      httpClient.setToken('rt');
    });
    httpClient.initInterceptors(onAuthError);
    httpClient.setToken('t');
    globalAny.fetch
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ x: 5 }) });
    const res = await httpClient.get('/r');
    expect(res).toEqual({ x: 5 });
    expect(onAuthError).toHaveBeenCalledTimes(1);
    expect(globalAny.fetch).toHaveBeenCalledTimes(3);
  });

  it('supports POST with retry', async () => {
    const mockData = { post: true };
    const onAuthError = vi.fn(async () => {
      httpClient.setToken('nt');
    });
    httpClient.initInterceptors(onAuthError);
    httpClient.setToken('ot');
    globalAny.fetch
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: true, json: async () => mockData });
    const result = await httpClient.post('/post', { a: 1 });
    expect(result).toEqual(mockData);
    expect(onAuthError).toHaveBeenCalled();
    expect(globalAny.fetch).toHaveBeenCalledTimes(2);
  });
});
