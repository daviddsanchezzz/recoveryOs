# COROS Integration — Fase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the production COROS integration — OAuth connect flow, daily sync of steps/sleep/HRV/resting HR via COROS MCP, and a `CorosConnectCard` in the frontend — mirroring the existing Strava module's hexagonal architecture.

**Architecture:** A new `apps/api/src/modules/coros/` module (domain/application/infrastructure/presentation), a `CorosOAuthProvider` implementing the MCP SDK's `OAuthClientProvider` interface backed entirely by Postgres (not in-memory state, since OAuth flow steps span separate HTTP requests and possibly separate server instances), a `CorosMcpClient` wrapping `@modelcontextprotocol/sdk`'s `StreamableHTTPClientTransport`, a `CorosMapper` that regex-parses COROS's natural-language tool responses, and a daily `@nestjs/schedule` cron.

**Tech Stack:** NestJS, Prisma, `@modelcontextprotocol/sdk` (already validated in the Fase 0 spike), `@nestjs/schedule` (new dependency — no cron exists in the project yet).

**Spec:** `docs/superpowers/specs/2026-08-23-coros-integration-design.md` (Fase 1 section + spike outcome).

## Global Constraints

- Additive schema changes only — no destructive migrations (spec: "cambios aditivos, sin migraciones destructivas").
- Follow the exact hexagonal pattern used by `apps/api/src/modules/strava/`: `domain/*.entity.ts` + `domain/*-repository.port.ts` (port interface + string DI token in the same file), `application/use-cases/*.use-case.ts` (one `execute()` method, `@Injectable()`), `infrastructure/prisma-*.repository.ts`, `presentation/*.controller.ts`.
- Test file convention: `*.spec.ts`, colocated next to the file under test, run via Jest (`apps/api/jest.config.js`). Use-cases are unit-tested by instantiating directly with a hand-rolled mock port (`new UseCase(mockPort)` + `jest.fn()`), not `@nestjs/testing`'s `Test.createTestingModule`. Repositories are not unit-tested in this codebase (no existing precedent) — skip dedicated repo tests, consistent with Strava/Sleep.
- No new queue infrastructure. Sync errors are caught per data type (one failing tool call must not block the others) and recorded on `CorosToken.syncStatus`/`syncError`; a failed day is picked up by the next day's cron run (spec: "Manejo de errores").
- MVP scope: only yesterday/today data. Out of scope for this plan (Fase 2, per spec): COROS↔Strava activity dedup, full activity sync, Training Load, VO2 Max, historical backfill, FIT downloads.
- `CorosToken` gets the same protection level as `StravaToken` today (plaintext columns in the managed Postgres DB) — no new encryption introduced (spec: "Seguridad").
- Actual schema-sync workflow in this project (verified, not `prisma migrate dev`): edit `schema.prisma`, write a matching migration folder under `apps/api/prisma/migrations/<N>_<name>/migration.sql` for tracking, then run `npx prisma db push --skip-generate` to apply to the dev DB and `npx prisma generate` to refresh the client.

## Architecture decisions beyond the spec (read before Task 3)

The spec's "Estructura de módulo" section describes the module at a high level but doesn't address how COROS's MCP OAuth (Dynamic Client Registration + PKCE, one flow per user, no static `client_id`) maps onto a multi-user NestJS backend where the "connect" and "callback" HTTP requests can't share in-process memory. This was resolved by reading the actual installed `@modelcontextprotocol/sdk`'s `client/auth.js` and `client/streamableHttp.js` source (not guessed) — see Task 4 for the citations. Two decisions follow from that reading, both additive to the spec:

1. **`CorosOAuthClient`** — a new singleton table (`id` fixed to `"singleton"`) holding the `clientId`/`clientSecret` issued once by Dynamic Client Registration. DCR happens at most once ever (the first time anyone connects); every subsequent user's connect flow reuses the same registered client. This is unrelated to Strava's `StravaToken.stravaAthleteId`, which is a per-user static app credential model — COROS's flow is structurally different (public PKCE client, no static app-level secret).
2. **`CorosOAuthState`** — a new table (parallel to the existing generic `OAuthState` used by Strava, but with an extra `codeVerifier` column) because the MCP SDK's `auth()` orchestration generates the PKCE `codeVerifier` and (if the provider implements `state()`) the CSRF `state` in the *first* request (`GET /coros/connect`), but only reads them back in the *second*, separate request (`GET /coros/callback`) via `provider.codeVerifier()`. Reusing the plain `OAuthState` table would require adding a nullable `codeVerifier` column to it and touching Strava's flow; a parallel table avoids that.

## Task 1: Prisma schema — CorosToken, CorosOAuthClient, CorosOAuthState, and field additions

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/2_coros_integration/migration.sql`

**Interfaces:**
- Produces: `CorosToken`, `CorosOAuthClient`, `CorosOAuthState` Prisma models; `Activity.corosId`/`corosName`; `DailyHealthMetric.restingHeartRate`/`hrv`/`avgHeartRate`/`stressAvg`/`recoveryPct`; `SleepEntry.source`/`score` + `@@unique([userId, date, source])`; `User.corosToken` relation. Consumed by every later task via `PrismaService`/`@prisma/client` generated types.

- [ ] **Step 1: Add the new models and field additions to `schema.prisma`**

Add `corosToken CorosToken?` to the `User` model's relation list (next to the existing `stravaToken StravaToken?` line).

Add `corosId String? @unique` and `corosName String?` to `Activity`, right after the existing `stravaId`/`stravaName` fields:

```prisma
  stravaId   String? @unique // Strava activity ID — used for deduplication
  stravaName String? // activity name from Strava
  corosId    String? @unique // COROS activity ID — used for deduplication
  corosName  String? // activity name from COROS
```

Add the five new fields to `DailyHealthMetric`, right after `activeCalories`:

```prisma
  steps          Int      @default(0)
  activeCalories Int      @default(0)
  restingHeartRate Int? // bpm, from COROS
  hrv              Int? // ms, from COROS
  avgHeartRate     Int? // bpm, from COROS
  stressAvg        Int? // 0-100, from COROS
  recoveryPct      Int? // 0-100, from COROS
  source         String   @default("manual") // manual | apple_health | coros | garmin | mock
```

Add `source` and `score` to `SleepEntry`, plus a new `@@unique`:

```prisma
model SleepEntry {
  id        String   @id @default(cuid())
  userId    String
  date      DateTime
  durationH Float
  quality   Int // 1-5, manual entry only
  score     Int? // 0-100, from COROS — distinct from manual `quality`
  source    String   @default("manual") // manual | coros
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date, source])
  @@index([userId, date])
}
```

Add the three new models at the end of the file:

```prisma
// Issued once via COROS MCP Dynamic Client Registration (RFC 7591) and reused
// by every user's authorization flow — this is an app-level credential, not
// per-user (unlike CorosToken below).
model CorosOAuthClient {
  id           String   @id @default("singleton")
  clientId     String
  clientSecret String?
  createdAt    DateTime @default(now())
}

// Bridges the two separate HTTP requests of a single OAuth attempt (GET
// /coros/connect generates state+codeVerifier; GET /coros/callback needs both
// back to complete the PKCE token exchange). One-time use, short TTL.
model CorosOAuthState {
  state        String   @id
  userId       String
  codeVerifier String?
  expiresAt    DateTime
  createdAt    DateTime @default(now())

  @@index([expiresAt])
}

model CorosToken {
  id                   String    @id @default(cuid())
  userId               String    @unique
  accessToken          String
  refreshToken         String
  expiresAt            DateTime
  corosUserId          String?
  lastSyncAt           DateTime?
  lastSuccessfulSyncAt DateTime?
  lastAttemptAt        DateTime?
  syncStatus           String    @default("idle") // idle | syncing | success | error | reauth_required
  syncError            String?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
  user                 User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: Write the tracking migration SQL**

```sql
-- AlterTable
ALTER TABLE "Activity" ADD COLUMN "corosId" TEXT,
ADD COLUMN "corosName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Activity_corosId_key" ON "Activity"("corosId");

-- AlterTable
ALTER TABLE "DailyHealthMetric" ADD COLUMN "restingHeartRate" INTEGER,
ADD COLUMN "hrv" INTEGER,
ADD COLUMN "avgHeartRate" INTEGER,
ADD COLUMN "stressAvg" INTEGER,
ADD COLUMN "recoveryPct" INTEGER;

-- AlterTable
ALTER TABLE "SleepEntry" ADD COLUMN "score" INTEGER,
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';

-- CreateIndex
CREATE UNIQUE INDEX "SleepEntry_userId_date_source_key" ON "SleepEntry"("userId", "date", "source");

-- CreateTable
CREATE TABLE "CorosOAuthClient" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorosOAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorosOAuthState" (
    "state" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeVerifier" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorosOAuthState_pkey" PRIMARY KEY ("state")
);

-- CreateIndex
CREATE INDEX "CorosOAuthState_expiresAt_idx" ON "CorosOAuthState"("expiresAt");

-- CreateTable
CREATE TABLE "CorosToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "corosUserId" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'idle',
    "syncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorosToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CorosToken_userId_key" ON "CorosToken"("userId");

-- AddForeignKey
ALTER TABLE "CorosToken" ADD CONSTRAINT "CorosToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
```

- [ ] **Step 3: Apply the schema and regenerate the Prisma client**

Run: `cd apps/api && npx prisma db push --skip-generate && npx prisma generate`
Expected: `Your database is now in sync with your Prisma schema` and `Generated Prisma Client` with no errors.

- [ ] **Step 4: Verify nothing broke**

Run: `cd apps/api && npx tsc --noEmit`
Expected: no errors (confirms existing code referencing `DailyHealthMetric`/`SleepEntry`/`Activity` still compiles against the widened types).

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/2_coros_integration/migration.sql
git commit -m "feat(coros): add CorosToken, CorosOAuthClient, CorosOAuthState and health-metric fields"
```

---

## Task 2: Domain layer — CorosTokenEntity + CorosRepositoryPort

**Files:**
- Create: `apps/api/src/modules/coros/domain/coros-token.entity.ts`
- Create: `apps/api/src/modules/coros/domain/coros-repository.port.ts`

**Interfaces:**
- Consumes: nothing (pure domain types).
- Produces: `CorosTokenEntity` class, `CorosRepositoryPort` interface, `COROS_REPOSITORY` DI token. Consumed by every later task (Tasks 3, 6, 7, 8, 9, 10).

- [ ] **Step 1: Create the token entity**

```ts
// apps/api/src/modules/coros/domain/coros-token.entity.ts
export class CorosTokenEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public accessToken: string,
    public refreshToken: string,
    public expiresAt: Date,
    public corosUserId: string | null,
    public lastSyncAt: Date | null,
    public lastSuccessfulSyncAt: Date | null,
    public lastAttemptAt: Date | null,
    public syncStatus: string,
    public syncError: string | null,
  ) {}

  get isExpired(): boolean {
    return Date.now() >= this.expiresAt.getTime() - 60_000;
  }
}
```

- [ ] **Step 2: Create the repository port**

This single port covers three concerns (token CRUD, the app-level OAuth client, and per-attempt OAuth state) because all three are only ever touched by the COROS module — splitting them into separate ports would add indirection without a second consumer.

```ts
// apps/api/src/modules/coros/domain/coros-repository.port.ts
import { CorosTokenEntity } from './coros-token.entity';

