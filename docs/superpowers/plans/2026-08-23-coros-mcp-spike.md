# COROS MCP Validation Spike Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, disposable script that proves (or disproves) whether a custom backend client can authenticate against `https://mcp.coros.com/mcp` once via browser and then reuse the session — refreshing tokens and calling tools — with zero further human interaction, before any production code is written.

**Architecture:** A small Node/TypeScript CLI outside `apps/api`, using the official `@modelcontextprotocol/sdk` with `StreamableHTTPClientTransport` and a custom `OAuthClientProvider`. Two entry points: `connect.ts` (one-time interactive authorization) and `query.ts` (unattended: load persisted tokens, refresh if needed, call 4 COROS MCP tools, save the raw JSON responses as fixtures).

**Tech Stack:** Node.js + TypeScript, `@modelcontextprotocol/sdk`, `tsx` (run TS directly, no build step), `vitest` (unit tests for the token store only — the OAuth/network parts are validated by manual execution, not unit tests, since they depend on a live external service and a human browser action).

## Global Constraints

- Lives entirely under `scripts/coros-mcp-spike/` — does not touch `apps/api` or `apps/web`, and does not modify the Prisma schema (per spec: "Fase 0 — gate antes de Fase 1", no production changes until the spike succeeds).
- Never commit tokens, client secrets, or the `.coros-spike-store/` directory — must be gitignored (per spec "Seguridad": no hardcoded credentials).
- Uses the official MCP TypeScript SDK (`@modelcontextprotocol/sdk`), not a hand-rolled OAuth implementation (per spec: "SDK oficial de MCP (TypeScript)").
- Success criterion (per spec, verbatim): running the query step in a **second, independent process invocation, without opening a browser**, must successfully refresh the session and call `queryDailyHealthData`, `querySleepData`, `querySleepHrv`, `queryRestingHeartRate` for yesterday's date.
- The final task must record the outcome (success or failure, with details) back into `docs/superpowers/specs/2026-08-23-coros-integration-design.md` — this is the artifact that gates whether Phase 1 planning proceeds with MCP or falls back to another access path.

---

### Task 1: Scaffold the spike project

**Files:**
- Create: `scripts/coros-mcp-spike/package.json`
- Create: `scripts/coros-mcp-spike/tsconfig.json`
- Create: `scripts/coros-mcp-spike/.gitignore`
- Create: `scripts/coros-mcp-spike/src/config.ts`

**Interfaces:**
- Produces: `MCP_URL: string`, `STORE_DIR: string`, `CALLBACK_PORT: number` constants exported from `src/config.ts`, consumed by every later task.

- [ ] **Step 1: Create the package manifest**

```json
{
  "name": "coros-mcp-spike",
  "private": true,
  "type": "module",
  "version": "0.0.0",
  "scripts": {
    "connect": "tsx src/connect.ts",
    "query": "tsx src/query.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.13.0",
    "open": "^10.1.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "@types/node": "^22.7.0"
  }
}
```

- [ ] **Step 2: Create the TypeScript config**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create the gitignore**

```
node_modules/
dist/
.coros-spike-store/
fixtures/*.json
```

- [ ] **Step 4: Create the shared config module**

