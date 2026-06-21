# Strava Sync Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three Strava UX improvements: (1) date picker before every sync, (2) preserve `source=strava` tag when editing a Strava activity, (3) hide the Strava card from the Activities page once the user has synced at least once (move it to Profile > Connections).

**Architecture:** All changes are purely additive. Feature 1 adds a `since` param to the sync endpoint and an inline date-picker UI in the card. Feature 2 passes `stravaId`/`stravaName` through the existing edit flow. Feature 3 adds a `hideIfSynced` prop to `StravaConnectCard` and wires the real card into the Profile screen.

**Tech Stack:** NestJS (API), Next.js 14 App Router + React (web), Prisma, TypeScript.

## Global Constraints

- No new dependencies.
- No new Prisma migrations — only TS/TSX changes.
- All copy in Spanish (es-ES) to match existing UI.
- Follow existing code style: no comments unless non-obvious, no extra abstractions.

---

## Files touched

| File | Change |
|------|--------|
| `apps/api/src/modules/strava/presentation/strava.controller.ts` | Accept `{ since?: string }` body in `POST /strava/sync` |
| `apps/api/src/modules/strava/application/use-cases/sync-strava.use-case.ts` | Accept optional `since` param and use it to compute `after` |
| `apps/web/components/strava-connect-card.tsx` | Date-picker state + `hideIfSynced` prop |
| `apps/web/components/actividades-screen.tsx` | Pass `hideIfSynced` to `StravaConnectCard` |
| `apps/web/components/profile-screen.tsx` | Replace static Conexiones list with `<StravaConnectCard />` |
| `apps/web/components/add-activity-sheet.tsx` | Pass `stravaId`/`stravaName` through `handleSave` |

---

## Task 1 — Backend: accept `since` in the sync endpoint

**Files:**
- Modify: `apps/api/src/modules/strava/presentation/strava.controller.ts`
- Modify: `apps/api/src/modules/strava/application/use-cases/sync-strava.use-case.ts`

**Interfaces:**
- Produces: `SyncStravaUseCase.execute(userId: string, since?: string): Promise<{ synced: number }>`

- [ ] **Step 1: Update `SyncStravaUseCase.execute` to accept `since`**

Replace the `execute` signature and `after` computation in `apps/api/src/modules/strava/application/use-cases/sync-strava.use-case.ts`:

```ts
async execute(userId: string, since?: string): Promise<{ synced: number }> {
  let token = await this.stravaRepo.findTokenByUser(userId);
  if (!token) throw new NotFoundException('Strava not connected');

  if (token.isExpired) {
    const refreshed = await this.api.refreshAccessToken(token.refreshToken);
    await this.stravaRepo.updateToken(userId, {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      expiresAt: new Date(refreshed.expires_at * 1000),
    });
    token.accessToken = refreshed.access_token;
  }

  const after = since
    ? Math.floor(new Date(since).getTime() / 1000)
    : token.lastSyncAt
      ? Math.floor(token.lastSyncAt.getTime() / 1000)
      : undefined;

  let page = 1;
  let synced = 0;

  while (true) {
    const activities = await this.api.fetchActivities(token.accessToken, after, page);
    if (activities.length === 0) break;

    for (const act of activities) {
      const entity = toActivityEntity(userId, act);
      await this.activityRepo.create(entity);
      synced++;
    }

    if (activities.length < 200) break;
    page++;
  }

  await this.stravaRepo.updateLastSync(userId);
  return { synced };
}
```

- [ ] **Step 2: Update the controller to parse the body and pass `since`**

Replace the `sync` handler in `apps/api/src/modules/strava/presentation/strava.controller.ts`:

```ts
@Post('sync')
@HttpCode(200)
async sync(@Req() req: any, @Body() body: { since?: string }) {
  const session = await this.authService.getSession({ headers: new Headers(req.headers) });
  if (!session) throw new ForbiddenException();
  return this.syncStrava.execute(session.user.id, body.since);
}
```

Add `Body` to the import list at the top (it's already imported — verify it's in the destructured list).

- [ ] **Step 3: Verify the controller import includes `Body`**

Check line 1 of `apps/api/src/modules/strava/presentation/strava.controller.ts`. The import already includes `Body` — confirm it's there; if not, add it:

```ts
import {
  Body, Controller, Delete, ForbiddenException, Get, HttpCode,
  Inject, Param, Post, Query, Req, Res,
} from '@nestjs/common';
```

- [ ] **Step 4: Build the API to verify no TypeScript errors**

```bash
cd apps/api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/strava/presentation/strava.controller.ts \
        apps/api/src/modules/strava/application/use-cases/sync-strava.use-case.ts
git commit -m "feat(strava): accept optional since date in sync endpoint"
```

---

## Task 2 — Frontend: date picker in StravaConnectCard

**Files:**
- Modify: `apps/web/components/strava-connect-card.tsx`

**Interfaces:**
- Consumes: `POST /strava/sync` with body `{ since?: string }` (ISO date string `YYYY-MM-DD`)
- Existing prop `onSynced?: () => void` unchanged.
- New prop: `hideIfSynced?: boolean`