export const COROS_REPOSITORY = 'COROS_REPOSITORY';

export interface CorosOAuthClientInfo {
  clientId: string;
  clientSecret: string | null;
}

export interface CorosRepositoryPort {
  // Token CRUD (mirrors StravaRepositoryPort)
  findTokenByUser(userId: string): Promise<CorosTokenEntity | null>;
  saveToken(
    userId: string,
    data: { accessToken: string; refreshToken: string; expiresAt: Date; corosUserId?: string | null },
  ): Promise<void>;
  updateSyncStatus(
    userId: string,
    data: { syncStatus: string; syncError?: string | null; lastAttemptAt?: Date; lastSuccessfulSyncAt?: Date },
  ): Promise<void>;
  deleteToken(userId: string): Promise<void>;
  findAllConnectedUserIds(): Promise<string[]>;

  // App-level OAuth client (Dynamic Client Registration result, shared by all users)
  getOAuthClient(): Promise<CorosOAuthClientInfo | null>;
  saveOAuthClient(clientId: string, clientSecret: string | null): Promise<void>;

  // Per-attempt OAuth state (bridges the /connect and /callback requests)
  createOAuthState(state: string, userId: string): Promise<void>;
  saveCodeVerifierForState(state: string, codeVerifier: string): Promise<void>;
  consumeOAuthState(state: string): Promise<{ userId: string; codeVerifier: string | null } | null>;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/coros/domain/
git commit -m "feat(coros): add domain entity and repository port"
```

---

## Task 3: PrismaCorosRepository

**Files:**
- Create: `apps/api/src/modules/coros/infrastructure/prisma-coros.repository.ts`

**Interfaces:**
- Consumes: `CorosRepositoryPort`, `CorosTokenEntity` (Task 2); `PrismaService` from `apps/api/src/shared/infrastructure/prisma/prisma.service.ts` (existing, used identically by `PrismaStravaRepository`).
- Produces: `PrismaCorosRepository` class implementing `CorosRepositoryPort`. Consumed by Task 10 (`coros.module.ts`) via `{ provide: COROS_REPOSITORY, useExisting: PrismaCorosRepository }`, matching the exact Strava binding pattern.

- [ ] **Step 1: Implement the repository**

```ts
// apps/api/src/modules/coros/infrastructure/prisma-coros.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { CorosTokenEntity } from '../domain/coros-token.entity';
import { CorosOAuthClientInfo, CorosRepositoryPort } from '../domain/coros-repository.port';

const OAUTH_CLIENT_ID = 'singleton';
const OAUTH_STATE_TTL_MS = 5 * 60 * 1000;

function toEntity(r: {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  corosUserId: string | null;
  lastSyncAt: Date | null;
  lastSuccessfulSyncAt: Date | null;
  lastAttemptAt: Date | null;
  syncStatus: string;
  syncError: string | null;
}): CorosTokenEntity {
  return new CorosTokenEntity(
    r.id, r.userId, r.accessToken, r.refreshToken, r.expiresAt, r.corosUserId,
    r.lastSyncAt, r.lastSuccessfulSyncAt, r.lastAttemptAt, r.syncStatus, r.syncError,
  );
}

@Injectable()
export class PrismaCorosRepository implements CorosRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findTokenByUser(userId: string): Promise<CorosTokenEntity | null> {
    const r = await this.prisma.corosToken.findUnique({ where: { userId } });
    return r ? toEntity(r) : null;
  }

  async saveToken(
    userId: string,
    data: { accessToken: string; refreshToken: string; expiresAt: Date; corosUserId?: string | null },
  ): Promise<void> {
    await this.prisma.corosToken.upsert({
      where: { userId },
      update: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        ...(data.corosUserId !== undefined ? { corosUserId: data.corosUserId } : {}),
      },
      create: {
        userId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        corosUserId: data.corosUserId ?? null,
      },
    });
  }

  async updateSyncStatus(
    userId: string,
    data: { syncStatus: string; syncError?: string | null; lastAttemptAt?: Date; lastSuccessfulSyncAt?: Date },
  ): Promise<void> {
    await this.prisma.corosToken.update({
      where: { userId },
      data: {
        syncStatus: data.syncStatus,
        syncError: data.syncError ?? null,
        lastSyncAt: new Date(),
        ...(data.lastAttemptAt ? { lastAttemptAt: data.lastAttemptAt } : {}),
        ...(data.lastSuccessfulSyncAt ? { lastSuccessfulSyncAt: data.lastSuccessfulSyncAt } : {}),
      },
    });
  }

  async deleteToken(userId: string): Promise<void> {
    await this.prisma.corosToken.deleteMany({ where: { userId } });
  }

  async findAllConnectedUserIds(): Promise<string[]> {
    const rows = await this.prisma.corosToken.findMany({ select: { userId: true } });
    return rows.map((r) => r.userId);
  }

  async getOAuthClient(): Promise<CorosOAuthClientInfo | null> {
    const r = await this.prisma.corosOAuthClient.findUnique({ where: { id: OAUTH_CLIENT_ID } });
    return r ? { clientId: r.clientId, clientSecret: r.clientSecret } : null;
  }

  async saveOAuthClient(clientId: string, clientSecret: string | null): Promise<void> {
    await this.prisma.corosOAuthClient.upsert({
      where: { id: OAUTH_CLIENT_ID },
      update: { clientId, clientSecret },
      create: { id: OAUTH_CLIENT_ID, clientId, clientSecret },
    });
  }

  async createOAuthState(state: string, userId: string): Promise<void> {
    await this.prisma.corosOAuthState.create({
      data: { state, userId, expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS) },
    });
  }

  async saveCodeVerifierForState(state: string, codeVerifier: string): Promise<void> {
    await this.prisma.corosOAuthState.update({ where: { state }, data: { codeVerifier } });
  }

  async consumeOAuthState(state: string): Promise<{ userId: string; codeVerifier: string | null } | null> {
    const record = await this.prisma.corosOAuthState.findUnique({ where: { state } });
    if (!record) return null;
    await this.prisma.corosOAuthState.delete({ where: { state } });
    if (record.expiresAt < new Date()) return null;
    return { userId: record.userId, codeVerifier: record.codeVerifier };
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/api && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/coros/infrastructure/prisma-coros.repository.ts
git commit -m "feat(coros): add PrismaCorosRepository"
```

---

## Task 4: CorosOAuthProvider — Postgres-backed `OAuthClientProvider`

This is the highest-risk file in the plan. Its shape is derived from reading the **installed** `@modelcontextprotocol/sdk`'s actual source (`scripts/coros-mcp-spike/node_modules/@modelcontextprotocol/sdk/dist/esm/client/auth.js` and `client/streamableHttp.js`), not assumed — the exact call order it depends on:

1. `client.connect(transport)` → transport gets a 401 from COROS → calls `auth(provider, { serverUrl, ... })` (no `authorizationCode`).
2. Inside `auth()`: `clientInformation = await provider.clientInformation()` — if `undefined`, performs Dynamic Client Registration and calls `provider.saveClientInformation(...)`.
3. Since there's no valid `refresh_token` yet, `auth()` calls `provider.state?.()` **first**, then `startAuthorization()` (generates the PKCE `codeVerifier` internally), then `provider.saveCodeVerifier(codeVerifier)`, **then** `provider.redirectToAuthorization(authorizationUrl)`, and finally returns `'REDIRECT'`.
4. Back in the transport, a non-`'AUTHORIZED'` result makes it throw `UnauthorizedError` — by the time that throw happens, `redirectToAuthorization` has already run.
5. Later, a **separate** request (`GET /coros/callback`) constructs a **fresh** transport/provider (the SDK's `StreamableHTTPClientTransport.start()` refuses to run twice — confirmed in the Fase 0 spike) and calls `transport.finishAuth(code)`, which calls `auth(provider, { serverUrl, authorizationCode: code, ... })`. This branch never calls `state()`/`redirectToAuthorization()` — it goes straight to `provider.clientInformation()` (must already hold the DCR result from step 2) and `provider.codeVerifier()` (must return the exact verifier saved in step 3), then `provider.saveTokens(tokens)`.

Because steps 3 and 5 are different HTTP requests, nothing about this can live in a module-level variable (as the disposable CLI spike did) — every piece must round-trip through `CorosRepositoryPort`.

**Files:**
- Create: `apps/api/src/modules/coros/infrastructure/coros-oauth-provider.ts`
- Test: `apps/api/src/modules/coros/infrastructure/coros-oauth-provider.spec.ts`

**Interfaces:**
- Consumes: `CorosRepositoryPort` (Task 2). `OAuthClientProvider`, `OAuthClientInformationMixed`, `OAuthClientMetadata`, `OAuthTokens` types from `@modelcontextprotocol/sdk` (already a dependency of `scripts/coros-mcp-spike`; Task 10 adds it to `apps/api`).
- Produces: `createCorosOAuthProvider(opts: CorosOAuthProviderOptions): OAuthClientProvider`. Consumed by Task 5 (`CorosMcpClient`).

- [ ] **Step 1: Write the provider**

```ts
// apps/api/src/modules/coros/infrastructure/coros-oauth-provider.ts
import { randomBytes } from 'node:crypto';
import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import { CorosRepositoryPort } from '../domain/coros-repository.port';

export interface CorosOAuthProviderOptions {
  userId: string;
  repo: CorosRepositoryPort;
  redirectUri: string;
  /** Invoked synchronously while the SDK builds the authorization URL — connect phase only. */
  onAuthorizationUrl?: (url: string) => void;
  /** Already-persisted PKCE verifier for this attempt — callback phase only. */
  knownCodeVerifier?: string;
}

export function createCorosOAuthProvider(opts: CorosOAuthProviderOptions): OAuthClientProvider {
  const { userId, repo, redirectUri, onAuthorizationUrl, knownCodeVerifier } = opts;
  let stateForThisAttempt: string | undefined;

  return {
    get redirectUrl() {
      return redirectUri;
    },
    get clientMetadata(): OAuthClientMetadata {
      return {
        redirect_uris: [redirectUri],
        client_name: 'RecoveryOS',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
      };
    },
    // Only called by auth() when starting a brand-new authorization (connect
    // phase) — never on the authorizationCode-present callback exchange.
    async state(): Promise<string> {
      stateForThisAttempt = randomBytes(32).toString('base64url');
      await repo.createOAuthState(stateForThisAttempt, userId);
      return stateForThisAttempt;
    },
    async clientInformation() {
      const info = await repo.getOAuthClient();
      if (!info) return undefined;
      return { client_id: info.clientId, client_secret: info.clientSecret ?? undefined } as OAuthClientInformationMixed;
    },
    async saveClientInformation(info: OAuthClientInformationMixed) {
      await repo.saveOAuthClient(info.client_id, info.client_secret ?? null);
    },
    async tokens() {
      const stored = await repo.findTokenByUser(userId);
      if (!stored) return undefined;
      return {
        access_token: stored.accessToken,
        refresh_token: stored.refreshToken,
        token_type: 'Bearer',
      } as OAuthTokens;
    },
    async saveTokens(tokens: OAuthTokens) {
      const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 86_400) * 1000);
      await repo.saveToken(userId, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? '',
        expiresAt,
      });
    },
    async redirectToAuthorization(authorizationUrl: URL) {
      onAuthorizationUrl?.(authorizationUrl.toString());
    },
    async saveCodeVerifier(codeVerifier: string) {
      if (!stateForThisAttempt) {
        throw new Error('saveCodeVerifier called before state() — unexpected SDK call order');
      }
      await repo.saveCodeVerifierForState(stateForThisAttempt, codeVerifier);
    },
    async codeVerifier() {
      if (!knownCodeVerifier) {
        throw new Error('No code verifier available on this provider instance — was it built for the callback phase?');
      }
      return knownCodeVerifier;
    },
  };
}
```

- [ ] **Step 2: Write the unit tests**

These test the provider's individual method contracts against a mock `CorosRepositoryPort`, without invoking the real SDK's `auth()` orchestration (which requires a live network call) — matching how `apps/api/src/modules/nutrition/application/use-cases/parse-meal.use-case.spec.ts` tests a port-consuming unit in isolation.

```ts
// apps/api/src/modules/coros/infrastructure/coros-oauth-provider.spec.ts
import { createCorosOAuthProvider } from './coros-oauth-provider';
import { CorosRepositoryPort } from '../domain/coros-repository.port';

