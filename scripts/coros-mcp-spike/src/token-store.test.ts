import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir, platform } from "node:os";
import path from "node:path";
import { createTokenStore } from "./token-store.js";

describe("createTokenStore", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "coros-spike-test-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("returns undefined when no tokens have been saved", async () => {
    const store = createTokenStore(dir);
    expect(await store.loadTokens()).toBeUndefined();
  });

  it("round-trips saved tokens", async () => {
    const store = createTokenStore(dir);
    await store.saveTokens({ access_token: "abc", refresh_token: "xyz", obtained_at: 123 });
    expect(await store.loadTokens()).toEqual({ access_token: "abc", refresh_token: "xyz", obtained_at: 123 });
  });

  it("round-trips saved client info independently of tokens", async () => {
    const store = createTokenStore(dir);
    await store.saveClientInfo({ client_id: "client-1", client_secret: "secret-1" });
    expect(await store.loadClientInfo()).toEqual({ client_id: "client-1", client_secret: "secret-1" });
    expect(await store.loadTokens()).toBeUndefined();
  });

  it("overwrites previous tokens on save", async () => {
    const store = createTokenStore(dir);
    await store.saveTokens({ access_token: "first", obtained_at: 1 });
    await store.saveTokens({ access_token: "second", obtained_at: 2 });
    expect(await store.loadTokens()).toEqual({ access_token: "second", obtained_at: 2 });
  });

  it("creates token files with owner-only permissions", async () => {
    const store = createTokenStore(dir);
    await store.saveTokens({ access_token: "abc", obtained_at: 123 });
    const tokenFileStat = await stat(path.join(dir, "tokens.json"));
    // POSIX permission bits are only enforced on non-Windows filesystems
    if (platform() !== "win32") {
      expect(tokenFileStat.mode & 0o777).toBe(0o600);
    }
  });
});