- [ ] **Step 1: Add `pickingDate` state and `sinceDate` state to `StravaConnectCard`**

Add after the existing `useState` declarations:

```ts
const [pickingDate, setPickingDate] = useState(false);
const [sinceDate,   setSinceDate]   = useState('');
```

- [ ] **Step 2: Compute the default `sinceDate` when picker opens**

Replace `handleSync` (the click on the Sync button) with a function that opens the picker:

```ts
function openDatePicker() {
  const defaultDate = status?.lastSyncAt
    ? status.lastSyncAt.split('T')[0]
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  setSinceDate(defaultDate);
  setPickingDate(true);
}
```

- [ ] **Step 3: Rename the existing `handleSync` to `confirmSync` and accept a date param**

```ts
async function confirmSync() {
  setPickingDate(false);
  setSyncing(true);
  try {
    const body = sinceDate ? { since: sinceDate } : {};
    const result = await postJson<{ synced: number }>('/strava/sync', body);
    toast.success(`${result.synced} actividades sincronizadas desde Strava`);
    await loadStatus();
    if (user) {
      void RecoveryService.loadActivitiesPage(user.id);
      onSynced?.();
    }
  } catch {
    toast.error('Error al sincronizar con Strava');
  } finally {
    setSyncing(false);
  }
}
```

- [ ] **Step 4: Add `hideIfSynced` prop and early-return logic**

Update the component signature:

```ts
export function StravaConnectCard({
  onSynced,
  hideIfSynced,
}: {
  onSynced?: () => void;
  hideIfSynced?: boolean;
}) {
```

Add this guard after the `if (!status) return null;` line:

```ts
if (hideIfSynced && status.lastSyncAt !== null) return null;
```

- [ ] **Step 5: Replace the Sync button with picker-aware UI**

Replace the `{status.connected ? (...)` JSX block's sync button area with:

```tsx
{status.connected ? (
  <div className="flex items-center gap-2 flex-shrink-0">
    {pickingDate ? (
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={sinceDate}
          max={new Date().toISOString().split('T')[0]}
          onChange={(e) => setSinceDate(e.target.value)}
          className="rounded-xl border border-ink/10 bg-canvas px-2 py-1.5 text-xs text-ink outline-none"
        />
        <button
          type="button"
          onClick={confirmSync}
          disabled={syncing}
          className="rounded-2xl bg-[#FC4C02] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {syncing ? 'Sync…' : 'OK'}
        </button>
        <button
          type="button"
          onClick={() => setPickingDate(false)}
          className="h-8 w-8 rounded-xl bg-canvas flex items-center justify-center text-ink/30 hover:text-ink/60"
        >
          <X size={13} />
        </button>
      </div>
    ) : (
      <button
        type="button"
        onClick={openDatePicker}
        disabled={syncing}
        className="flex items-center gap-1.5 rounded-2xl bg-[#FC4C02] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 transition-opacity"
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
    href="/api/strava/connect"
    className="flex items-center gap-1.5 rounded-2xl bg-[#FC4C02] px-3 py-2 text-xs font-semibold text-white flex-shrink-0"
  >
    <Zap size={12} />
    Conectar
  </a>
)}
```

Add `X` to the lucide-react import at the top.

- [ ] **Step 6: Build check**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/strava-connect-card.tsx
git commit -m "feat(strava): date picker before sync + hideIfSynced prop"
```

---

## Task 3 — Activities page: hide card after first sync

**Files:**
- Modify: `apps/web/components/actividades-screen.tsx`

**Interfaces:**
- Consumes: `StravaConnectCard` with `hideIfSynced` prop (from Task 2).

- [ ] **Step 1: Pass `hideIfSynced` to `StravaConnectCard` in `actividades-screen.tsx`**

Find the line (around line 291):
```tsx
<StravaConnectCard onSynced={() => setLoadingMore(false)} />
```

Replace with:
```tsx
<StravaConnectCard hideIfSynced onSynced={() => setLoadingMore(false)} />
```

- [ ] **Step 2: Build check**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/actividades-screen.tsx
git commit -m "feat(actividades): hide Strava card after first sync"
```

---

## Task 4 — Profile: real StravaConnectCard in Connections section

**Files:**
- Modify: `apps/web/components/profile-screen.tsx`

**Interfaces:**
- Consumes: `StravaConnectCard` without `hideIfSynced` (always visible).

- [ ] **Step 1: Import `StravaConnectCard` in `profile-screen.tsx`**

Add to existing imports:
```ts
import { StravaConnectCard } from './strava-connect-card';
```

- [ ] **Step 2: Replace the static Conexiones section**