function mockRepo(): jest.Mocked<CorosRepositoryPort> {
  return {
    findTokenByUser: jest.fn(),
    saveToken: jest.fn(),
    updateSyncStatus: jest.fn(),
    deleteToken: jest.fn(),
    findAllConnectedUserIds: jest.fn(),
    getOAuthClient: jest.fn(),
    saveOAuthClient: jest.fn(),
    createOAuthState: jest.fn(),
    saveCodeVerifierForState: jest.fn(),
    consumeOAuthState: jest.fn(),
  };
}

describe('createCorosOAuthProvider', () => {
  it('state() generates a state and persists it against the user before returning', async () => {
    const repo = mockRepo();
    const provider = createCorosOAuthProvider({ userId: 'user-1', repo, redirectUri: 'https://api.example.com/coros/callback' });

    const state = await provider.state!();

    expect(typeof state).toBe('string');
    expect(state.length).toBeGreaterThan(20);
    expect(repo.createOAuthState).toHaveBeenCalledWith(state, 'user-1');
  });

  it('saveCodeVerifier() attaches the verifier to the state generated by state()', async () => {
    const repo = mockRepo();
    const provider = createCorosOAuthProvider({ userId: 'user-1', repo, redirectUri: 'https://api.example.com/coros/callback' });

    const state = await provider.state!();
    await provider.saveCodeVerifier('verifier-abc');

    expect(repo.saveCodeVerifierForState).toHaveBeenCalledWith(state, 'verifier-abc');
  });

  it('saveCodeVerifier() throws if called before state()', async () => {
    const repo = mockRepo();
    const provider = createCorosOAuthProvider({ userId: 'user-1', repo, redirectUri: 'https://api.example.com/coros/callback' });

    await expect(provider.saveCodeVerifier('verifier-abc')).rejects.toThrow('unexpected SDK call order');
  });

  it('redirectToAuthorization() hands the URL to the onAuthorizationUrl callback instead of opening a browser', async () => {
    const repo = mockRepo();
    const captured: string[] = [];
    const provider = createCorosOAuthProvider({
      userId: 'user-1',
      repo,
      redirectUri: 'https://api.example.com/coros/callback',
      onAuthorizationUrl: (url) => captured.push(url),
    });

    await provider.redirectToAuthorization(new URL('https://mcpeu.coros.com/authorize?state=xyz'));

    expect(captured).toEqual(['https://mcpeu.coros.com/authorize?state=xyz']);
  });

  it('codeVerifier() returns the known verifier supplied at construction (callback phase)', async () => {
    const repo = mockRepo();
    const provider = createCorosOAuthProvider({
      userId: 'user-1',
      repo,
      redirectUri: 'https://api.example.com/coros/callback',
      knownCodeVerifier: 'stored-verifier',
    });

    await expect(provider.codeVerifier()).resolves.toBe('stored-verifier');
  });

  it('codeVerifier() throws when no known verifier was supplied (connect phase)', async () => {
    const repo = mockRepo();
    const provider = createCorosOAuthProvider({ userId: 'user-1', repo, redirectUri: 'https://api.example.com/coros/callback' });

    await expect(provider.codeVerifier()).rejects.toThrow('No code verifier available');
  });

  it('tokens()/saveTokens() round-trip through the repository, scoped to userId', async () => {
    const repo = mockRepo();
    repo.findTokenByUser.mockResolvedValue({
      id: 't1', userId: 'user-1', accessToken: 'stored-access', refreshToken: 'stored-refresh',
      expiresAt: new Date(), corosUserId: null, lastSyncAt: null, lastSuccessfulSyncAt: null,
      lastAttemptAt: null, syncStatus: 'idle', syncError: null, isExpired: false,
    } as never);
    const provider = createCorosOAuthProvider({ userId: 'user-1', repo, redirectUri: 'https://api.example.com/coros/callback' });

    const tokens = await provider.tokens();
    expect(tokens).toEqual({ access_token: 'stored-access', refresh_token: 'stored-refresh', token_type: 'Bearer' });

    await provider.saveTokens({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600, token_type: 'Bearer' });
    expect(repo.saveToken).toHaveBeenCalledWith('user-1', expect.objectContaining({ accessToken: 'new-access', refreshToken: 'new-refresh' }));
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `cd apps/api && npx jest coros-oauth-provider.spec.ts`
Expected: 7 tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/coros/infrastructure/coros-oauth-provider.ts apps/api/src/modules/coros/infrastructure/coros-oauth-provider.spec.ts
git commit -m "feat(coros): add Postgres-backed OAuthClientProvider for the MCP SDK"
```

---

## Task 5: CorosMcpClient — wraps the MCP SDK's `Client`/`StreamableHTTPClientTransport`

**Files:**
- Create: `apps/api/src/modules/coros/infrastructure/coros-mcp.client.ts`

**Interfaces:**
- Consumes: `createCorosOAuthProvider` (Task 4); `COROS_REPOSITORY`/`CorosRepositoryPort` (Task 2); `Client`, `StreamableHTTPClientTransport`, `UnauthorizedError` from `@modelcontextprotocol/sdk`.
- Produces: `CorosMcpClient` class with `getAuthorizationUrl(userId)`, `completeAuthorization(userId, code, codeVerifier)`, `callTool(userId, name, args)`. Consumed by Task 7 (`HandleCorosCallbackUseCase`) and Task 8 (`SyncCorosUseCase`).

No dedicated unit test for this file — like `StravaApiClient`, it's a thin network-boundary wrapper with no branching logic of its own; the actual risk (SDK call order, state/PKCE persistence) is already covered by Task 4's tests. `npx tsc --noEmit` in Step 2 is this task's verification.

- [ ] **Step 1: Implement the client**

```ts
// apps/api/src/modules/coros/infrastructure/coros-mcp.client.ts
import { Inject, Injectable } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { COROS_REPOSITORY, CorosRepositoryPort } from '../domain/coros-repository.port';
import { createCorosOAuthProvider } from './coros-oauth-provider';

// mcp.coros.com's protected-resource metadata redirects EU accounts to this
// regional endpoint (confirmed in the Fase 0 spike — see
// docs/superpowers/specs/2026-08-23-coros-integration-design.md). The SDK's
// RFC 8707 resource check rejects the mismatch if you connect to the
// non-regional URL, so this must point at the regional one directly.
const MCP_URL = process.env.COROS_MCP_URL ?? 'https://mcpeu.coros.com/mcp';
const CLIENT_INFO = { name: 'recoveryos', version: '1.0.0' } as const;

export interface CorosToolResult {
  text: string;
  isError: boolean;
}

@Injectable()
export class CorosMcpClient {
  constructor(@Inject(COROS_REPOSITORY) private readonly repo: CorosRepositoryPort) {}

  private get redirectUri(): string {
    const uri = process.env.COROS_REDIRECT_URI;
    if (!uri) throw new Error('COROS_REDIRECT_URI is not configured');
    return uri;
  }

  /**
   * Starts (or resumes) authorization for `userId`. Returns the URL the
   * user's browser must be redirected to, or `null` if already authorized
   * (existing tokens connected without needing a redirect).
   */
  async getAuthorizationUrl(userId: string): Promise<string | null> {
    let capturedUrl: string | null = null;
    const provider = createCorosOAuthProvider({
      userId,
      repo: this.repo,
      redirectUri: this.redirectUri,
      onAuthorizationUrl: (url) => {
        capturedUrl = url;
      },
    });
    const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), { authProvider: provider });
    const client = new Client(CLIENT_INFO, { capabilities: {} });

    try {
      await client.connect(transport);
      await client.close();
      return null;
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) throw error;
      if (!capturedUrl) throw new Error('COROS MCP did not produce an authorization URL');
      return capturedUrl;
    }
  }

  /**
   * Completes the OAuth flow after the user authorizes in their browser and
   * COROS redirects back with `code`. `codeVerifier` must be the one
   * persisted during `getAuthorizationUrl`'s call (looked up by `state` —
   * see Task 7's `HandleCorosCallbackUseCase`).
   */
  async completeAuthorization(userId: string, code: string, codeVerifier: string): Promise<void> {
    const exchangeProvider = createCorosOAuthProvider({
      userId,
      repo: this.repo,
      redirectUri: this.redirectUri,
      knownCodeVerifier: codeVerifier,
    });
    const exchangeTransport = new StreamableHTTPClientTransport(new URL(MCP_URL), { authProvider: exchangeProvider });
    await exchangeTransport.finishAuth(code);

    // finishAuth() only exchanges the code for tokens — StreamableHTTPClientTransport
    // refuses to start() twice on the same instance (confirmed in the Fase 0
    // spike), so confirming the tokens actually work requires a fresh
    // transport/client pair, exactly like connect.ts's retry.
    const verifyProvider = createCorosOAuthProvider({ userId, repo: this.repo, redirectUri: this.redirectUri });
    const verifyTransport = new StreamableHTTPClientTransport(new URL(MCP_URL), { authProvider: verifyProvider });
    const verifyClient = new Client(CLIENT_INFO, { capabilities: {} });
    await verifyClient.connect(verifyTransport);
    await verifyClient.close();
  }

  /**
   * Calls a single COROS MCP tool for `userId`. Access-token refresh (via the
   * stored refresh_token) happens transparently inside `client.connect()`;
   * if the refresh token itself is no longer valid, this throws
   * `UnauthorizedError` — callers must treat that as "user must reconnect",
   * not retry (see Task 8).
   */
  async callTool(userId: string, name: string, args: Record<string, unknown>): Promise<CorosToolResult> {
    const provider = createCorosOAuthProvider({ userId, repo: this.repo, redirectUri: this.redirectUri });
    const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), { authProvider: provider });
    const client = new Client(CLIENT_INFO, { capabilities: {} });

    await client.connect(transport);
    try {
      const result = await client.callTool({ name, arguments: args });
      const first = Array.isArray(result.content) ? result.content[0] : undefined;
      const text = first && (first as { type?: string }).type === 'text' ? (first as { text: string }).text : '';
      return { text, isError: Boolean(result.isError) };
    } finally {
      await client.close();
    }
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/api && npx tsc --noEmit`
Expected: no errors. This won't compile successfully until Task 10 adds `@modelcontextprotocol/sdk` to `apps/api/package.json` — if run before then, install it now: `cd apps/api && npm install @modelcontextprotocol/sdk@^1.13.0` (same version floor validated by the Fase 0 spike).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/coros/infrastructure/coros-mcp.client.ts
git commit -m "feat(coros): add CorosMcpClient wrapping the MCP SDK transport"
```

---

## Task 6: CorosMapper — text-response parsing

**Important context:** COROS MCP tools return natural-language text, not structured JSON (confirmed in the Fase 0 spike). The only real captured sample, logged in the spec's "Resultado del spike" section, is from `queryDailyHealthData`:

```
Steps: 11,358 | Calories: 472 kcal | Exercise: 5 min
Stress: Avg 29 ...
```

No fixture files exist on disk for `querySleepData`, `querySleepHrv`, or `queryRestingHeartRate` (the spike's `fixtures/` directory is gitignored and empty in this checkout — the scripts were written and validated but their output was never preserved). `parseSleepData`/`parseSleepHrv`/`parseRestingHeartRate` below are therefore **best-effort, unverified** against COROS's real wording for those three tools — they follow the one confirmed "Label: value unit" style but must be checked against real output before Task 11's cron runs unattended in production. Task 14 is the concrete gate for that.

**Files:**
- Create: `apps/api/src/modules/coros/application/coros-mapper.ts`
- Test: `apps/api/src/modules/coros/application/coros-mapper.spec.ts`

**Interfaces:**
- Consumes: nothing (pure functions over strings).
- Produces: `parseDailyHealthData(text)`, `parseSleepData(text)`, `parseSleepHrv(text)`, `parseRestingHeartRate(text)` — each returns a plain object with nullable numeric fields (never throws on unparseable input). Consumed by Task 8 (`SyncCorosUseCase`).

- [ ] **Step 1: Implement the mapper**

```ts
// apps/api/src/modules/coros/application/coros-mapper.ts

export interface ParsedDailyHealth {
  steps: number | null;
  activeCalories: number | null;
  stressAvg: number | null;
}

export interface ParsedSleep {
  durationH: number | null;
  score: number | null;
}

export interface ParsedHrv {
  hrv: number | null;
}

export interface ParsedRestingHeartRate {
  restingHeartRate: number | null;
}

function parseIntLoose(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw.replace(/,/g, ''));
  return Number.isFinite(n) ? Math.round(n) : null;
}

// Verified against the real sample captured in the Fase 0 spike (see file-level note above).
export function parseDailyHealthData(text: string): ParsedDailyHealth {
  return {
    steps: parseIntLoose(text.match(/Steps:\s*([\d,]+)/i)?.[1]),
    activeCalories: parseIntLoose(text.match(/Calories:\s*([\d,]+)/i)?.[1]),
    stressAvg: parseIntLoose(text.match(/Stress:\s*Avg\s*(\d+)/i)?.[1]),
  };
}

// UNVERIFIED (see file-level note) — assumed format: "Sleep Score: 82 | Duration: 7h 12m ...".
export function parseSleepData(text: string): ParsedSleep {
  const duration = text.match(/(\d+)\s*h(?:ours?)?\s*(\d+)?\s*m(?:in)?/i);
  let durationH: number | null = null;
  if (duration) {
    const hours = Number(duration[1]);
    const minutes = duration[2] ? Number(duration[2]) : 0;
    durationH = Math.round((hours + minutes / 60) * 100) / 100;
  }
  return {
    durationH,
    score: parseIntLoose(text.match(/Score:\s*(\d+)/i)?.[1]),
  };
}

// UNVERIFIED (see file-level note) — assumed format: "HRV: 45 ms" or "... 45ms ...".
export function parseSleepHrv(text: string): ParsedHrv {
  const match = text.match(/HRV:?\s*(\d+)\s*ms/i) ?? text.match(/(\d+)\s*ms/i);
  return { hrv: parseIntLoose(match?.[1]) };
}

// UNVERIFIED (see file-level note) — assumed format: "Resting HR: 52 bpm" or "... 52 bpm resting ...".
export function parseRestingHeartRate(text: string): ParsedRestingHeartRate {
  const match =
    text.match(/Resting(?:\s+Heart\s+Rate|\s+HR)?:?\s*(\d+)\s*bpm/i) ?? text.match(/(\d+)\s*bpm/i);
  return { restingHeartRate: parseIntLoose(match?.[1]) };
}
```

- [ ] **Step 2: Write the tests**

`parseDailyHealthData`'s tests use the real captured sample verbatim. The other three use hand-written synthetic samples in the assumed format — these tests only prove the regex matches what we *think* the format is, not what COROS actually returns; Task 14 replaces them with real-fixture assertions.

```ts
// apps/api/src/modules/coros/application/coros-mapper.spec.ts
import { parseDailyHealthData, parseSleepData, parseSleepHrv, parseRestingHeartRate } from './coros-mapper';

describe('parseDailyHealthData (verified against the real Fase 0 spike sample)', () => {
  it('extracts steps, calories, and stress from the real sample text', () => {
    const text = 'Steps: 11,358 | Calories: 472 kcal | Exercise: 5 min\nStress: Avg 29 (Normal)';
    expect(parseDailyHealthData(text)).toEqual({ steps: 11358, activeCalories: 472, stressAvg: 29 });
  });

  it('returns nulls for fields missing from the text', () => {
    expect(parseDailyHealthData('No usable data today.')).toEqual({
      steps: null,
      activeCalories: null,
      stressAvg: null,
    });
  });
});

describe('parseSleepData (UNVERIFIED — synthetic sample, see Task 14)', () => {
  it('extracts duration and score from an assumed-format sample', () => {
    const text = 'Sleep Score: 82 | Duration: 7h 12m | Deep: 1h 30m | Light: 4h 20m';
    expect(parseSleepData(text)).toEqual({ durationH: 7.2, score: 82 });
  });

  it('returns nulls when the text does not match', () => {
    expect(parseSleepData('unexpected format')).toEqual({ durationH: null, score: null });
  });
});

describe('parseSleepHrv (UNVERIFIED — synthetic sample, see Task 14)', () => {
  it('extracts HRV from an assumed-format sample', () => {
    expect(parseSleepHrv('Overnight HRV: 45 ms (Balanced)')).toEqual({ hrv: 45 });
  });

  it('returns null when the text does not match', () => {
    expect(parseSleepHrv('unexpected format')).toEqual({ hrv: null });
  });
});

describe('parseRestingHeartRate (UNVERIFIED — synthetic sample, see Task 14)', () => {
  it('extracts resting HR from an assumed-format sample', () => {
    expect(parseRestingHeartRate('Resting HR: 52 bpm (7-day avg: 54 bpm)')).toEqual({ restingHeartRate: 52 });
  });

  it('returns null when the text does not match', () => {
    expect(parseRestingHeartRate('unexpected format')).toEqual({ restingHeartRate: null });
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `cd apps/api && npx jest coros-mapper.spec.ts`
Expected: 8 tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/coros/application/coros-mapper.ts apps/api/src/modules/coros/application/coros-mapper.spec.ts
git commit -m "feat(coros): add CorosMapper text-response parsers"
```

---

## Task 7: HandleCorosCallbackUseCase, GetCorosStatusUseCase, DisconnectCorosUseCase

These three are small, single-method mirrors of their Strava equivalents (`HandleStravaCallbackUseCase`, `GetStravaStatusUseCase`, `DisconnectStravaUseCase`) — bundled into one task since none has independent complexity worth its own review gate.

**Files:**
- Create: `apps/api/src/modules/coros/application/use-cases/handle-coros-callback.use-case.ts`
- Create: `apps/api/src/modules/coros/application/use-cases/handle-coros-callback.use-case.spec.ts`
- Create: `apps/api/src/modules/coros/application/use-cases/get-coros-status.use-case.ts`
- Create: `apps/api/src/modules/coros/application/use-cases/disconnect-coros.use-case.ts`

**Interfaces:**
- Consumes: `COROS_REPOSITORY`/`CorosRepositoryPort` (Task 2), `CorosMcpClient` (Task 5).
- Produces: `HandleCorosCallbackUseCase.execute(state, code)`, `GetCorosStatusUseCase.execute(userId): Promise<CorosStatus>` where `CorosStatus = { connected: boolean; lastSyncAt: string | null; syncStatus: string; syncError: string | null }`, `DisconnectCorosUseCase.execute(userId)`. Consumed by Task 9 (`CorosController`).

- [ ] **Step 1: Implement `HandleCorosCallbackUseCase`**

```ts
// apps/api/src/modules/coros/application/use-cases/handle-coros-callback.use-case.ts
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { COROS_REPOSITORY, CorosRepositoryPort } from '../../domain/coros-repository.port';
import { CorosMcpClient } from '../../infrastructure/coros-mcp.client';

@Injectable()
export class HandleCorosCallbackUseCase {
  constructor(
    @Inject(COROS_REPOSITORY) private readonly repo: CorosRepositoryPort,
    private readonly mcpClient: CorosMcpClient,
  ) {}

  async execute(state: string, code: string): Promise<void> {
    const pending = await this.repo.consumeOAuthState(state);
    if (!pending) throw new UnauthorizedException('Invalid or expired COROS authorization state');
    if (!pending.codeVerifier) throw new UnauthorizedException('COROS authorization attempt is missing its PKCE verifier');

    await this.mcpClient.completeAuthorization(pending.userId, code, pending.codeVerifier);
  }
}
```

- [ ] **Step 2: Write its test**

```ts
// apps/api/src/modules/coros/application/use-cases/handle-coros-callback.use-case.spec.ts
import { HandleCorosCallbackUseCase } from './handle-coros-callback.use-case';
import { CorosRepositoryPort } from '../../domain/coros-repository.port';
import { CorosMcpClient } from '../../infrastructure/coros-mcp.client';

describe('HandleCorosCallbackUseCase', () => {
  it('completes authorization for the user resolved from the state', async () => {
    const repo = {
      consumeOAuthState: jest.fn().mockResolvedValue({ userId: 'user-1', codeVerifier: 'verifier-abc' }),
    } as unknown as CorosRepositoryPort;
    const mcpClient = { completeAuthorization: jest.fn() } as unknown as CorosMcpClient;
    const useCase = new HandleCorosCallbackUseCase(repo, mcpClient);

    await useCase.execute('state-xyz', 'auth-code');

    expect(repo.consumeOAuthState).toHaveBeenCalledWith('state-xyz');
    expect(mcpClient.completeAuthorization).toHaveBeenCalledWith('user-1', 'auth-code', 'verifier-abc');
  });

  it('rejects an unknown or expired state', async () => {
    const repo = { consumeOAuthState: jest.fn().mockResolvedValue(null) } as unknown as CorosRepositoryPort;
    const mcpClient = { completeAuthorization: jest.fn() } as unknown as CorosMcpClient;
    const useCase = new HandleCorosCallbackUseCase(repo, mcpClient);

    await expect(useCase.execute('bad-state', 'auth-code')).rejects.toThrow('Invalid or expired');
    expect(mcpClient.completeAuthorization).not.toHaveBeenCalled();
  });

  it('rejects a state that was never given a code verifier', async () => {
    const repo = {
      consumeOAuthState: jest.fn().mockResolvedValue({ userId: 'user-1', codeVerifier: null }),
    } as unknown as CorosRepositoryPort;
    const mcpClient = { completeAuthorization: jest.fn() } as unknown as CorosMcpClient;
    const useCase = new HandleCorosCallbackUseCase(repo, mcpClient);

    await expect(useCase.execute('state-xyz', 'auth-code')).rejects.toThrow('PKCE verifier');
  });
});
```

- [ ] **Step 3: Implement `GetCorosStatusUseCase`**

```ts
// apps/api/src/modules/coros/application/use-cases/get-coros-status.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { COROS_REPOSITORY, CorosRepositoryPort } from '../../domain/coros-repository.port';

export type CorosStatus = {
  connected: boolean;
  lastSyncAt: string | null;
  syncStatus: string | null;
  syncError: string | null;
};

@Injectable()
export class GetCorosStatusUseCase {
  constructor(@Inject(COROS_REPOSITORY) private readonly repo: CorosRepositoryPort) {}

  async execute(userId: string): Promise<CorosStatus> {
    const token = await this.repo.findTokenByUser(userId);
    return {
      connected: !!token,
      lastSyncAt: token?.lastSyncAt?.toISOString() ?? null,
      syncStatus: token?.syncStatus ?? null,
      syncError: token?.syncError ?? null,
    };
  }
}
```

- [ ] **Step 4: Implement `DisconnectCorosUseCase`**

```ts
// apps/api/src/modules/coros/application/use-cases/disconnect-coros.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { COROS_REPOSITORY, CorosRepositoryPort } from '../../domain/coros-repository.port';

@Injectable()
export class DisconnectCorosUseCase {
  constructor(@Inject(COROS_REPOSITORY) private readonly repo: CorosRepositoryPort) {}

  execute(userId: string): Promise<void> {
    return this.repo.deleteToken(userId);
  }
}
```

- [ ] **Step 5: Run the tests**

Run: `cd apps/api && npx jest handle-coros-callback.use-case.spec.ts`
Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/coros/application/use-cases/handle-coros-callback.use-case.ts apps/api/src/modules/coros/application/use-cases/handle-coros-callback.use-case.spec.ts apps/api/src/modules/coros/application/use-cases/get-coros-status.use-case.ts apps/api/src/modules/coros/application/use-cases/disconnect-coros.use-case.ts
git commit -m "feat(coros): add callback, status, and disconnect use-cases"
```

---

## Task 8: SyncCorosUseCase — the core orchestration

This is the most complex use-case, so it gets its own task and its own idempotency test (spec acceptance criterion: "dos ejecuciones el mismo día no duplican datos"). It needs write paths into two other modules' storage — `DailyHealthMetric` (via `health-metrics`) and `SleepEntry` (via `sleep`) — neither of which currently exposes an upsert that accepts COROS's new fields, so Steps 1-2 extend them first, following the existing pattern of injecting another module's exported service/port directly (mirrors `HandleStravaWebhookUseCase` injecting `PushService` from `PushModule`).

**Files:**
- Modify: `apps/api/src/modules/sleep/domain/sleep-entry.entity.ts`
- Modify: `apps/api/src/modules/sleep/domain/sleep-repository.port.ts`
- Modify: `apps/api/src/modules/sleep/infrastructure/prisma-sleep.repository.ts`
- Modify: `apps/api/src/modules/health-metrics/health-metrics.service.ts`
- Create: `apps/api/src/modules/coros/application/use-cases/sync-coros.use-case.ts`
- Create: `apps/api/src/modules/coros/application/use-cases/sync-coros.use-case.spec.ts`

**Interfaces:**
- Consumes: `COROS_REPOSITORY`/`CorosRepositoryPort` (Task 2), `CorosMcpClient` (Task 5), `parseDailyHealthData`/`parseSleepData`/`parseSleepHrv`/`parseRestingHeartRate` (Task 6), `SLEEP_REPOSITORY`/`SleepRepositoryPort.upsertBySource` (this task, Step 1), `HealthMetricsService.upsertFromCoros` (this task, Step 2).
- Produces: `SyncCorosUseCase.execute(userId, date?): Promise<{ synced: string[]; errors: string[] }>`. Consumed by Task 9 (`CorosController`) and Task 11 (`CorosSyncCron`).

- [ ] **Step 1: Extend the sleep module for COROS-sourced upserts**

`SleepEntryEntity`'s constructor gains two optional trailing params so every existing call site (which passes exactly 5 positional args) keeps compiling unchanged:

```ts
// apps/api/src/modules/sleep/domain/sleep-entry.entity.ts
export class SleepEntryEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly date: Date,
    public readonly durationH: number,
    public readonly quality: number, // 1-5, manual entry only
    public readonly score: number | null = null, // 0-100, from COROS
    public readonly source: string = 'manual', // manual | coros
  ) {}
}
```

Add `upsertBySource` to the port:

```ts
// apps/api/src/modules/sleep/domain/sleep-repository.port.ts — add to the existing interface
  upsertBySource(entry: {
    userId: string;
    date: Date;
    durationH: number;
    score: number | null;
    source: string;
  }): Promise<SleepEntryEntity>;