```typescript
// scripts/coros-mcp-spike/src/config.ts
import path from "node:path";

export const MCP_URL = "https://mcp.coros.com/mcp";
export const STORE_DIR = path.resolve(import.meta.dirname, "..", ".coros-spike-store");
export const FIXTURES_DIR = path.resolve(import.meta.dirname, "..", "fixtures");
export const CALLBACK_PORT = 8090;
export const CALLBACK_URL = `http://localhost:${CALLBACK_PORT}/callback`;
```

- [ ] **Step 5: Install dependencies**

Run: `cd scripts/coros-mcp-spike && npm install`
Expected: `node_modules/` created, no errors. If `@modelcontextprotocol/sdk@^1.13.0` doesn't resolve, run `npm view @modelcontextprotocol/sdk versions --json` and install the latest `^1.x` available instead.

- [ ] **Step 6: Commit**

```bash
git add scripts/coros-mcp-spike/package.json scripts/coros-mcp-spike/tsconfig.json scripts/coros-mcp-spike/.gitignore scripts/coros-mcp-spike/src/config.ts
git commit -m "chore(coros-spike): scaffold MCP validation spike project"
```

---

### Task 2: Token store (the only unit-testable part of this spike)

**Files:**
- Create: `scripts/coros-mcp-spike/src/token-store.ts`
- Test: `scripts/coros-mcp-spike/src/token-store.test.ts`

**Interfaces:**
- Consumes: nothing from prior tasks (only Node's `fs`/`path`).
- Produces: `createTokenStore(storeDir: string): TokenStore` where
  ```typescript
  interface StoredTokens {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    obtained_at: number;
    [key: string]: unknown;
  }
  interface StoredClientInfo {
    client_id: string;
    client_secret?: string;
    [key: string]: unknown;
  }
  interface TokenStore {
    saveTokens(tokens: StoredTokens): Promise<void>;
    loadTokens(): Promise<StoredTokens | undefined>;
    saveClientInfo(info: StoredClientInfo): Promise<void>;
    loadClientInfo(): Promise<StoredClientInfo | undefined>;
  }
  ```
  Consumed by Task 3 (`connect.ts`) and Task 4 (`query.ts`).

- [ ] **Step 1: Write the failing tests**

```typescript
// scripts/coros-mcp-spike/src/token-store.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd scripts/coros-mcp-spike && npx vitest run src/token-store.test.ts`
Expected: FAIL — `Cannot find module './token-store.js'`

- [ ] **Step 3: Write the implementation**

```typescript
// scripts/coros-mcp-spike/src/token-store.ts
import { promises as fs } from "node:fs";
import path from "node:path";

export interface StoredTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  obtained_at: number;
  [key: string]: unknown;
}

export interface StoredClientInfo {
  client_id: string;
  client_secret?: string;
  [key: string]: unknown;
}

export interface TokenStore {
  saveTokens(tokens: StoredTokens): Promise<void>;
  loadTokens(): Promise<StoredTokens | undefined>;
  saveClientInfo(info: StoredClientInfo): Promise<void>;
  loadClientInfo(): Promise<StoredClientInfo | undefined>;
}

async function readJsonFile<T>(filePath: string): Promise<T | undefined> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw err;
  }
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function createTokenStore(storeDir: string): TokenStore {
  const tokensFile = path.join(storeDir, "tokens.json");
  const clientFile = path.join(storeDir, "client.json");

  return {
    saveTokens: (tokens) => writeJsonFile(tokensFile, tokens),
    loadTokens: () => readJsonFile<StoredTokens>(tokensFile),
    saveClientInfo: (info) => writeJsonFile(clientFile, info),
    loadClientInfo: () => readJsonFile<StoredClientInfo>(clientFile),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd scripts/coros-mcp-spike && npx vitest run src/token-store.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/coros-mcp-spike/src/token-store.ts scripts/coros-mcp-spike/src/token-store.test.ts
git commit -m "feat(coros-spike): add token store with round-trip tests"
```

---

### Task 3: OAuth provider + one-time interactive connect script

**Files:**
- Create: `scripts/coros-mcp-spike/src/oauth-provider.ts`
- Create: `scripts/coros-mcp-spike/src/callback-server.ts`
- Create: `scripts/coros-mcp-spike/src/connect.ts`

**Interfaces:**
- Consumes: `createTokenStore` from Task 2 (`./token-store.js`); `MCP_URL`, `STORE_DIR`, `CALLBACK_PORT`, `CALLBACK_URL` from Task 1 (`./config.js`).
- Produces: `createCorosOAuthProvider(store: TokenStore): OAuthClientProvider` (SDK-defined interface, from `@modelcontextprotocol/sdk/client/auth.js`), consumed by Task 4. `waitForCallback(port: number): Promise<{ code: string; state: string | null }>` from `callback-server.ts`, consumed by `connect.ts`.