Find the block (around line 282–297):
```tsx
{/* Connections */}
<div className="rounded-4xl bg-white shadow-card overflow-hidden">
  <div className="px-5 py-4 border-b border-ink/5">
    <p className="text-sm font-semibold text-ink">Conexiones</p>
  </div>
  <div className="px-5">
    {['Strava', 'Coros', 'OpenAI'].map((item) => (
      <div key={item} className="flex items-center justify-between py-3 border-b border-ink/5 last:border-0">
        <span className="text-sm text-ink/60">{item}</span>
        <span className="rounded-full bg-sand/30 px-2.5 py-0.5 text-[10px] font-medium text-ink/30">
          próximamente
        </span>
      </div>
    ))}
  </div>
</div>
```

Replace with:
```tsx
{/* Connections */}
<div className="space-y-3">
  <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1 pt-2">
    Conexiones
  </p>
  <StravaConnectCard />
  <div className="rounded-4xl bg-white shadow-card overflow-hidden">
    <div className="px-5">
      {['Coros', 'OpenAI'].map((item) => (
        <div key={item} className="flex items-center justify-between py-3 border-b border-ink/5 last:border-0">
          <span className="text-sm text-ink/60">{item}</span>
          <span className="rounded-full bg-sand/30 px-2.5 py-0.5 text-[10px] font-medium text-ink/30">
            próximamente
          </span>
        </div>
      ))}
    </div>
  </div>
</div>
```

- [ ] **Step 3: Build check**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/profile-screen.tsx
git commit -m "feat(profile): show real Strava connect card in connections"
```

---

## Task 5 — Preserve Strava tag when editing activity

**Files:**
- Modify: `apps/web/components/add-activity-sheet.tsx`

**Interfaces:**
- Consumes: `RecoveryService.logActivity` which already accepts `stravaId?: number` and `stravaName?: string` (defined in `ActivityEntry`).

The bug: `handleSave` calls `RecoveryService.logActivity({...})` without passing `stravaId`/`stravaName` from `editActivity`. Since `RecoveryService.logActivity` sets `source: data.stravaId ? 'strava' : 'manual'`, the source defaults to `'manual'`.

- [ ] **Step 1: Pass `stravaId` and `stravaName` in `handleSave`**

In `add-activity-sheet.tsx`, find `handleSave` (around line 153). The call to `RecoveryService.logActivity` currently does not include stravaId/stravaName. Replace the call:

```ts
function handleSave() {
  if (!type) return;
  if (editActivity) RecoveryService.deleteActivity(editActivity.id, true);

  RecoveryService.logActivity({
    type,
    date,
    durationMinutes: totalDurationMin > 0 ? totalDurationMin : undefined,
    kcal:            kcal     ? parseInt(kcal, 10)     : undefined,
    avgHeartRateBpm: avgHr    ? parseInt(avgHr, 10)    : undefined,
    notes:           notes.trim() || undefined,
    // Preserve Strava metadata when editing a Strava activity
    stravaId:        editActivity?.stravaId,
    stravaName:      editActivity?.stravaName,
    ...(type === 'run' || type === 'walk' ? {
      distanceKm:      distKm   ? parseFloat(distKm)         : undefined,
      avgPaceSecPerKm: paceToSec(paceMm, paceSs),
      elevationGainM:  elevGain ? parseInt(elevGain, 10)      : undefined,
      avgCadenceSpm:   cadSpm   ? parseInt(cadSpm, 10)        : undefined,
    } : {}),
    ...(type === 'bike' ? {
      distanceKm:     distKm   ? parseFloat(distKm)          : undefined,
      avgSpeedKmh:    speedKmh ? parseFloat(speedKmh)        : undefined,
      elevationGainM: elevGain ? parseInt(elevGain, 10)      : undefined,
      avgPowerW:      powerW   ? parseInt(powerW, 10)        : undefined,
      avgCadenceRpm:  cadRpm   ? parseInt(cadRpm, 10)        : undefined,
    } : {}),
    ...(type === 'swim' ? {
      distanceM:         distM   ? parseInt(distM, 10)       : undefined,
      avgPacePer100mSec: pace100 ? parseInt(pace100, 10)     : undefined,
    } : {}),
    ...(type === 'gym' ? {
      muscleGroups: muscles.length > 0 ? muscles : undefined,
      totalVolumeKg: volumeKg ? parseFloat(volumeKg) : undefined,
    } : {}),
  });
  setSaved(true);
  setTimeout(() => { reset(); onClose(); }, 800);
}
```

- [ ] **Step 2: Build check**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/add-activity-sheet.tsx
git commit -m "fix(activities): preserve strava source tag when editing"
```

---

## Self-review checklist

- [x] Feature 1 (date picker): backend accepts `since`, use case uses it, frontend shows picker before sync.
- [x] Feature 2 (preserve tag): `stravaId`/`stravaName` passed through `handleSave`, `RecoveryService.logActivity` already sets `source: 'strava'` when `stravaId` present.
- [x] Feature 3 (move card): `hideIfSynced` prop hides card in Activities after `lastSyncAt !== null`; Profile shows real `StravaConnectCard`.
- [x] No new dependencies or migrations.
- [x] `X` icon imported in `strava-connect-card.tsx` (lucide-react already used there).
- [x] `Body` decorator already imported in strava controller.