```

Implement it in the Prisma repository, alongside the existing methods:

```ts
// apps/api/src/modules/sleep/infrastructure/prisma-sleep.repository.ts — add to the class
  async upsertBySource(entry: {
    userId: string;
    date: Date;
    durationH: number;
    score: number | null;
    source: string;
  }): Promise<SleepEntryEntity> {
    await this.ensureUser(entry.userId);
    const r = await this.prisma.sleepEntry.upsert({
      where: { userId_date_source: { userId: entry.userId, date: entry.date, source: entry.source } },
      update: { durationH: entry.durationH, score: entry.score },
      create: {
        userId: entry.userId,
        date: entry.date,
        durationH: entry.durationH,
        score: entry.score,
        source: entry.source,
        quality: 3, // COROS doesn't provide the 1-5 manual `quality` scale; neutral default
      },
    });
    return toEntity(r);
  }
```

(`toEntity` in that file also needs updating to pass through `score`/`source` — add them to its parameter type and to the `new SleepEntryEntity(...)` call, mirroring the two new constructor params from above.)

- [ ] **Step 2: Extend `HealthMetricsService` with a COROS upsert**

Add this method to the existing class in `apps/api/src/modules/health-metrics/health-metrics.service.ts`, reusing its existing private `ensureUser`/`startOfDay` helpers:

```ts
  async upsertFromCoros(
    userId: string,
    date: Date,
    data: {
      steps?: number | null;
      activeCalories?: number | null;
      restingHeartRate?: number | null;
      hrv?: number | null;
      avgHeartRate?: number | null;
      stressAvg?: number | null;
      recoveryPct?: number | null;
    },
  ) {
    await this.ensureUser(userId);
    const normalizedDate = startOfDay(date);

    return this.prisma.dailyHealthMetric.upsert({
      where: { userId_date_source: { userId, date: normalizedDate, source: 'coros' } },
      update: {
        ...(data.steps != null ? { steps: data.steps } : {}),
        ...(data.activeCalories != null ? { activeCalories: data.activeCalories } : {}),
        ...(data.restingHeartRate !== undefined ? { restingHeartRate: data.restingHeartRate } : {}),
        ...(data.hrv !== undefined ? { hrv: data.hrv } : {}),
        ...(data.avgHeartRate !== undefined ? { avgHeartRate: data.avgHeartRate } : {}),
        ...(data.stressAvg !== undefined ? { stressAvg: data.stressAvg } : {}),
        ...(data.recoveryPct !== undefined ? { recoveryPct: data.recoveryPct } : {}),
      },
      create: {
        userId,
        date: normalizedDate,
        source: 'coros',
        steps: data.steps ?? 0,
        activeCalories: data.activeCalories ?? 0,
        restingHeartRate: data.restingHeartRate ?? null,
        hrv: data.hrv ?? null,
        avgHeartRate: data.avgHeartRate ?? null,
        stressAvg: data.stressAvg ?? null,
        recoveryPct: data.recoveryPct ?? null,
      },
    });
  }