- [ ] **Step 1: Inspect the installed SDK's actual auth interface before writing code**

The exact shape of `OAuthClientProvider` can drift between SDK versions. Before writing `oauth-provider.ts`, run:

```bash
cd scripts/coros-mcp-spike
node -e "console.log(require.resolve('@modelcontextprotocol/sdk/client/auth.js'))" 2>/dev/null || find node_modules/@modelcontextprotocol/sdk -iname "auth.d.ts"
```

Open the resulting `auth.d.ts` and confirm the `OAuthClientProvider` interface members (expected: `redirectUrl`, `clientMetadata`, `clientInformation`, `saveClientInformation`, `tokens`, `saveTokens`, `redirectToAuthorization`, `codeVerifier`, `saveCodeVerifier`, optionally `state`). If any member name below doesn't match what you find, adjust Step 2's code to match the installed version — the installed types are the source of truth, not this plan.

- [ ] **Step 2: Implement the callback server**

```typescript
// scripts/coros-mcp-spike/src/callback-server.ts
import http from "node:http";

export function waitForCallback(port: number): Promise<{ code: string; state: string | null }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${port}`);
      if (url.pathname !== "/callback") {
        res.writeHead(404).end();
        return;
      }
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!code) {
        res.writeHead(400).end("Missing ?code in callback");
        server.close();
        reject(new Error("OAuth callback did not include a code"));
        return;
      }
      res.writeHead(200, { "Content-Type": "text/plain" }).end("Authorized. You can close this tab.");
      server.close();
      resolve({ code, state });
    });
    server.listen(port);
  });
}
```

- [ ] **Step 3: Implement the OAuth client provider**

```typescript
// scripts/coros-mcp-spike/src/oauth-provider.ts
import open from "open";
import type { TokenStore } from "./token-store.js";
import { CALLBACK_URL } from "./config.js";

let pendingCodeVerifier: string | undefined;

export function createCorosOAuthProvider(store: TokenStore) {
  return {
    get redirectUrl() {
      return CALLBACK_URL;
    },
    get clientMetadata() {
      return {
        redirect_uris: [CALLBACK_URL],
        client_name: "RecoveryOS COROS Spike",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      };
    },
    async clientInformation() {
      return store.loadClientInfo();
    },
    async saveClientInformation(info: { client_id: string; client_secret?: string }) {
      await store.saveClientInfo(info);
    },
    async tokens() {
      const stored = await store.loadTokens();
      if (!stored) return undefined;
      return {
        access_token: stored.access_token,
        refresh_token: stored.refresh_token,
        token_type: "Bearer",
      };
    },
    async saveTokens(tokens: { access_token: string; refresh_token?: string; expires_in?: number }) {
      await store.saveTokens({ ...tokens, obtained_at: Date.now() });
    },
    async redirectToAuthorization(authorizationUrl: URL) {
      console.log(`Opening browser for COROS authorization:\n${authorizationUrl.toString()}\n`);
      await open(authorizationUrl.toString());
    },
    async saveCodeVerifier(codeVerifier: string) {
      pendingCodeVerifier = codeVerifier;
    },
    async codeVerifier() {
      if (!pendingCodeVerifier) throw new Error("No code verifier saved — did authorization start?");
      return pendingCodeVerifier;
    },
  };
}
```

- [ ] **Step 4: Implement the one-time connect script**

```typescript
// scripts/coros-mcp-spike/src/connect.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import { MCP_URL, STORE_DIR, CALLBACK_PORT } from "./config.js";
import { createTokenStore } from "./token-store.js";
import { createCorosOAuthProvider } from "./oauth-provider.js";
import { waitForCallback } from "./callback-server.js";