```

- [ ] **Step 3: Write `SyncCorosUseCase`**

Each COROS tool call is wrapped in its own try/catch (spec: "fallo en sueño no bloquea pasos") — a failure is recorded into `errors` and the use-case moves on, *except* `UnauthorizedError`, which means the refresh token itself is no longer valid: no amount of retrying will help without the user reconnecting, so it aborts the whole sync and marks the token `reauth_required`.

```ts
// apps/api/src/modules/coros/application/use-cases/sync-coros.use-case.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { COROS_REPOSITORY, CorosRepositoryPort } from '../../domain/coros-repository.port';
import { CorosMcpClient } from '../../infrastructure/coros-mcp.client';
import { HealthMetricsService } from '../../../health-metrics/health-metrics.service';
import { SLEEP_REPOSITORY, SleepRepositoryPort } from '../../../sleep/domain/sleep-repository.port';
import { parseDailyHealthData, parseRestingHeartRate, parseSleepData, parseSleepHrv } from '../coros-mapper';

export interface SyncCorosResult {
  synced: string[];
  errors: string[];
}

function yesterday(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class SyncCorosUseCase {
  constructor(
    @Inject(COROS_REPOSITORY) private readonly corosRepo: CorosRepositoryPort,
    @Inject(SLEEP_REPOSITORY) private readonly sleepRepo: SleepRepositoryPort,
    private readonly mcpClient: CorosMcpClient,
    private readonly healthMetrics: HealthMetricsService,
  ) {}

  async execute(userId: string, date: Date = yesterday()): Promise<SyncCorosResult> {
    const token = await this.corosRepo.findTokenByUser(userId);
    if (!token) throw new NotFoundException('COROS not connected');

    await this.corosRepo.updateSyncStatus(userId, { syncStatus: 'syncing', lastAttemptAt: new Date() });

    const dateStr = toDateOnly(date);
    const synced: string[] = [];
    const errors: string[] = [];

    try {
      await this.syncDailyHealth(userId, date, dateStr, synced, errors);
      await this.syncSleep(userId, date, dateStr, synced, errors);
    } catch (error) {
      const reauth = error instanceof UnauthorizedError;
      await this.corosRepo.updateSyncStatus(userId, {
        syncStatus: reauth ? 'reauth_required' : 'error',
        syncError: reauth ? 'COROS session expired — user must reconnect' : (error as Error).message,
      });
      throw error;
    }

    await this.corosRepo.updateSyncStatus(userId, {
      syncStatus: errors.length === 0 || synced.length > 0 ? 'success' : 'error',
      syncError: errors.length > 0 ? errors.join('; ') : null,
      ...(errors.length === 0 ? { lastSuccessfulSyncAt: new Date() } : {}),
    });

    return { synced, errors };
  }

  private async syncDailyHealth(userId: string, date: Date, dateStr: string, synced: string[], errors: string[]) {
    try {
      const result = await this.mcpClient.callTool(userId, 'queryDailyHealthData', { date: dateStr });
      if (result.isError) throw new Error(result.text || 'queryDailyHealthData returned an error');
      const parsed = parseDailyHealthData(result.text);
      await this.healthMetrics.upsertFromCoros(userId, date, parsed);
      synced.push('dailyHealthData');
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      errors.push(`dailyHealthData: ${(error as Error).message}`);
    }
  }

  private async syncSleep(userId: string, date: Date, dateStr: string, synced: string[], errors: string[]) {
    let durationH: number | null = null;
    let score: number | null = null;
    let sleepDataOk = false;

    try {
      const result = await this.mcpClient.callTool(userId, 'querySleepData', { date: dateStr });
      if (result.isError) throw new Error(result.text || 'querySleepData returned an error');
      const parsed = parseSleepData(result.text);
      durationH = parsed.durationH;
      score = parsed.score;
      sleepDataOk = true;
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      errors.push(`sleepData: ${(error as Error).message}`);
    }

    try {
      const hrvResult = await this.mcpClient.callTool(userId, 'querySleepHrv', { date: dateStr });
      if (hrvResult.isError) throw new Error(hrvResult.text || 'querySleepHrv returned an error');
      const parsed = parseSleepHrv(hrvResult.text);
      if (parsed.hrv != null) await this.healthMetrics.upsertFromCoros(userId, date, { hrv: parsed.hrv });
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      errors.push(`sleepHrv: ${(error as Error).message}`);
    }

    try {
      const rhrResult = await this.mcpClient.callTool(userId, 'queryRestingHeartRate', {
        startDate: dateStr,
        endDate: dateStr,
      });
      if (rhrResult.isError) throw new Error(rhrResult.text || 'queryRestingHeartRate returned an error');
      const parsed = parseRestingHeartRate(rhrResult.text);
      if (parsed.restingHeartRate != null) {
        await this.healthMetrics.upsertFromCoros(userId, date, { restingHeartRate: parsed.restingHeartRate });
      }
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      errors.push(`restingHeartRate: ${(error as Error).message}`);
    }

    if (sleepDataOk && durationH != null) {
      await this.sleepRepo.upsertBySource({ userId, date, durationH, score, source: 'coros' });
      synced.push('sleep');
    } else if (sleepDataOk) {
      errors.push('sleepData: response did not contain a parseable duration');
    }
  }
}
```

- [ ] **Step 4: Write the tests**

```ts
// apps/api/src/modules/coros/application/use-cases/sync-coros.use-case.spec.ts
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { SyncCorosUseCase } from './sync-coros.use-case';
import { CorosRepositoryPort } from '../../domain/coros-repository.port';
import { CorosMcpClient } from '../../infrastructure/coros-mcp.client';
import { HealthMetricsService } from '../../../health-metrics/health-metrics.service';
import { SleepRepositoryPort } from '../../../sleep/domain/sleep-repository.port';

function makeToken() {
  return {
    id: 't1', userId: 'user-1', accessToken: 'a', refreshToken: 'r', expiresAt: new Date(),
    corosUserId: null, lastSyncAt: null, lastSuccessfulSyncAt: null, lastAttemptAt: null,
    syncStatus: 'idle', syncError: null, isExpired: false,
  } as never;
}

function makeDeps() {
  const corosRepo = {
    findTokenByUser: jest.fn().mockResolvedValue(makeToken()),
    updateSyncStatus: jest.fn(),
  } as unknown as jest.Mocked<CorosRepositoryPort>;
  const sleepRepo = { upsertBySource: jest.fn() } as unknown as jest.Mocked<SleepRepositoryPort>;
  const mcpClient = { callTool: jest.fn() } as unknown as jest.Mocked<CorosMcpClient>;
  const healthMetrics = { upsertFromCoros: jest.fn() } as unknown as jest.Mocked<HealthMetricsService>;
  return { corosRepo, sleepRepo, mcpClient, healthMetrics };
}

const OK_RESPONSES: Record<string, string> = {
  queryDailyHealthData: 'Steps: 11,358 | Calories: 472 kcal | Exercise: 5 min\nStress: Avg 29',
  querySleepData: 'Sleep Score: 82 | Duration: 7h 12m',
  querySleepHrv: 'Overnight HRV: 45 ms',
  queryRestingHeartRate: 'Resting HR: 52 bpm',
};

describe('SyncCorosUseCase', () => {
  const date = new Date('2026-08-29T00:00:00.000Z');

  it('throws when COROS is not connected', async () => {
    const { corosRepo, sleepRepo, mcpClient, healthMetrics } = makeDeps();
    corosRepo.findTokenByUser.mockResolvedValue(null);
    const useCase = new SyncCorosUseCase(corosRepo, sleepRepo, mcpClient, healthMetrics);

    await expect(useCase.execute('user-1', date)).rejects.toThrow('COROS not connected');
  });

  it('parses and upserts daily health data and sleep, and marks the token success', async () => {
    const { corosRepo, sleepRepo, mcpClient, healthMetrics } = makeDeps();
    mcpClient.callTool.mockImplementation(async (_userId, name) => ({ text: OK_RESPONSES[name], isError: false }));
    const useCase = new SyncCorosUseCase(corosRepo, sleepRepo, mcpClient, healthMetrics);

    const result = await useCase.execute('user-1', date);

    expect(result.errors).toEqual([]);
    expect(result.synced).toEqual(['dailyHealthData', 'sleep']);
    expect(healthMetrics.upsertFromCoros).toHaveBeenCalledWith('user-1', date, { steps: 11358, activeCalories: 472, stressAvg: 29 });
    expect(healthMetrics.upsertFromCoros).toHaveBeenCalledWith('user-1', date, { hrv: 45 });
    expect(healthMetrics.upsertFromCoros).toHaveBeenCalledWith('user-1', date, { restingHeartRate: 52 });
    expect(sleepRepo.upsertBySource).toHaveBeenCalledWith({ userId: 'user-1', date, durationH: 7.2, score: 82, source: 'coros' });
    expect(corosRepo.updateSyncStatus).toHaveBeenLastCalledWith('user-1', expect.objectContaining({ syncStatus: 'success', syncError: null }));
  });

  it('idempotency: running the same date twice routes both times through upsert, never a plain create', async () => {
    // The DB-level `@@unique([userId, date, source])` constraint (Task 1) is what actually
    // prevents a duplicate row; this test proves the use-case takes the upsert path both
    // times with identical keys, which is what makes that constraint sufficient — it does
    // not itself exercise Postgres (no test-DB harness exists in this codebase yet).
    const { corosRepo, sleepRepo, mcpClient, healthMetrics } = makeDeps();
    mcpClient.callTool.mockImplementation(async (_userId, name) => ({ text: OK_RESPONSES[name], isError: false }));
    const useCase = new SyncCorosUseCase(corosRepo, sleepRepo, mcpClient, healthMetrics);

    await useCase.execute('user-1', date);
    await useCase.execute('user-1', date);

    expect(sleepRepo.upsertBySource).toHaveBeenCalledTimes(2);
    expect(sleepRepo.upsertBySource).toHaveBeenNthCalledWith(1, { userId: 'user-1', date, durationH: 7.2, score: 82, source: 'coros' });
    expect(sleepRepo.upsertBySource).toHaveBeenNthCalledWith(2, { userId: 'user-1', date, durationH: 7.2, score: 82, source: 'coros' });
  });

  it('a sleep-related failure does not block daily health data from being saved', async () => {
    const { corosRepo, sleepRepo, mcpClient, healthMetrics } = makeDeps();
    mcpClient.callTool.mockImplementation(async (_userId, name) => {
      if (name === 'queryDailyHealthData') return { text: OK_RESPONSES[name], isError: false };
      return { text: '', isError: true };
    });
    const useCase = new SyncCorosUseCase(corosRepo, sleepRepo, mcpClient, healthMetrics);

    const result = await useCase.execute('user-1', date);

    expect(result.synced).toEqual(['dailyHealthData']);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('sleepData:'), expect.stringContaining('sleepHrv:'), expect.stringContaining('restingHeartRate:')]),
    );
    expect(sleepRepo.upsertBySource).not.toHaveBeenCalled();
    expect(corosRepo.updateSyncStatus).toHaveBeenLastCalledWith('user-1', expect.objectContaining({ syncStatus: 'success' }));
  });

  it('marks the token reauth_required and rethrows on UnauthorizedError, without swallowing it', async () => {
    const { corosRepo, sleepRepo, mcpClient, healthMetrics } = makeDeps();
    mcpClient.callTool.mockRejectedValue(new UnauthorizedError());
    const useCase = new SyncCorosUseCase(corosRepo, sleepRepo, mcpClient, healthMetrics);

    await expect(useCase.execute('user-1', date)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(corosRepo.updateSyncStatus).toHaveBeenLastCalledWith('user-1', expect.objectContaining({ syncStatus: 'reauth_required' }));
  });
});
```

- [ ] **Step 5: Run the tests**

Run: `cd apps/api && npx jest sync-coros.use-case.spec.ts`
Expected: 5 tests pass.

- [ ] **Step 6: Verify the whole project still compiles**

Run: `cd apps/api && npx tsc --noEmit`
Expected: no errors (confirms the `sleep` and `health-metrics` module changes didn't break existing call sites).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/sleep/ apps/api/src/modules/health-metrics/health-metrics.service.ts apps/api/src/modules/coros/application/use-cases/sync-coros.use-case.ts apps/api/src/modules/coros/application/use-cases/sync-coros.use-case.spec.ts
git commit -m "feat(coros): add SyncCorosUseCase with per-field error isolation and idempotent upserts"
```

---

## Task 9: CorosController

**Files:**
- Create: `apps/api/src/modules/coros/application/dto/sync-coros.dto.ts`
- Create: `apps/api/src/modules/coros/presentation/coros.controller.ts`

**Interfaces:**
- Consumes: `HandleCorosCallbackUseCase`, `GetCorosStatusUseCase`, `DisconnectCorosUseCase` (Task 7), `SyncCorosUseCase` (Task 8), `CorosMcpClient` (Task 5), `AUTH_SERVICE`/`AuthServicePort` (existing, `apps/api/src/modules/auth/domain/auth-service.port.ts`, used identically by `StravaController`/`HealthMetricsController`).
- Produces: `GET /coros/connect`, `GET /coros/callback`, `GET /coros/:userId/status`, `POST /coros/sync`, `DELETE /coros/disconnect`. Consumed by Task 10 (`coros.module.ts`) and the frontend (Task 13).

- [ ] **Step 1: Create the sync body DTO**

```ts
// apps/api/src/modules/coros/application/dto/sync-coros.dto.ts
import { IsDateString, IsOptional } from 'class-validator';

export class SyncCorosDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}
```

- [ ] **Step 2: Implement the controller**

`connect`/`callback` follow the exact same session-then-redirect shape as `StravaController`, except `connect` must additionally call `CorosMcpClient.getAuthorizationUrl` (Strava's `getAuthUrl` is a pure, local URL builder — COROS's equivalent makes a real network round-trip to `mcpeu.coros.com`, since the SDK can only discover it needs to redirect by first attempting a connection).