async function main() {
  const store = createTokenStore(STORE_DIR);
  const authProvider = createCorosOAuthProvider(store);
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), { authProvider });
  const client = new Client({ name: "recoveryos-coros-spike", version: "0.0.0" }, { capabilities: {} });

  try {
    await client.connect(transport);
    console.log("Already authorized — connected without a browser prompt.");
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) throw error;
    console.log(`Waiting for you to authorize in the browser (listening on port ${CALLBACK_PORT})...`);
    const { code } = await waitForCallback(CALLBACK_PORT);
    await transport.finishAuth(code);
    await client.connect(transport);
    console.log("Authorization complete, connected to COROS MCP.");
  }

  const tools = await client.listTools();
  console.log(`Connected. Server exposes ${tools.tools.length} tools.`);
  await client.close();
}

main().catch((err) => {
  console.error("connect.ts failed:", err);
  process.exit(1);
});
```

- [ ] **Step 5: Run it and authorize manually**

Run: `cd scripts/coros-mcp-spike && npm run connect`
Expected: a browser window opens to a COROS login/authorization page. Log in with your personal COROS account and approve access. The terminal should print "Authorization complete, connected to COROS MCP." and a tool count. If `client.listTools()` or the SDK import paths don't match (e.g. `UnauthorizedError` isn't exported from `client/auth.js` in the installed version), fix the import based on what Step 1 of this task found in the installed `.d.ts` files, then re-run.

- [ ] **Step 6: Commit**

```bash
git add scripts/coros-mcp-spike/src/oauth-provider.ts scripts/coros-mcp-spike/src/callback-server.ts scripts/coros-mcp-spike/src/connect.ts
git commit -m "feat(coros-spike): add one-time interactive OAuth connect script"
```

---

### Task 4: Unattended query script — the actual feasibility test

**Files:**
- Create: `scripts/coros-mcp-spike/src/query.ts`

**Interfaces:**
- Consumes: `createTokenStore` (Task 2), `createCorosOAuthProvider` (Task 3), `MCP_URL`, `STORE_DIR`, `FIXTURES_DIR` (Task 1).
- Produces: JSON fixture files under `scripts/coros-mcp-spike/fixtures/`, consumed by whoever designs `CorosMapper` in the Phase 1 plan (not part of this plan).

- [ ] **Step 1: Implement the query script**

```typescript
// scripts/coros-mcp-spike/src/query.ts
import { promises as fs } from "node:fs";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { MCP_URL, STORE_DIR, FIXTURES_DIR } from "./config.js";
import { createTokenStore } from "./token-store.js";
import { createCorosOAuthProvider } from "./oauth-provider.js";

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

const TOOL_CALLS: Array<{ name: string; args: Record<string, unknown> }> = [
  { name: "queryDailyHealthData", args: { date: yesterday() } },
  { name: "querySleepData", args: { date: yesterday() } },
  { name: "querySleepHrv", args: { date: yesterday() } },
  { name: "queryRestingHeartRate", args: { startDate: yesterday(), endDate: yesterday() } },
];

async function main() {
  const store = createTokenStore(STORE_DIR);
  const existing = await store.loadTokens();
  if (!existing) {
    throw new Error("No stored tokens found. Run `npm run connect` first (interactively) before running query.ts.");
  }

  const authProvider = createCorosOAuthProvider(store);
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), { authProvider });
  const client = new Client({ name: "recoveryos-coros-spike", version: "0.0.0" }, { capabilities: {} });

  console.log("Connecting without opening a browser (this is the actual feasibility test)...");
  await client.connect(transport);
  console.log("Connected without human interaction. Session/refresh reuse works.");

  await fs.mkdir(FIXTURES_DIR, { recursive: true });

  for (const call of TOOL_CALLS) {
    console.log(`Calling ${call.name}(${JSON.stringify(call.args)})...`);
    try {
      const result = await client.callTool({ name: call.name, arguments: call.args });
      const fixturePath = path.join(FIXTURES_DIR, `${call.name}.json`);
      await fs.writeFile(fixturePath, JSON.stringify(result, null, 2), "utf-8");
      console.log(`  saved -> ${fixturePath}`);
    } catch (err) {
      console.error(`  FAILED: ${call.name}:`, err);
    }
  }

  await client.close();
}