```ts
// apps/api/src/modules/coros/presentation/coros.controller.ts
import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Inject, Param, Post, Query, Req, Res } from '@nestjs/common';
import { AUTH_SERVICE, AuthServicePort } from '../../auth/domain/auth-service.port';
import { HandleCorosCallbackUseCase } from '../application/use-cases/handle-coros-callback.use-case';
import { GetCorosStatusUseCase } from '../application/use-cases/get-coros-status.use-case';
import { SyncCorosUseCase } from '../application/use-cases/sync-coros.use-case';
import { DisconnectCorosUseCase } from '../application/use-cases/disconnect-coros.use-case';
import { SyncCorosDto } from '../application/dto/sync-coros.dto';
import { CorosMcpClient } from '../infrastructure/coros-mcp.client';

@Controller('coros')
export class CorosController {
  private readonly frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

  constructor(
    private readonly mcpClient: CorosMcpClient,
    private readonly handleCallback: HandleCorosCallbackUseCase,
    private readonly getStatus: GetCorosStatusUseCase,
    private readonly syncCoros: SyncCorosUseCase,
    private readonly disconnectCoros: DisconnectCorosUseCase,
    @Inject(AUTH_SERVICE) private readonly authService: AuthServicePort,
  ) {}

  @Get('connect')
  async connect(@Req() req: any, @Res() res: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) return res.redirect(`${this.frontendUrl}/app?coros=error&reason=auth`);

    try {
      const authorizationUrl = await this.mcpClient.getAuthorizationUrl(session.user.id);
      if (!authorizationUrl) return res.redirect(`${this.frontendUrl}/app?coros=connected`);
      return res.redirect(authorizationUrl);
    } catch {
      return res.redirect(`${this.frontendUrl}/app?coros=error&reason=mcp`);
    }
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Query('state') state: string, @Res() res: any) {
    try {
      if (!code || !state) return res.redirect(`${this.frontendUrl}/app?coros=error&reason=missing`);
      await this.handleCallback.execute(state, code);
      return res.redirect(`${this.frontendUrl}/app?coros=connected`);
    } catch {
      return res.redirect(`${this.frontendUrl}/app?coros=error`);
    }
  }

  @Get(':userId/status')
  async status(@Param('userId') userId: string, @Req() req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session || session.user.id !== userId) throw new ForbiddenException();
    return this.getStatus.execute(userId);
  }

  @Post('sync')
  @HttpCode(200)
  async sync(@Req() req: any, @Body() body: SyncCorosDto) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new ForbiddenException();
    return this.syncCoros.execute(session.user.id, body.date ? new Date(body.date) : undefined);
  }

  @Delete('disconnect')
  @HttpCode(204)
  async disconnect(@Req() req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new ForbiddenException();
    return this.disconnectCoros.execute(session.user.id);
  }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd apps/api && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/coros/application/dto/sync-coros.dto.ts apps/api/src/modules/coros/presentation/coros.controller.ts
git commit -m "feat(coros): add CorosController"
```

---

## Task 10: Dependencies, CorosModule, and app registration

**Files:**
- Modify: `apps/api/package.json`
- Create: `apps/api/src/modules/coros/coros.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: everything from Tasks 2-9.
- Produces: a fully wired `CorosModule`, registered in `AppModule`, with `@modelcontextprotocol/sdk` and `@nestjs/schedule` available as dependencies (the latter consumed by Task 11).

- [ ] **Step 1: Add the two new dependencies**

Run: `cd apps/api && npm install @modelcontextprotocol/sdk@^1.13.0 @nestjs/schedule@^4.1.0`
Expected: both added to `dependencies` in `apps/api/package.json`, `package-lock.json` updated, no errors. (`^1.13.0` is the same SDK version floor the Fase 0 spike validated; `@nestjs/schedule@^4.1.0` is the current stable major compatible with this project's `@nestjs/common@10.4.15`.)

- [ ] **Step 2: Create the module**

```ts
// apps/api/src/modules/coros/coros.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HealthMetricsModule } from '../health-metrics/health-metrics.module';
import { SleepModule } from '../sleep/sleep.module';
import { HandleCorosCallbackUseCase } from './application/use-cases/handle-coros-callback.use-case';
import { GetCorosStatusUseCase } from './application/use-cases/get-coros-status.use-case';
import { SyncCorosUseCase } from './application/use-cases/sync-coros.use-case';
import { DisconnectCorosUseCase } from './application/use-cases/disconnect-coros.use-case';
import { COROS_REPOSITORY } from './domain/coros-repository.port';
import { PrismaCorosRepository } from './infrastructure/prisma-coros.repository';
import { CorosMcpClient } from './infrastructure/coros-mcp.client';
import { CorosController } from './presentation/coros.controller';

@Module({
  imports: [AuthModule, HealthMetricsModule, SleepModule],
  controllers: [CorosController],
  providers: [
    HandleCorosCallbackUseCase,
    GetCorosStatusUseCase,
    SyncCorosUseCase,
    DisconnectCorosUseCase,
    CorosMcpClient,
    PrismaCorosRepository,
    { provide: COROS_REPOSITORY, useExisting: PrismaCorosRepository },
  ],
  exports: [SyncCorosUseCase, COROS_REPOSITORY],
})
export class CorosModule {}
```

`exports: [SyncCorosUseCase, COROS_REPOSITORY]` is needed by Task 11, where `CorosSyncCron` (a provider of a *different* module) calls `SyncCorosUseCase` and reads connected users via `COROS_REPOSITORY`.

- [ ] **Step 3: Register it in `AppModule`**

In `apps/api/src/app.module.ts`, add the import next to the existing `StravaModule` import, and add `CorosModule` to the `imports` array right after `StravaModule` (matching where the spec's frontend placeholder currently sits next to `StravaConnectCard`):

```ts
import { CorosModule } from './modules/coros/coros.module';
```

```ts
    StravaModule,
    CorosModule,
    PushModule,
```

- [ ] **Step 4: Verify it compiles and boots**

Run: `cd apps/api && npx tsc --noEmit`
Expected: no errors.

Run: `cd apps/api && npm run build`
Expected: `nest build` succeeds (this also catches NestJS DI wiring mistakes that `tsc` alone wouldn't, e.g. a missing `exports` entry).

- [ ] **Step 5: Commit**

```bash
git add apps/api/package.json apps/api/package-lock.json apps/api/src/modules/coros/coros.module.ts apps/api/src/app.module.ts
git commit -m "feat(coros): wire CorosModule into the app"
```

---

## Task 11: CorosSyncCron — the first scheduler in this project

No cron/scheduler exists anywhere in `apps/api` today (verified — no `@nestjs/schedule` usage, no `@Cron` decorators). `ScheduleModule.forRoot()` must be registered once, globally, in `AppModule`.

**Files:**
- Create: `apps/api/src/modules/coros/coros-sync.cron.ts`
- Modify: `apps/api/src/modules/coros/coros.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: `SyncCorosUseCase`, `COROS_REPOSITORY`/`CorosRepositoryPort.findAllConnectedUserIds` (both exported by `CorosModule` in Task 10).
- Produces: a daily 08:00 sync for every connected user. Nothing downstream consumes this file — it's the top of the call graph.

- [ ] **Step 1: Register `ScheduleModule` globally**

In `apps/api/src/app.module.ts`:

```ts
import { ScheduleModule } from '@nestjs/schedule';
```

```ts
    PrismaModule,
    ScheduleModule.forRoot(),
    AuthModule,
```

- [ ] **Step 2: Implement the cron**

One failing user must not stop the rest — same "no queue infra, in-process retry belongs to tomorrow's run" philosophy as `SyncCorosUseCase` itself (spec: "Manejo de errores").

```ts
// apps/api/src/modules/coros/coros-sync.cron.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { COROS_REPOSITORY, CorosRepositoryPort } from './domain/coros-repository.port';
import { SyncCorosUseCase } from './application/use-cases/sync-coros.use-case';

@Injectable()
export class CorosSyncCron {
  private readonly logger = new Logger(CorosSyncCron.name);

  constructor(
    @Inject(COROS_REPOSITORY) private readonly corosRepo: CorosRepositoryPort,
    private readonly syncCoros: SyncCorosUseCase,
  ) {}

  @Cron('0 8 * * *')
  async handleDailySync(): Promise<void> {
    const userIds = await this.corosRepo.findAllConnectedUserIds();
    this.logger.log(`Starting daily COROS sync for ${userIds.length} user(s)`);

    for (const userId of userIds) {
      try {
        const result = await this.syncCoros.execute(userId);
        this.logger.log(`Synced COROS for ${userId}: ${result.synced.join(', ') || 'nothing'}${result.errors.length ? ` (errors: ${result.errors.join('; ')})` : ''}`);
      } catch (error) {
        this.logger.error(`COROS sync failed for ${userId}: ${(error as Error).message}`);
      }
    }
  }
}
```

- [ ] **Step 3: Register the cron in `CorosModule`**

In `apps/api/src/modules/coros/coros.module.ts`, add the import and provider:

```ts
import { CorosSyncCron } from './coros-sync.cron';
```

```ts
  providers: [
    HandleCorosCallbackUseCase,
    GetCorosStatusUseCase,
    SyncCorosUseCase,
    DisconnectCorosUseCase,
    CorosMcpClient,
    CorosSyncCron,
    PrismaCorosRepository,
    { provide: COROS_REPOSITORY, useExisting: PrismaCorosRepository },
  ],
```

- [ ] **Step 4: Verify it compiles and boots**

Run: `cd apps/api && npm run build`
Expected: succeeds. `@Cron` decorators are only validated at Nest bootstrap, not by `tsc` alone, so also start the server briefly and confirm no DI/cron-registration errors:

Run: `cd apps/api && timeout 10 npm run start:dev || true` (or start it and Ctrl+C after the "Nest application successfully started" log appears)
Expected: no `UnknownDependenciesException` or cron-related errors in the log.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/coros/coros-sync.cron.ts apps/api/src/modules/coros/coros.module.ts apps/api/src/app.module.ts
git commit -m "feat(coros): add daily 08:00 sync cron"
```

---

## Task 12: `.env.example` — add COROS vars, backfill missing Strava vars

**Files:**
- Modify: `.env.example` (root)
- Modify: `apps/api/.env.example`

None of the three `.env.example` files list any `STRAVA_*` variable today, even though `strava-api.client.ts` and `strava.controller.ts` read `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI`, and `STRAVA_WEBHOOK_VERIFY_TOKEN` from `process.env` — this task adds both the new `COROS_*` vars and backfills the pre-existing gap, so the file stays a true reference of what the API actually reads.

- [ ] **Step 1: Update root `.env.example`**

Add after the existing `PORT="3001"` line:

```
STRAVA_CLIENT_ID="your-strava-client-id"
STRAVA_CLIENT_SECRET="your-strava-client-secret"
STRAVA_REDIRECT_URI="http://localhost:3001/api/strava/callback"
STRAVA_WEBHOOK_VERIFY_TOKEN="change-me"
COROS_REDIRECT_URI="http://localhost:3001/api/coros/callback"
COROS_MCP_URL="https://mcpeu.coros.com/mcp"
```

- [ ] **Step 2: Apply the same addition to `apps/api/.env.example`**

Same six lines, appended after its existing `PORT="3001"` line.

- [ ] **Step 3: Commit**

```bash
git add .env.example apps/api/.env.example
git commit -m "docs(env): add COROS vars and backfill missing Strava vars in .env.example"
```

---

## Task 13: Frontend — `CorosConnectCard` and placeholder cleanup

**Files:**
- Create: `apps/web/components/coros-connect-card.tsx`
- Modify: `apps/web/components/profile-screen.tsx`
- Modify: `apps/web/components/insights-screen.tsx`

**Interfaces:**
- Consumes: `GET /coros/:userId/status`, `POST /coros/sync`, `DELETE /coros/disconnect`, `GET /coros/connect` (Task 9); `getJson`/`postJson`/`deleteJson` from `apps/web/lib/api.ts`, `useSessionStore`, `toast` from `apps/web/stores/toast-store.ts` (all existing, used identically by `StravaConnectCard`).
- Produces: `CorosConnectCard` component. Consumed by `profile-screen.tsx` and (optionally) anywhere else a connection card is shown.

COROS's MVP sync (spec: "solo ayer/hoy") has no history range to pick, unlike Strava's — so this card's Sync button is a plain one-click action, without Strava's date-picker step.

- [ ] **Step 1: Create the card**

```tsx
// apps/web/components/coros-connect-card.tsx
'use client';