main().catch((err) => {
  console.error("query.ts failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Run the real feasibility test**

Run these as two genuinely separate process invocations (close the terminal or open a new one between them, to rule out any in-memory state leaking):

```bash
cd scripts/coros-mcp-spike && npm run connect
# ... authorize in the browser once ...
```

Then, in a fresh shell:

```bash
cd scripts/coros-mcp-spike && npm run query
```

Expected: `query.ts` prints "Connected without human interaction. Session/refresh reuse works." and produces 4 files under `scripts/coros-mcp-spike/fixtures/`. If it instead throws an `UnauthorizedError` or the SDK tries to open a browser again, that is a real, load-bearing result: it means the official COROS MCP does **not** support unattended reuse for a custom client the way it does for its listed interactive clients.

- [ ] **Step 3: Inspect the fixtures**

Read each of the 4 JSON files produced. Confirm they contain the expected fields (steps/calories for `queryDailyHealthData`, sleep score/duration/phases for `querySleepData`, HRV values for `querySleepHrv`, resting HR trend for `queryRestingHeartRate`) and not an error payload.

- [ ] **Step 4: Commit**

```bash
git add scripts/coros-mcp-spike/src/query.ts
git commit -m "feat(coros-spike): add unattended query script — the feasibility test"
```

(Do not commit the `fixtures/` directory or `.coros-spike-store/` — both are gitignored per Task 1, since fixtures may contain real personal health data and the store contains live tokens.)

---

### Task 5: Record the outcome in the design spec

**Files:**
- Modify: `docs/superpowers/specs/2026-08-23-coros-integration-design.md` (append a result to the "Fase 0" section)

**Interfaces:**
- Consumes: the result of Task 4, Step 2 (pass or fail, and any error details observed).
- Produces: an updated spec section that the (not-yet-written) Phase 1 implementation plan will depend on as its starting assumption.

- [ ] **Step 1: Append the outcome**

Open `docs/superpowers/specs/2026-08-23-coros-integration-design.md` and add a subsection immediately after "## Fase 0 — Spike de validación MCP (gate antes de Fase 1)":

If the unattended run in Task 4 succeeded:

```markdown
### Resultado del spike (completado)

**Éxito.** La segunda ejecución de `query.ts`, en un proceso independiente y sin abrir navegador, reutilizó el token/refresh persistido y llamó con éxito a `queryDailyHealthData`, `querySleepData`, `querySleepHrv` y `queryRestingHeartRate`. Fixtures guardadas localmente en `scripts/coros-mcp-spike/fixtures/` (no versionadas) para diseñar `CorosMapper` en la Fase 1.

**Decisión**: proceder con la Fase 1 tal como está diseñada, usando COROS MCP como fuente de datos.
```

If it failed:

```markdown
### Resultado del spike (completado)

**Fallo.** [Describe aquí el error real observado: p.ej. "el SDK relanzó UnauthorizedError y reabrió el navegador en la segunda ejecución" o "el refresh_token fue rechazado por el servidor con 401"]. Esto confirma la incertidumbre señalada en la sección C/I del informe original: COROS MCP no soporta sesión desatendida para un cliente propio.

**Decisión**: no proceder con MCP para el cron backend. Reevaluar entre (a) solicitar la API oficial de partners a api@coros.com, o (b) la vía no oficial basada en credenciales de Training Hub, antes de escribir el plan de Fase 1.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-08-23-coros-integration-design.md
git commit -m "docs: record COROS MCP spike outcome"
```