import { useEffect, useState } from 'react';
import { HeartPulse, RefreshCw, Unlink } from 'lucide-react';
import { useSessionStore } from '../stores/session-store';
import { getJson, postJson, deleteJson } from '../lib/api';
import { toast } from '../stores/toast-store';

type CorosStatus = {
  connected: boolean;
  lastSyncAt: string | null;
  syncStatus: string | null;
  syncError: string | null;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

export function CorosConnectCard({ hideIfSynced }: { hideIfSynced?: boolean }) {
  const user = useSessionStore((s) => s.user);
  const [status, setStatus] = useState<CorosStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  async function loadStatus() {
    if (!user) return;
    try {
      const s = await getJson<CorosStatus>(`/coros/${user.id}/status`);
      setStatus(s);
    } catch {
      setStatus({ connected: false, lastSyncAt: null, syncStatus: null, syncError: null });
    }
  }

  useEffect(() => {
    void loadStatus();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const corosParam = params.get('coros');
      if (corosParam === 'connected') {
        toast.success('Coros conectado correctamente');
        void loadStatus();
        window.history.replaceState({}, '', window.location.pathname);
      } else if (corosParam === 'error') {
        toast.error('No se pudo conectar Coros');
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleSync() {
    setSyncing(true);
    try {
      const result = await postJson<{ synced: string[]; errors: string[] }>('/coros/sync', {});
      if (result.errors.length > 0) {
        toast.error(`Coros sincronizado con avisos: ${result.errors.join('; ')}`);
      } else {
        toast.success('Coros sincronizado');
      }
      await loadStatus();
    } catch {
      toast.error('Error al sincronizar con Coros');
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    try {
      await deleteJson('/coros/disconnect');
      setStatus({ connected: false, lastSyncAt: null, syncStatus: null, syncError: null });
      toast.success('Coros desconectado');
    } catch {
      toast.error('Error al desconectar Coros');
    }
  }

  if (!status) return null;
  if (hideIfSynced && status.lastSyncAt !== null) return null;

  const needsReauth = status.syncStatus === 'reauth_required';

  return (
    <div className="rounded-3xl bg-white shadow-card px-4 py-3.5 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
        status.connected ? 'bg-emerald-500/10' : 'bg-canvas'
      }`}>
        <HeartPulse size={16} className={status.connected ? 'text-emerald-600' : 'text-ink/30'} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink leading-snug">Coros</p>
        <p className="text-[11px] text-ink/40 mt-0.5">
          {needsReauth
            ? 'Sesión caducada · reconecta'
            : status.connected
              ? status.lastSyncAt
                ? `Última sync ${relativeTime(status.lastSyncAt)}`
                : 'Conectado · sin sincronizar'
              : 'Conecta para importar sueño, HRV y FC en reposo'}
        </p>
      </div>

      {status.connected ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          {needsReauth ? (
            <a
              href="/api/coros/connect"
              className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white flex-shrink-0"
            >
              <HeartPulse size={12} />
              Reconectar
            </a>
          ) : (
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 transition-opacity"
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sync…' : 'Sync'}
            </button>
          )}
          <button
            type="button"
            onClick={handleDisconnect}
            className="h-8 w-8 rounded-xl bg-canvas flex items-center justify-center text-ink/30 hover:text-red-400 hover:bg-red-50 transition-colors"
          >
            <Unlink size={13} />
          </button>
        </div>
      ) : (
        <a
          href="/api/coros/connect"
          className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white flex-shrink-0"
        >
          <HeartPulse size={12} />
          Conectar
        </a>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `profile-screen.tsx`, removing the "Coros" placeholder**

Add the import next to the existing `StravaConnectCard` import:

```tsx
import { CorosConnectCard } from './coros-connect-card';
```

Replace this block (the "Conexiones" section):

```tsx
        <StravaConnectCard />
        <div className="rounded-4xl bg-white shadow-card overflow-hidden">
          <div className="px-5">
            {['Coros', 'OpenAI'].map((item) => (
```

with:

```tsx
        <StravaConnectCard />
        <CorosConnectCard />
        <div className="rounded-4xl bg-white shadow-card overflow-hidden">
          <div className="px-5">
            {['OpenAI'].map((item) => (
```

- [ ] **Step 3: Clean up `insights-screen.tsx`'s "Próximamente" list**

Both `'Coros — sueño y HRV'` (shipping now) and `'Strava — actividad automática'` (already shipped, stale copy unrelated to this plan but sitting in the exact line being touched) should come out of the same array. Replace:

```tsx
        {['Strava — actividad automática', 'Coros — sueño y HRV', 'IA real — insights con GPT'].map((item) => (
```

with:

```tsx
        {['IA real — insights con GPT'].map((item) => (
```

- [ ] **Step 4: Manual verification in the browser**

Run: `npm run dev:api` and, in a second terminal, `npm run dev:web`
Then open the profile screen and confirm: the "Coros" row under Conexiones now renders `CorosConnectCard` (showing "Conecta para importar sueño, HRV y FC en reposo" and a "Conectar" button) instead of the "próximamente" pill, and the insights screen's "Próximamente" box now only lists "IA real — insights con GPT".

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/coros-connect-card.tsx apps/web/components/profile-screen.tsx apps/web/components/insights-screen.tsx
git commit -m "feat(coros): add CorosConnectCard and remove Coros/stale-Strava placeholders"
```

---

## Task 14: Validate `CorosMapper` against real fixtures before enabling the cron in production

**This task requires a human with a personal COROS account and a browser** — it cannot be completed unattended. It is the concrete gate the spec asks for ("documentar la estrategia de parsing de texto... antes de activar el cron en producción") and closes the gap opened in Task 6, where three of the four parsers were written against an assumed text format because no real fixture existed in this checkout.

**Files:**
- Modify: `apps/api/src/modules/coros/application/coros-mapper.ts` (only if real fixtures reveal the assumed regex is wrong)
- Modify: `apps/api/src/modules/coros/application/coros-mapper.spec.ts` (replace synthetic samples with real captured text)
- Modify: `docs/superpowers/specs/2026-08-23-coros-integration-design.md` (record the outcome, mirroring how the Fase 0 spike's own outcome was recorded)

**Interfaces:** none — this is a verification task, not new production code.

- [ ] **Step 1: Regenerate real fixtures**

```bash
cd scripts/coros-mcp-spike
npm run connect   # opens a browser — log in with the personal COROS account and approve access
npm run query     # separate process, no browser — must succeed without interaction (re-validates the Fase 0 spike result too)
```

Expected: 4 files appear under `scripts/coros-mcp-spike/fixtures/`: `queryDailyHealthData.json`, `querySleepData.json`, `querySleepHrv.json`, `queryRestingHeartRate.json`. These are gitignored — do not force-add them (they may contain real personal health data).

- [ ] **Step 2: Compare each fixture's text against the mapper's assumptions**

For each of the 4 files, open it and find the actual text (the `content[0].text` field inside the returned tool-result JSON). Compare it against:
- `queryDailyHealthData`: already verified in Task 6 against the one real sample known at plan-writing time — confirm the new fixture's wording still matches `Steps:`, `Calories:`, `Stress: Avg` (COROS may phrase it slightly differently on a day with different data, e.g. no exercise recorded).
- `querySleepData`, `querySleepHrv`, `queryRestingHeartRate`: these were **never verified** — compare the real text directly against the regex in `coros-mapper.ts`'s `parseSleepData`/`parseSleepHrv`/`parseRestingHeartRate`.

- [ ] **Step 3: Fix any regex that doesn't match, and replace the synthetic tests with real ones**

If a parser's regex doesn't match the real text, adjust it (the file's inline comments — "UNVERIFIED — assumed format..." — mark exactly which functions to check first). Then, in `coros-mapper.spec.ts`, replace each "UNVERIFIED — synthetic sample" test's input string with the real captured text (redact any personal values you don't want committed, e.g. replace real step counts with round numbers, but keep the real wording/punctuation/units) and update the `describe` block name to drop "UNVERIFIED — synthetic sample, see Task 14" since it no longer applies. Also remove the "UNVERIFIED" comments from the corresponding parser functions in `coros-mapper.ts` once their regex is confirmed correct.

- [ ] **Step 4: Run the tests**

Run: `cd apps/api && npx jest coros-mapper.spec.ts`
Expected: all tests pass against the real-derived samples.

- [ ] **Step 5: Record the outcome in the design spec**

Open `docs/superpowers/specs/2026-08-23-coros-integration-design.md` and add a subsection after the existing "Resultado del spike (completado)" section:

```markdown
### Validación de CorosMapper contra fixtures reales (Fase 1)

Fixtures reales regeneradas y comparadas contra `coros-mapper.ts`. [Completar: "Los 4 parsers coincidieron sin cambios" O "Se ajustó `parse<Tool>` porque el texto real usaba <diferencia observada>"]. Tests actualizados en `coros-mapper.spec.ts` con las muestras reales (valores redactados donde corresponde).
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/coros/application/coros-mapper.ts apps/api/src/modules/coros/application/coros-mapper.spec.ts docs/superpowers/specs/2026-08-23-coros-integration-design.md
git commit -m "test(coros): validate CorosMapper against real MCP fixtures"
```

---

## Acceptance criteria recap (from the spec)

- [ ] Spike de Fase 0 confirms non-interactive, persistent MCP session — **done**, merged to `main`.
- [ ] Sueño, pasos, HRV y resting HR de "ayer" visibles tras un `POST /coros/sync` manual — Tasks 1-10.
- [ ] Cron 08:00 ejecuta la sync sin intervención manual y dos ejecuciones el mismo día no duplican datos — Task 11 (cron) + Task 8 (idempotent upserts, unit-proven; DB constraint from Task 1 is what actually enforces it).
- [ ] `CorosToken.syncStatus`/`syncError` reflejan el estado real tras cada intento — Task 8.
- [ ] `CorosMapper` validated against real COROS text output before the cron runs unattended — Task 14.

