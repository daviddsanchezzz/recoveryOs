# Rediseño "Hoy" v4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the "Hoy" (Today) screen around a new composite "Estado de hoy" day score (sleep + HRV + pain + training load), reactivate the dormant activity-plan checklist, add rehab-phase tracking, and restyle the movement/nutrition sections into tap-to-expand detail sheets.

**Architecture:** A new backend module `day-score` (hexagonal, mirrors `dashboard`'s cross-module aggregation pattern) computes the composite score server-side from existing `Activity`/`DailyHealthMetric`/`SleepEntry`/`InjuryLog` data via a single `GET /day-score` endpoint. The frontend consumes it in a new `DayScoreCard` + `DayScoreDetailSheet`, alongside three other restyled sections (Movimiento, Alimentación, Tu día) and a new rehab-phase card, all inside `today-screen.tsx`.

**Tech Stack:** NestJS, Prisma, Next.js/React, Recharts (via the existing `ProgressChart`).

**Spec:** `docs/superpowers/specs/2026-09-09-hoy-rediseno-v4-design.md`

## Global Constraints

- Additive schema changes only — `Injury` gains 3 nullable fields, no drops/renames.
- Schema-sync workflow (confirmed this session, not `prisma migrate dev`): edit `schema.prisma`, write a matching migration folder `apps/api/prisma/migrations/<N>_<name>/migration.sql`, then `npx prisma db push --skip-generate` (real DB — this project has one Postgres instance for dev+prod) then `npx prisma generate`.
- Hexagonal pattern for the new `day-score` module: `domain/` (types, pure math), `application/use-cases/`, `presentation/` — mirrors `apps/api/src/modules/dashboard/`.
- Test convention: `*.spec.ts`, Jest, colocated next to the file under test. Use-cases/pure functions instantiated directly with hand-rolled `jest.fn()` mocks — no `@nestjs/testing`.
- Composite score formula, weights, and label thresholds are fixed by the spec (section 3) — do not adjust them without checking with the user.
- Nothing in this plan calls an LLM — all insight text is rule-based (spec section 4).
- No hydration tracking, no "Cena"/"Objetivo de sueño" tasks, no priority badges — explicitly out of scope per the spec.

---

## Task 1: Injury schema — rehab phase fields (full stack)

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/3_injury_phase/migration.sql`
- Modify: `apps/api/src/modules/injury/domain/injury.entity.ts`
- Modify: `apps/api/src/modules/injury/domain/injury-repository.port.ts`
- Modify: `apps/api/src/modules/injury/infrastructure/prisma-injury.repository.ts`
- Modify: `apps/api/src/modules/injury/application/dto/update-injury.dto.ts`
- Modify: `apps/api/src/modules/injury/application/use-cases/update-injury.use-case.ts` (verify passthrough, see Step 5)

**Interfaces:**
- Produces: `InjuryEntity` gains `phaseLabel: string | null`, `phaseStartDate: Date | null`, `phaseTargetSessions: number | null` (constructor params, trailing, defaulted to `null` so existing call sites keep compiling). Consumed by Task 4 (day-score use-case doesn't need these directly) and Task 12 (rehab-phase card + edit UI).

- [ ] **Step 1: Add the fields to `schema.prisma`**

In `model Injury`, add these three lines right after the existing `status` field:

```prisma
  status               String      @default("active") // active | recovering | resolved
  phaseLabel           String?
  phaseStartDate       DateTime?
  phaseTargetSessions  Int?
```

- [ ] **Step 2: Write the tracking migration**

```sql
-- AlterTable
ALTER TABLE "Injury" ADD COLUMN "phaseLabel" TEXT,
ADD COLUMN "phaseStartDate" TIMESTAMP(3),
ADD COLUMN "phaseTargetSessions" INTEGER;
```

- [ ] **Step 3: Apply and regenerate**

Run: `cd apps/api && npx prisma db push --skip-generate && npx prisma generate`
Expected: `Your database is now in sync with your Prisma schema.` and `Generated Prisma Client`.

- [ ] **Step 4: Extend `InjuryEntity`**

```ts
// apps/api/src/modules/injury/domain/injury.entity.ts
export type InjuryStatus = 'active' | 'recovering' | 'resolved';

export class InjuryEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly startDate: Date,
    public readonly status: InjuryStatus,
    public readonly bodyPart?: string,
    public readonly description?: string,
    public readonly phaseLabel: string | null = null,
    public readonly phaseStartDate: Date | null = null,
    public readonly phaseTargetSessions: number | null = null,
  ) {}
}
```

- [ ] **Step 5: Extend the repository port**

```ts
// apps/api/src/modules/injury/domain/injury-repository.port.ts — update the updateInjury signature
  updateInjury(
    id: string,
    userId: string,
    data: Partial<{
      name: string;
      bodyPart: string;
      description: string;
      startDate: Date;
      status: InjuryStatus;
      phaseLabel: string | null;
      phaseStartDate: Date | null;
      phaseTargetSessions: number | null;
    }>,
  ): Promise<InjuryEntity | null>;
```

- [ ] **Step 6: Extend the Prisma repository**

In `apps/api/src/modules/injury/infrastructure/prisma-injury.repository.ts`, update `toEntity()`'s parameter type and constructor call:

```ts
function toEntity(r: {
  id: string; userId: string; name: string; bodyPart: string | null;
  description: string | null; startDate: Date; status: string;
  phaseLabel: string | null; phaseStartDate: Date | null; phaseTargetSessions: number | null;
}): InjuryEntity {
  return new InjuryEntity(
    r.id, r.userId, r.name, r.startDate, r.status as InjuryStatus,
    r.bodyPart ?? undefined, r.description ?? undefined,
    r.phaseLabel, r.phaseStartDate, r.phaseTargetSessions,
  );
}
```

And in `createInjury`'s Prisma `data:` object, add the three fields (read them off `injury.phaseLabel` etc., defaulting to `null` — `InjuryEntity`'s constructor already defaults them, so `createInjury(injury)` callers that don't pass them will naturally send `null`):

```ts
  async createInjury(injury: InjuryEntity): Promise<InjuryEntity> {
    const r = await this.prisma.injury.create({
      data: {
        id: injury.id,
        userId: injury.userId,
        name: injury.name,
        bodyPart: injury.bodyPart,
        description: injury.description,
        startDate: injury.startDate,
        status: injury.status,
        phaseLabel: injury.phaseLabel,
        phaseStartDate: injury.phaseStartDate,
        phaseTargetSessions: injury.phaseTargetSessions,
      },
    });
    return toEntity(r);
  }
```

(Leave `updateInjury`'s implementation as-is — it already does `prisma.injury.updateMany({ where: { id, userId }, data })` with `data` passed straight through from the `Partial<{...}>` parameter, so the three new keys flow through automatically once the port type from Step 5 allows them.)

- [ ] **Step 7: Extend the update DTO**

```ts
// apps/api/src/modules/injury/application/dto/update-injury.dto.ts
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateInjuryDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  bodyPart?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @Type(() => Date) @IsDate()
  startDate?: Date;

  @IsOptional() @IsIn(['active', 'recovering', 'resolved'])
  status?: 'active' | 'recovering' | 'resolved';

  @IsOptional() @IsString()
  phaseLabel?: string | null;

  @IsOptional() @Type(() => Date) @IsDate()
  phaseStartDate?: Date | null;

  @IsOptional() @IsInt() @Min(1)
  phaseTargetSessions?: number | null;
}
```

- [ ] **Step 8: Verify `update-injury.use-case.ts` needs no change**

Open `apps/api/src/modules/injury/application/use-cases/update-injury.use-case.ts` and confirm it does `return this.repository.updateInjury(id, userId, input);` with no field allowlisting (passing the whole DTO through). If that's what you see, no edit needed — the new DTO fields already flow through automatically. If it does list fields explicitly instead, add the three new ones to that list.

- [ ] **Step 9: Compile check**

Run: `cd apps/api && npx tsc --noEmit`
Expected: no new errors outside the pre-existing `.spec.ts` jest-typing gap.

- [ ] **Step 10: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/3_injury_phase/migration.sql apps/api/src/modules/injury/
git commit -m "feat(injury): add rehab phase tracking fields"
```

---

## Task 2: Day-score math library — pure functions

**Files:**
- Create: `apps/api/src/modules/day-score/domain/day-score-math.ts`
- Create: `apps/api/src/modules/day-score/domain/day-score-math.spec.ts`

**Interfaces:**
- Consumes: nothing (pure functions over primitives).
- Produces: `computeSessionLoad`, `computeDailyLoad`, `computeAcuteChronicRatio`, `loadScoreFromRatio`, `sleepScoreFromEntry`, `hrvScoreFromValues`, `painScoreFromLogs`, `combineWeightedScore`, `scoreLabel`, and the `DAY_SCORE_WEIGHTS` constant. Consumed by Task 4 (`GetDayScoreUseCase`) and Task 3 (insight rules read the same component scores).

- [ ] **Step 1: Implement the math library**

```ts
// apps/api/src/modules/day-score/domain/day-score-math.ts

export const DAY_SCORE_WEIGHTS = { sleep: 25, hrv: 30, pain: 25, load: 20 } as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// ── Training load ──────────────────────────────────────────────────────────

export function computeSessionLoad(
  durationMin: number,
  avgHeartRate: number | null,
  restingHeartRate: number | null,
): number {
  if (avgHeartRate != null && restingHeartRate != null && restingHeartRate > 0) {
    return durationMin * (avgHeartRate / restingHeartRate);
  }
  return durationMin;
}

export function computeDailyLoad(
  sessions: Array<{ durationMin: number; avgHeartRate: number | null }>,
  restingHeartRate: number | null,
): number {
  return sessions.reduce((sum, s) => sum + computeSessionLoad(s.durationMin, s.avgHeartRate, restingHeartRate), 0);
}

/** `last7DailyLoads`/`last28DailyLoads` must include a 0 entry for every day with no activity. */
export function computeAcuteChronicRatio(last7DailyLoads: number[], last28DailyLoads: number[]): number | null {
  const chronicAvg = mean(last28DailyLoads);
  if (chronicAvg === 0) return null;
  return mean(last7DailyLoads) / chronicAvg;
}

export function loadScoreFromRatio(ratio: number | null): number | null {
  if (ratio === null) return null;
  if (ratio >= 0.8 && ratio <= 1.3) return 100;
  if (ratio > 1.3) return clamp(100 - (ratio - 1.3) * 200, 0, 100);
  return clamp(100 - (0.8 - ratio) * 100, 50, 100);
}

export function loadStatusFromRatio(ratio: number | null): 'alta' | 'normal' | 'baja' | null {
  if (ratio === null) return null;
  if (ratio > 1.3) return 'alta';
  if (ratio < 0.8) return 'baja';
  return 'normal';
}

// ── Component scores ───────────────────────────────────────────────────────

export function sleepScoreFromEntry(entry: { score: number | null; quality: number } | null): number | null {
  if (!entry) return null;
  return entry.score ?? entry.quality * 20;
}

/** `previous7dHrvValues` excludes today and must have at least 3 values to form a reliable baseline. */
export function hrvScoreFromValues(todayHrv: number | null, previous7dHrvValues: number[]): number | null {
  if (todayHrv == null || previous7dHrvValues.length < 3) return null;
  const baseline = mean(previous7dHrvValues);
  if (baseline === 0) return null;
  const ratio = todayHrv / baseline;
  return clamp(50 + (ratio - 1) * 100, 0, 100);
}

export function painScoreFromLogs(todayPainLevels: number[], hasActiveInjuries: boolean): number | null {
  if (!hasActiveInjuries) return 100;
  if (todayPainLevels.length === 0) return null;
  const avgPain = mean(todayPainLevels);
  return clamp((10 - avgPain) * 10, 0, 100);
}

// ── Combination ─────────────────────────────────────────────────────────────

export function combineWeightedScore(components: {
  sleep: number | null;
  hrv: number | null;
  pain: number | null;
  load: number | null;
}): number | null {
  const present = (Object.keys(DAY_SCORE_WEIGHTS) as Array<keyof typeof DAY_SCORE_WEIGHTS>)
    .filter((key) => components[key] !== null);
  if (present.length === 0) return null;

  const totalWeight = present.reduce((sum, key) => sum + DAY_SCORE_WEIGHTS[key], 0);
  const weightedSum = present.reduce((sum, key) => sum + (components[key] as number) * DAY_SCORE_WEIGHTS[key], 0);
  return Math.round(weightedSum / totalWeight);
}

export function scoreLabel(score: number): string {
  if (score >= 85) return 'Excelente';
  if (score >= 70) return 'Muy bien';
  if (score >= 55) return 'Bastante bien';
  if (score >= 40) return 'Regular';
  return 'Cuidado';
}
```

- [ ] **Step 2: Write the tests**

```ts
// apps/api/src/modules/day-score/domain/day-score-math.spec.ts
import {
  computeSessionLoad, computeDailyLoad, computeAcuteChronicRatio, loadScoreFromRatio, loadStatusFromRatio,
  sleepScoreFromEntry, hrvScoreFromValues, painScoreFromLogs, combineWeightedScore, scoreLabel,
} from './day-score-math';

describe('computeSessionLoad', () => {
  it('weights duration by HR intensity when both HR values are present', () => {
    expect(computeSessionLoad(60, 120, 60)).toBe(120); // 60 * (120/60)
  });

  it('falls back to plain duration when avgHeartRate is missing', () => {
    expect(computeSessionLoad(45, null, 60)).toBe(45);
  });

  it('falls back to plain duration when restingHeartRate is missing', () => {
    expect(computeSessionLoad(45, 130, null)).toBe(45);
  });
});

describe('computeDailyLoad', () => {
  it('sums session loads for the day', () => {
    const sessions = [
      { durationMin: 30, avgHeartRate: 120 },
      { durationMin: 20, avgHeartRate: null },
    ];
    // session1: 30*(120/60)=60, session2: 20 (fallback) => 80
    expect(computeDailyLoad(sessions, 60)).toBe(80);
  });

  it('returns 0 for a day with no sessions', () => {
    expect(computeDailyLoad([], 60)).toBe(0);
  });
});

describe('computeAcuteChronicRatio', () => {
  it('returns the ratio of the 7-day average to the 28-day average', () => {
    const last7 = [100, 100, 100, 100, 100, 100, 100]; // avg 100
    const last28 = new Array(28).fill(50); // avg 50
    expect(computeAcuteChronicRatio(last7, last28)).toBe(2);
  });

  it('returns null when there is no activity at all in the 28-day window', () => {
    expect(computeAcuteChronicRatio(new Array(7).fill(0), new Array(28).fill(0))).toBeNull();
  });
});

describe('loadScoreFromRatio', () => {
  it('scores 100 for a ratio in the ideal 0.8-1.3 range', () => {
    expect(loadScoreFromRatio(1.0)).toBe(100);
    expect(loadScoreFromRatio(0.8)).toBe(100);
    expect(loadScoreFromRatio(1.3)).toBe(100);
  });

  it('decays for overload above 1.3', () => {
    expect(loadScoreFromRatio(1.8)).toBe(0); // 100 - (1.8-1.3)*200 = 0
    expect(loadScoreFromRatio(1.55)).toBe(50); // 100 - (1.55-1.3)*200 = 50
  });

  it('decays gently for undertraining below 0.8, floored at 50', () => {
    expect(loadScoreFromRatio(0.5)).toBe(70); // 100 - (0.8-0.5)*100 = 70
    expect(loadScoreFromRatio(0)).toBe(50); // clamped: 100 - 0.8*100 = 20 -> floor 50
  });

  it('returns null when the ratio is null', () => {
    expect(loadScoreFromRatio(null)).toBeNull();
  });
});

describe('loadStatusFromRatio', () => {
  it('classifies alta/normal/baja/null', () => {
    expect(loadStatusFromRatio(1.5)).toBe('alta');
    expect(loadStatusFromRatio(1.0)).toBe('normal');
    expect(loadStatusFromRatio(0.5)).toBe('baja');
    expect(loadStatusFromRatio(null)).toBeNull();
  });
});

describe('sleepScoreFromEntry', () => {
  it('prefers the real COROS score when present', () => {
    expect(sleepScoreFromEntry({ score: 84, quality: 3 })).toBe(84);
  });

  it('derives a score from manual quality when score is absent', () => {
    expect(sleepScoreFromEntry({ score: null, quality: 4 })).toBe(80);
  });

  it('returns null when there is no entry', () => {
    expect(sleepScoreFromEntry(null)).toBeNull();
  });
});

describe('hrvScoreFromValues', () => {
  it('scores 50 (neutral) when today matches the 7-day baseline', () => {
    expect(hrvScoreFromValues(60, [60, 60, 60])).toBe(50);
  });

  it('scores above 50 when today is above baseline', () => {
    expect(hrvScoreFromValues(66, [60, 60, 60])).toBe(60); // ratio 1.1 -> 50 + 10
  });

  it('scores below 50 when today is below baseline', () => {
    expect(hrvScoreFromValues(54, [60, 60, 60])).toBe(40); // ratio 0.9 -> 50 - 10
  });

  it('returns null with fewer than 3 baseline values', () => {
    expect(hrvScoreFromValues(60, [60, 60])).toBeNull();
  });

  it('returns null when today has no HRV value', () => {
    expect(hrvScoreFromValues(null, [60, 60, 60])).toBeNull();
  });
});

describe('painScoreFromLogs', () => {
  it('scores 100 when there are no active injuries', () => {
    expect(painScoreFromLogs([], false)).toBe(100);
  });

  it('inverts average pain (0-10) to a 0-100 score', () => {
    expect(painScoreFromLogs([2], true)).toBe(80);
    expect(painScoreFromLogs([2, 4], true)).toBe(70);
  });

  it('returns null when injuries are active but nothing was logged today', () => {
    expect(painScoreFromLogs([], true)).toBeNull();
  });
});

describe('combineWeightedScore', () => {
  it('combines all 4 components with the spec weights', () => {
    // 70*25 + 40*30 + 90*25 + 50*20 = 6200 / 100 = 62
    expect(combineWeightedScore({ sleep: 70, hrv: 40, pain: 90, load: 50 })).toBe(62);
  });

  it('renormalizes weights when a component is missing', () => {
    // only sleep(25) + hrv(30) + pain(25) present, load missing -> weights renormalize over 80
    // (70*25 + 40*30 + 90*25) / 80 = (1750+1200+2250)/80 = 5200/80 = 65
    expect(combineWeightedScore({ sleep: 70, hrv: 40, pain: 90, load: null })).toBe(65);
  });

  it('returns null when every component is missing', () => {
    expect(combineWeightedScore({ sleep: null, hrv: null, pain: null, load: null })).toBeNull();
  });
});

describe('scoreLabel', () => {
  it('maps thresholds to labels, matching the 62 -> "Bastante bien" mockup case', () => {
    expect(scoreLabel(90)).toBe('Excelente');
    expect(scoreLabel(75)).toBe('Muy bien');
    expect(scoreLabel(62)).toBe('Bastante bien');
    expect(scoreLabel(45)).toBe('Regular');
    expect(scoreLabel(20)).toBe('Cuidado');
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `cd apps/api && npx jest day-score-math.spec.ts`
Expected: all tests pass (24 tests).

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/day-score/domain/day-score-math.ts apps/api/src/modules/day-score/domain/day-score-math.spec.ts
git commit -m "feat(day-score): add training load and component scoring math"
```

---

## Task 3: Day-score insight rules

**Files:**
- Create: `apps/api/src/modules/day-score/domain/day-score-insights.ts`
- Create: `apps/api/src/modules/day-score/domain/day-score-insights.spec.ts`

**Interfaces:**
- Consumes: nothing new (takes the same component scores `day-score-math.ts` produces, plus `loadStatus` from `loadStatusFromRatio`).
- Produces: `buildDayScoreInsight(input: DayScoreInsightInput): { explanation: string; tip: string }`. Consumed by Task 4 (`GetDayScoreUseCase`).

Rule-based, ordered if-chain, first match wins — same style as the existing `apps/web/lib/metrics.ts::buildRuleBasedInsight` (plain Spanish, no forced accents, single string per slot).

- [ ] **Step 1: Implement the insight rules**

```ts
// apps/api/src/modules/day-score/domain/day-score-insights.ts

export interface DayScoreInsightInput {
  sleepScore: number | null;
  hrvScore: number | null;
  painScore: number | null;
  loadStatus: 'alta' | 'normal' | 'baja' | null;
}

function buildExplanation(input: DayScoreInsightInput): string {
  const { sleepScore, hrvScore, painScore, loadStatus } = input;

  if (hrvScore !== null && hrvScore < 40 && loadStatus === 'alta') {
    return 'Tu HRV esta algo por debajo de tu media tras la carga alta de ayer.';
  }
  if (hrvScore !== null && hrvScore < 40) {
    return 'Tu HRV esta por debajo de tu media estos dias.';
  }
  if (painScore !== null && painScore < 50) {
    return 'El dolor ha estado mas presente que de costumbre.';
  }
  if (sleepScore !== null && sleepScore < 50) {
    return 'Has dormido menos de lo habitual.';
  }
  if (loadStatus === 'alta') {
    return 'Vienes de dias de carga alta.';
  }
  if (loadStatus === 'baja') {
    return 'Los ultimos dias has entrenado menos de lo habitual.';
  }
  return 'Tus metricas estan en linea con tu media habitual.';
}

function buildTip(input: DayScoreInsightInput): string {
  const { sleepScore, hrvScore, painScore, loadStatus } = input;

  if (loadStatus === 'alta') {
    return 'Carga alta - prioriza descanso o una sesion muy suave hoy.';
  }
  if (loadStatus === 'normal' && ((hrvScore !== null && hrvScore < 50) || (painScore !== null && painScore < 60))) {
    return 'Carga moderada - evita impacto y manten la bici suave.';
  }
  if (loadStatus === 'baja') {
    return 'Carga baja - buen momento para retomar intensidad si te sientes bien.';
  }
  if (sleepScore !== null && sleepScore < 50) {
    return 'Prioriza dormir mas esta noche.';
  }
  return 'Sigue con tu plan habitual.';
}

export function buildDayScoreInsight(input: DayScoreInsightInput): { explanation: string; tip: string } {
  return {
    explanation: buildExplanation(input),
    tip: buildTip(input),
  };
}
```

- [ ] **Step 2: Write the tests**

```ts
// apps/api/src/modules/day-score/domain/day-score-insights.spec.ts
import { buildDayScoreInsight } from './day-score-insights';

describe('buildDayScoreInsight', () => {
  it('matches the mockup case: low HRV + high load', () => {
    const result = buildDayScoreInsight({ sleepScore: 70, hrvScore: 30, painScore: 90, loadStatus: 'alta' });
    expect(result.explanation).toBe('Tu HRV esta algo por debajo de tu media tras la carga alta de ayer.');
    expect(result.tip).toBe('Carga alta - prioriza descanso o una sesion muy suave hoy.');
  });

  it('matches the mockup case: normal load with a soft flag -> "carga moderada" tip', () => {
    const result = buildDayScoreInsight({ sleepScore: 70, hrvScore: 45, painScore: 90, loadStatus: 'normal' });
    expect(result.tip).toBe('Carga moderada - evita impacto y manten la bici suave.');
  });

  it('falls back to the all-good message when every signal is in range', () => {
    const result = buildDayScoreInsight({ sleepScore: 80, hrvScore: 60, painScore: 90, loadStatus: 'normal' });
    expect(result.explanation).toBe('Tus metricas estan en linea con tu media habitual.');
    expect(result.tip).toBe('Sigue con tu plan habitual.');
  });

  it('handles all-null components without throwing', () => {
    const result = buildDayScoreInsight({ sleepScore: null, hrvScore: null, painScore: null, loadStatus: null });
    expect(result.explanation).toBe('Tus metricas estan en linea con tu media habitual.');
    expect(result.tip).toBe('Sigue con tu plan habitual.');
  });

  it('flags low pain score before falling back', () => {
    const result = buildDayScoreInsight({ sleepScore: 80, hrvScore: 60, painScore: 30, loadStatus: 'normal' });
    expect(result.explanation).toBe('El dolor ha estado mas presente que de costumbre.');
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `cd apps/api && npx jest day-score-insights.spec.ts`
Expected: 5 tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/day-score/domain/day-score-insights.ts apps/api/src/modules/day-score/domain/day-score-insights.spec.ts
git commit -m "feat(day-score): add rule-based explanation/tip generator"
```

---

## Task 4: GetDayScoreUseCase — orchestration

**Files:**
- Create: `apps/api/src/modules/day-score/application/use-cases/get-day-score.use-case.ts`
- Create: `apps/api/src/modules/day-score/application/use-cases/get-day-score.use-case.spec.ts`

**Interfaces:**
- Consumes: `SLEEP_REPOSITORY`/`SleepRepositoryPort` (existing, `apps/api/src/modules/sleep/domain/sleep-repository.port.ts` — `findByUser(userId): Promise<SleepEntryEntity[]>`, entities carry `date: Date`, `durationH: number`, `quality: number`, `score: number | null`); `INJURY_REPOSITORY`/`InjuryRepositoryPort` (existing — `findInjuriesByUser(userId): Promise<(InjuryEntity & { logs: InjuryLogEntity[] })[]>`); `ACTIVITY_REPOSITORY`/`ActivityRepositoryPort` (existing, DI token is a `Symbol`, imported as `ACTIVITY_REPOSITORY` — `findByUserFrom(userId, since: Date): Promise<ActivityEntity[]>`, entities carry `performedAt: Date`, `durationMin: number | null`, `avgHeartRate: number | null`); `HealthMetricsService` (existing concrete class, `apps/api/src/modules/health-metrics/health-metrics.service.ts` — `findRange(userId, from?, to?, source?)` returns Prisma `DailyHealthMetric[]` rows with `date`, `hrv`, `restingHeartRate`); all of Task 2's math functions and Task 3's `buildDayScoreInsight`.
- Produces: `GetDayScoreUseCase.execute(userId: string, date?: Date): Promise<DayScoreResult>` and the exported `DayScoreResult` type (matching spec section 3's response shape exactly). Consumed by Task 5 (`DayScoreController`).

- [ ] **Step 1: Implement the use-case**

```ts
// apps/api/src/modules/day-score/application/use-cases/get-day-score.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { SLEEP_REPOSITORY, SleepRepositoryPort } from '../../../sleep/domain/sleep-repository.port';
import { INJURY_REPOSITORY, InjuryRepositoryPort } from '../../../injury/domain/injury-repository.port';
import { ACTIVITY_REPOSITORY, ActivityRepositoryPort } from '../../../activity/domain/activity-repository.port';
import { HealthMetricsService } from '../../../health-metrics/health-metrics.service';
import {
  DAY_SCORE_WEIGHTS, combineWeightedScore, computeDailyLoad, computeAcuteChronicRatio,
  loadScoreFromRatio, loadStatusFromRatio, sleepScoreFromEntry, hrvScoreFromValues, painScoreFromLogs, scoreLabel,
} from '../../domain/day-score-math';
import { buildDayScoreInsight } from '../../domain/day-score-insights';

export interface DayScoreResult {
  score: number | null;
  label: string | null;
  explanation: string | null;
  tip: string | null;
  components: {
    sleep: { score: number | null; durationH: number | null; label: string | null };
    hrv: { score: number | null; valueMs: number | null; deltaPct: number | null };
    pain: { score: number | null; avgPainLevel: number | null };
    load: { score: number | null; ratio: number | null; status: 'alta' | 'normal' | 'baja' | null };
  };
  weights: typeof DAY_SCORE_WEIGHTS;
}

const WINDOW_DAYS = 28;

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDaysUtc(d: Date, delta: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + delta);
  return copy;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class GetDayScoreUseCase {
  constructor(
    @Inject(SLEEP_REPOSITORY) private readonly sleepRepo: SleepRepositoryPort,
    @Inject(INJURY_REPOSITORY) private readonly injuryRepo: InjuryRepositoryPort,
    @Inject(ACTIVITY_REPOSITORY) private readonly activityRepo: ActivityRepositoryPort,
    private readonly healthMetrics: HealthMetricsService,
  ) {}

  async execute(userId: string, date: Date = new Date()): Promise<DayScoreResult> {
    const target = startOfUtcDay(date);
    const windowStart = addDaysUtc(target, -(WINDOW_DAYS - 1));

    const [sleepEntries, injuries, activities, healthMetricRows] = await Promise.all([
      this.sleepRepo.findByUser(userId),
      this.injuryRepo.findInjuriesByUser(userId),
      this.activityRepo.findByUserFrom(userId, windowStart),
      this.healthMetrics.findRange(userId, windowStart, target),
    ]);

    // One "best" health-metric row per day: prefer whichever row actually carries hrv/restingHeartRate,
    // since a manual and a COROS row can coexist for the same date and only COROS populates those fields.
    const healthByDay = new Map<string, { hrv: number | null; restingHeartRate: number | null }>();
    for (const row of healthMetricRows) {
      const key = dateKey(row.date);
      const existing = healthByDay.get(key);
      const candidate = { hrv: row.hrv, restingHeartRate: row.restingHeartRate };
      if (!existing || (existing.hrv == null && candidate.hrv != null)) {
        healthByDay.set(key, candidate);
      }
    }

    // ── Sleep ──
    const todaySleep = sleepEntries.find((e) => dateKey(e.date) === dateKey(target)) ?? null;
    const sleepScore = sleepScoreFromEntry(todaySleep ? { score: todaySleep.score, quality: todaySleep.quality } : null);

    // ── HRV ──
    const todayHrv = healthByDay.get(dateKey(target))?.hrv ?? null;
    const previous7dHrv: number[] = [];
    for (let i = 1; i <= 7; i++) {
      const v = healthByDay.get(dateKey(addDaysUtc(target, -i)))?.hrv;
      if (v != null) previous7dHrv.push(v);
    }
    const hrvScore = hrvScoreFromValues(todayHrv, previous7dHrv);
    const hrvBaseline = previous7dHrv.length > 0 ? previous7dHrv.reduce((s, v) => s + v, 0) / previous7dHrv.length : null;
    const hrvDeltaPct = todayHrv != null && hrvBaseline != null && hrvBaseline !== 0
      ? Math.round(((todayHrv - hrvBaseline) / hrvBaseline) * 100)
      : null;

    // ── Pain ──
    const activeInjuries = injuries.filter((i) => i.status !== 'resolved');
    const hasActiveInjuries = activeInjuries.length > 0;
    const activeInjuryIds = new Set(activeInjuries.map((i) => i.id));
    const todayPainLevels = injuries
      .flatMap((i) => i.logs)
      .filter((log) => activeInjuryIds.has(log.injuryId) && dateKey(log.date) === dateKey(target))
      .map((log) => log.painLevel);
    const painScore = painScoreFromLogs(todayPainLevels, hasActiveInjuries);
    const avgPainLevel = todayPainLevels.length > 0
      ? Number((todayPainLevels.reduce((s, v) => s + v, 0) / todayPainLevels.length).toFixed(1))
      : null;

    // ── Training load ──
    const dailyLoads: number[] = [];
    for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
      const day = addDaysUtc(target, -i);
      const dayKey = dateKey(day);
      const daySessions = activities
        .filter((a) => dateKey(a.performedAt) === dayKey)
        .map((a) => ({ durationMin: a.durationMin ?? 0, avgHeartRate: a.avgHeartRate }));
      const restingHr = healthByDay.get(dayKey)?.restingHeartRate ?? null;
      dailyLoads.push(computeDailyLoad(daySessions, restingHr));
    }
    const last7DailyLoads = dailyLoads.slice(-7);
    const ratio = computeAcuteChronicRatio(last7DailyLoads, dailyLoads);
    const loadScore = loadScoreFromRatio(ratio);
    const loadStatus = loadStatusFromRatio(ratio);

    // ── Combine ──
    const score = combineWeightedScore({ sleep: sleepScore, hrv: hrvScore, pain: painScore, load: loadScore });
    const insight = score !== null
      ? buildDayScoreInsight({ sleepScore, hrvScore, painScore, loadStatus })
      : null;

    return {
      score,
      label: score !== null ? scoreLabel(score) : null,
      explanation: insight?.explanation ?? null,
      tip: insight?.tip ?? null,
      components: {
        sleep: { score: sleepScore, durationH: todaySleep?.durationH ?? null, label: todaySleep ? (todaySleep.score != null ? null : null) : null },
        hrv: { score: hrvScore, valueMs: todayHrv, deltaPct: hrvDeltaPct },
        pain: { score: painScore, avgPainLevel },
        load: { score: loadScore, ratio, status: loadStatus },
      },
      weights: DAY_SCORE_WEIGHTS,
    };
  }
}
```

Note: `components.sleep.label` is left `null` here (it's a display-only field for the frontend to fill from its own `sleepScoreLabel()` helper if desired — the backend doesn't duplicate that string mapping since it's only used cosmetically in the sheet).

- [ ] **Step 2: Write the tests**

```ts
// apps/api/src/modules/day-score/application/use-cases/get-day-score.use-case.spec.ts
import { GetDayScoreUseCase } from './get-day-score.use-case';
import { SleepRepositoryPort } from '../../../sleep/domain/sleep-repository.port';
import { InjuryRepositoryPort } from '../../../injury/domain/injury-repository.port';
import { ActivityRepositoryPort } from '../../../activity/domain/activity-repository.port';
import { HealthMetricsService } from '../../../health-metrics/health-metrics.service';

const TARGET = new Date('2026-09-09T00:00:00.000Z');

function makeDeps() {
  const sleepRepo = { findByUser: jest.fn().mockResolvedValue([]) } as unknown as jest.Mocked<SleepRepositoryPort>;
  const injuryRepo = { findInjuriesByUser: jest.fn().mockResolvedValue([]) } as unknown as jest.Mocked<InjuryRepositoryPort>;
  const activityRepo = { findByUserFrom: jest.fn().mockResolvedValue([]) } as unknown as jest.Mocked<ActivityRepositoryPort>;
  const healthMetrics = { findRange: jest.fn().mockResolvedValue([]) } as unknown as jest.Mocked<HealthMetricsService>;
  return { sleepRepo, injuryRepo, activityRepo, healthMetrics };
}

describe('GetDayScoreUseCase', () => {
  it('returns a null score when there is no data at all', async () => {
    const { sleepRepo, injuryRepo, activityRepo, healthMetrics } = makeDeps();
    const useCase = new GetDayScoreUseCase(sleepRepo, injuryRepo, activityRepo, healthMetrics);

    const result = await useCase.execute('user-1', TARGET);

    expect(result.score).toBeNull();
    expect(result.label).toBeNull();
    expect(result.components.pain.score).toBe(100); // no active injuries -> always 100
  });

  it('combines sleep, HRV, and pain when present, with load excluded (no activity in window)', async () => {
    const { sleepRepo, injuryRepo, activityRepo, healthMetrics } = makeDeps();
    sleepRepo.findByUser.mockResolvedValue([
      { id: 's1', userId: 'user-1', date: TARGET, durationH: 7, quality: 4, score: null, source: 'manual' } as never,
    ]);
    injuryRepo.findInjuriesByUser.mockResolvedValue([]); // no active injuries -> pain = 100
    healthMetrics.findRange.mockResolvedValue([
      { date: TARGET, hrv: 66, restingHeartRate: 60 } as never,
      { date: new Date('2026-09-08'), hrv: 60, restingHeartRate: 60 } as never,
      { date: new Date('2026-09-07'), hrv: 60, restingHeartRate: 60 } as never,
      { date: new Date('2026-09-06'), hrv: 60, restingHeartRate: 60 } as never,
    ]);
    const useCase = new GetDayScoreUseCase(sleepRepo, injuryRepo, activityRepo, healthMetrics);

    const result = await useCase.execute('user-1', TARGET);

    expect(result.components.sleep.score).toBe(80); // quality 4 * 20
    expect(result.components.hrv.score).toBe(60);   // ratio 1.1 -> 50+10
    expect(result.components.pain.score).toBe(100);
    expect(result.components.load.score).toBeNull(); // no activity in 28-day window
    expect(result.score).not.toBeNull();
    expect(result.label).not.toBeNull();
    expect(result.explanation).not.toBeNull();
    expect(result.tip).not.toBeNull();
  });

  it('scopes pain to active injuries only, ignoring resolved ones', async () => {
    const { sleepRepo, injuryRepo, activityRepo, healthMetrics } = makeDeps();
    injuryRepo.findInjuriesByUser.mockResolvedValue([
      {
        id: 'inj-1', userId: 'user-1', name: 'Rodilla', startDate: new Date('2026-08-01'), status: 'active',
        phaseLabel: null, phaseStartDate: null, phaseTargetSessions: null,
        logs: [{ id: 'l1', injuryId: 'inj-1', userId: 'user-1', date: TARGET, painLevel: 4, didRehab: true }],
      } as never,
      {
        id: 'inj-2', userId: 'user-1', name: 'Tobillo (resuelto)', startDate: new Date('2026-01-01'), status: 'resolved',
        phaseLabel: null, phaseStartDate: null, phaseTargetSessions: null,
        logs: [{ id: 'l2', injuryId: 'inj-2', userId: 'user-1', date: TARGET, painLevel: 9, didRehab: false }],
      } as never,
    ]);
    const useCase = new GetDayScoreUseCase(sleepRepo, injuryRepo, activityRepo, healthMetrics);

    const result = await useCase.execute('user-1', TARGET);

    // only inj-1's log (painLevel 4) counts; inj-2 is resolved and excluded
    expect(result.components.pain.avgPainLevel).toBe(4);
    expect(result.components.pain.score).toBe(60); // (10-4)*10
  });

  it('computes training load from activities in the 28-day window', async () => {
    const { sleepRepo, injuryRepo, activityRepo, healthMetrics } = makeDeps();
    activityRepo.findByUserFrom.mockResolvedValue([
      { id: 'a1', userId: 'user-1', performedAt: TARGET, durationMin: 60, avgHeartRate: 120, type: 'run', source: 'manual' } as never,
    ]);
    healthMetrics.findRange.mockResolvedValue([
      { date: TARGET, hrv: null, restingHeartRate: 60 } as never,
    ]);
    const useCase = new GetDayScoreUseCase(sleepRepo, injuryRepo, activityRepo, healthMetrics);

    const result = await useCase.execute('user-1', TARGET);

    // one session in a 28-day window with only that one active day: 7d avg = 28d avg -> ratio 1 -> ideal -> score 100
    expect(result.components.load.ratio).toBe(1);
    expect(result.components.load.score).toBe(100);
    expect(result.components.load.status).toBe('normal');
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `cd apps/api && npx jest get-day-score.use-case.spec.ts`
Expected: 4 tests pass.

- [ ] **Step 4: Compile check**

Run: `cd apps/api && npx tsc --noEmit`
Expected: no new errors outside the pre-existing `.spec.ts` jest-typing gap.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/day-score/application/
git commit -m "feat(day-score): add GetDayScoreUseCase orchestration"
```

---

## Task 5: DayScoreController + module wiring

**Files:**
- Create: `apps/api/src/modules/day-score/presentation/day-score.controller.ts`
- Create: `apps/api/src/modules/day-score/day-score.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: `GetDayScoreUseCase` (Task 4); `AUTH_SERVICE`/`AuthServicePort` (existing, `apps/api/src/modules/auth/domain/auth-service.port.ts`, used identically by `HealthMetricsController`).
- Produces: `GET /day-score?date=YYYY-MM-DD`. Consumed by Task 7 (`DayScoreCard`).

- [ ] **Step 1: Implement the controller**

```ts
// apps/api/src/modules/day-score/presentation/day-score.controller.ts
import { Controller, Get, Inject, Query, Req, UnauthorizedException } from '@nestjs/common';
import { AUTH_SERVICE, AuthServicePort } from '../../auth/domain/auth-service.port';
import { GetDayScoreUseCase } from '../application/use-cases/get-day-score.use-case';

@Controller('day-score')
export class DayScoreController {
  constructor(
    private readonly getDayScore: GetDayScoreUseCase,
    @Inject(AUTH_SERVICE) private readonly authService: AuthServicePort,
  ) {}

  @Get()
  async get(@Req() req: any, @Query('date') date?: string) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new UnauthorizedException();
    return this.getDayScore.execute(session.user.id, date ? new Date(date) : undefined);
  }
}
```

- [ ] **Step 2: Implement the module**

```ts
// apps/api/src/modules/day-score/day-score.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SleepModule } from '../sleep/sleep.module';
import { InjuryModule } from '../injury/injury.module';
import { ActivityModule } from '../activity/activity.module';
import { HealthMetricsModule } from '../health-metrics/health-metrics.module';
import { GetDayScoreUseCase } from './application/use-cases/get-day-score.use-case';
import { DayScoreController } from './presentation/day-score.controller';

@Module({
  imports: [AuthModule, SleepModule, InjuryModule, ActivityModule, HealthMetricsModule],
  controllers: [DayScoreController],
  providers: [GetDayScoreUseCase],
})
export class DayScoreModule {}
```

- [ ] **Step 3: Register in `app.module.ts`**

Add the import statement near the other feature-module imports:

```ts
import { DayScoreModule } from './modules/day-score/day-score.module';
```

Add `DayScoreModule` to the `imports` array (any position among the other feature modules is fine — order in this array isn't semantically significant, matching the existing pattern):

```ts
    CorosModule,
    DayScoreModule,
    PushModule,
```

- [ ] **Step 4: Verify build**

Run: `cd apps/api && npm run build`
Expected: succeeds (this is the real DI-wiring check — `SleepModule`/`InjuryModule`/`ActivityModule`/`HealthMetricsModule` must actually export what `DayScoreModule` needs; confirm no `UnknownDependenciesException` risk by checking each of those modules' `exports` arrays includes `SLEEP_REPOSITORY`, `INJURY_REPOSITORY`, `ACTIVITY_REPOSITORY`, and `HealthMetricsService` respectively — they already do, per this session's prior exploration).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/day-score/presentation/ apps/api/src/modules/day-score/day-score.module.ts apps/api/src/app.module.ts
git commit -m "feat(day-score): wire DayScoreModule into the app"
```

---

## Task 6: `ProgressChart` — average reference line

**Files:**
- Modify: `apps/web/components/progress-chart.tsx`

**Interfaces:**
- Produces: `ProgressChart` gains an optional `averageValue?: number` prop that draws a dashed horizontal reference line at that Y value. Backward compatible — omitting it changes nothing. Consumed by Task 9's `PasosDetailSheet` ("Tu media 7 días" line).

- [ ] **Step 1: Add the `ReferenceLine` import and prop**

```ts
// apps/web/components/progress-chart.tsx — update the recharts import
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
```

```ts
interface ProgressChartProps {
  data: ChartPoint[];
  type: 'bar' | 'line';
  color: string;
  formatValue?: (v: number) => string;
  formatYTick?: (v: number) => string;
  averageValue?: number;
}
```

```ts
export function ProgressChart({ data, type, color, formatValue, formatYTick, averageValue }: ProgressChartProps) {
```

- [ ] **Step 2: Widen the Y domain to include the average, and render the line in both branches**

The Y-domain calculation must account for `averageValue` too, or the dashed line could render outside the visible chart area on a day with unusually low/high values. Update the domain block:

```ts
  const validValues = data.filter((p) => p.value != null).map((p) => Number(p.value));
  if (averageValue != null) validValues.push(averageValue);
  const dataMin = validValues.length > 0 ? Math.min(...validValues) : 0;
  const dataMax = validValues.length > 0 ? Math.max(...validValues) : 100;
```

(rest of the domain block is unchanged — it already derives `pad`/`yDomain` from `dataMin`/`dataMax`.)

In the `bar` branch, add the reference line right after `<Tooltip .../>`:

```tsx
            <Tooltip content={tooltipContent} cursor={{ fill: '#13201a', fillOpacity: 0.04 }} />
            {averageValue != null && (
              <ReferenceLine y={averageValue} stroke="#13201a" strokeOpacity={0.25} strokeDasharray="4 4" />
            )}
            <Bar dataKey="value" fill={color} radius={[5, 5, 0, 0]} />
```

In the `line` branch, same placement:

```tsx
            <Tooltip content={tooltipContent} cursor={false} />
            {averageValue != null && (
              <ReferenceLine y={averageValue} stroke="#13201a" strokeOpacity={0.25} strokeDasharray="4 4" />
            )}
            <Line
```

- [ ] **Step 3: Verify existing usage still compiles**

`apps/web/components/sueno-screen.tsx`'s `<ProgressChart data={chartData} type="bar" color="#d9c4a1" formatValue={(v) => fmtH(v)} />` call doesn't pass `averageValue` — confirm it still compiles (optional prop, no change needed there).

Run: `cd apps/web && npm run build`
Expected: succeeds, no new type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/progress-chart.tsx
git commit -m "feat(web): add optional average reference line to ProgressChart"
```

---

## Task 7: `DayScoreCard` — display, no interaction yet

**Files:**
- Create: `apps/web/components/day-score-card.tsx`
- Modify: `apps/web/components/today-screen.tsx`

**Interfaces:**
- Consumes: `GET /day-score?date=` (Task 5); `getJson` from `apps/web/lib/api.ts`.
- Produces: `DayScoreCard({ selectedDate }: { selectedDate: string })`, exporting the `DayScoreResponse` type (mirrors the backend `DayScoreResult` shape from Task 4). Consumed by Task 8 (adds the tap-to-open sheet on top of this file).

This task is display-only (no tap interaction) — Task 8 adds that. Deliberately split so each task has its own complete, buildable increment.

- [ ] **Step 1: Implement the card**

```tsx
// apps/web/components/day-score-card.tsx
'use client';

import { useEffect, useState } from 'react';
import { Moon, Activity, Droplet } from 'lucide-react';
import { getJson } from '../lib/api';

export type DayScoreResponse = {
  score: number | null;
  label: string | null;
  explanation: string | null;
  tip: string | null;
  components: {
    sleep: { score: number | null; durationH: number | null; label: string | null };
    hrv: { score: number | null; valueMs: number | null; deltaPct: number | null };
    pain: { score: number | null; avgPainLevel: number | null };
    load: { score: number | null; ratio: number | null; status: 'alta' | 'normal' | 'baja' | null };
  };
  weights: { sleep: number; hrv: number; pain: number; load: number };
};

const RADIUS = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function fmtSleepH(h: number): string {
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return mm === 0 ? `${hh}h` : `${hh}h ${mm}min`;
}

export function DayScoreCard({ selectedDate }: { selectedDate: string }) {
  const [data, setData] = useState<DayScoreResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    getJson<DayScoreResponse>(`/day-score?date=${selectedDate}`)
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => { if (!cancelled) setData(null); });
    return () => { cancelled = true; };
  }, [selectedDate]);

  if (!data || data.score == null) return null;

  const offset = CIRCUMFERENCE * (1 - data.score / 100);
  const { sleep, hrv, pain } = data.components;

  return (
    <div className="rounded-4xl bg-white shadow-card p-5 space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30">Estado de hoy</p>

      <div className="flex items-center gap-4">
        <div className="relative h-[76px] w-[76px] flex-shrink-0">
          <svg width="76" height="76" viewBox="0 0 76 76">
            <circle cx="38" cy="38" r={RADIUS} fill="none" stroke="#13201a14" strokeWidth="8" />
            <circle
              cx="38" cy="38" r={RADIUS} fill="none" stroke="#54715a" strokeWidth="8"
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset} strokeLinecap="round"
              transform="rotate(-90 38 38)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-ink leading-none">{data.score}</span>
            <span className="text-[9px] text-ink/30 mt-0.5">/ 100</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-ink leading-snug">{data.label}</p>
          {data.explanation && (
            <p className="text-xs text-ink/50 mt-1 leading-relaxed">{data.explanation}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-ink/5">
        <div className="flex flex-col items-center gap-1 pt-3">
          <div className="flex items-center gap-1 text-ink/30">
            <Moon size={11} />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Sueño</span>
          </div>
          <span className="text-sm font-bold text-ink">
            {sleep.durationH != null ? fmtSleepH(sleep.durationH) : '--'}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 pt-3">
          <div className="flex items-center gap-1 text-ink/30">
            <Activity size={11} />
            <span className="text-[10px] font-semibold uppercase tracking-wide">HRV</span>
          </div>
          <span className="text-sm font-bold text-ink">
            {hrv.valueMs != null ? `${hrv.valueMs} ms` : '--'}
          </span>
          {hrv.deltaPct != null && (
            <span className={`text-[10px] font-medium ${hrv.deltaPct < 0 ? 'text-ember' : 'text-moss'}`}>
              {hrv.deltaPct > 0 ? '↑' : '↓'} {Math.abs(hrv.deltaPct)}%
            </span>
          )}
        </div>
        <div className="flex flex-col items-center gap-1 pt-3">
          <div className="flex items-center gap-1 text-ink/30">
            <Droplet size={11} />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Dolor</span>
          </div>
          <span className="text-sm font-bold text-ink">
            {pain.avgPainLevel != null ? `${pain.avgPainLevel}/10` : '--'}
          </span>
        </div>
      </div>

      {data.tip && (
        <div className="rounded-2xl bg-moss-light px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-moss/70">Hoy</p>
          <p className="text-sm text-ink/80 mt-0.5">{data.tip}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `today-screen.tsx`, removing the old score card**

Read the current file. Remove the `calcDayScore` function, the `dayScore`/`scoreConfig` variable computations, and the `Zap`/other now-unused imports this leaves behind (check each import is still used elsewhere in the file before removing it — `Zap` is still used for the "Lesión" row icon, keep it).

Add the import:
```tsx
import { DayScoreCard } from './day-score-card';
```

Replace this block:
```tsx
        {/* ── Estado de hoy ─────────────────────────────────── */}
        <div className="rounded-4xl bg-white shadow-card px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30">Estado de hoy</p>
            <p className={`text-base font-bold mt-0.5 ${scoreConfig.color}`}>{scoreConfig.label}</p>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold leading-none ${scoreConfig.color}`}>{dayScore}</p>
            <p className="text-[10px] text-ink/30 mt-0.5">/ 100</p>
          </div>
        </div>
```

with:
```tsx
        {/* ── Estado de hoy ─────────────────────────────────── */}
        <DayScoreCard selectedDate={selectedDate} />
```

- [ ] **Step 3: Verify**

Run: `cd apps/web && npm run build`
Expected: succeeds — this also confirms no leftover reference to the removed `dayScore`/`scoreConfig`/`calcDayScore` symbols anywhere else in the file (a stale reference would be a compile error).

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/day-score-card.tsx apps/web/components/today-screen.tsx
git commit -m "feat(web): add DayScoreCard, replacing the old static score card"
```

---

## Task 8: `DayScoreDetailSheet` + tap wiring + Progreso navigation

**Files:**
- Create: `apps/web/components/day-score-detail-sheet.tsx`
- Modify: `apps/web/components/day-score-card.tsx`
- Modify: `apps/web/components/today-screen.tsx`
- Modify: `apps/web/components/app-shell.tsx`

**Interfaces:**
- Consumes: `DayScoreResponse` (Task 7); `sleepScoreLabel` from `apps/web/lib/sleep.ts` (existing).
- Produces: `DayScoreDetailSheet({ isOpen, onClose, data, onNavToProgreso })`. `DayScoreCard` gains an `onNavToProgreso?: () => void` prop it forwards to the sheet. `TodayScreen` gains `onNavToProgreso?: () => void`, threaded the same way `onNavToActividades` already is.

- [ ] **Step 1: Implement the sheet**

```tsx
// apps/web/components/day-score-detail-sheet.tsx
'use client';

import { X } from 'lucide-react';
import { Portal } from './portal';
import { sleepScoreLabel } from '../lib/sleep';
import type { DayScoreResponse } from './day-score-card';

function fmtSleepH(h: number): string {
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return mm === 0 ? `${hh}h` : `${hh}h ${mm}min`;
}

export function DayScoreDetailSheet({
  isOpen,
  onClose,
  data,
  onNavToProgreso,
}: {
  isOpen: boolean;
  onClose: () => void;
  data: DayScoreResponse;
  onNavToProgreso?: () => void;
}) {
  if (!isOpen || data.score == null) return null;
  const { sleep, hrv, pain } = data.components;

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[70] animate-slide-up">
        <div className="mx-auto max-w-md bg-canvas rounded-t-4xl shadow-card-lg overflow-y-auto" style={{ maxHeight: '85vh' }}>
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-ink/20" />
          </div>

          <div className="px-5 pt-2 pb-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30">Por qué {data.score}</p>
                <p className="text-xl font-bold text-ink mt-0.5">{data.label}</p>
              </div>
              <button type="button" onClick={onClose}
                className="h-8 w-8 rounded-full bg-canvas-light flex items-center justify-center flex-shrink-0">
                <X size={15} className="text-ink/60" />
              </button>
            </div>

            {data.explanation && <p className="text-sm text-ink/60 leading-relaxed">{data.explanation}</p>}

            <div className="rounded-3xl bg-white shadow-card px-4 divide-y divide-ink/5">
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-ink/50">Sueño anoche</span>
                <span className="text-sm font-semibold text-ink">
                  {sleep.durationH != null
                    ? `${fmtSleepH(sleep.durationH)} · ${sleepScoreLabel(sleep.score ?? 0).toLowerCase()}`
                    : 'Sin datos'}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-ink/50">HRV</span>
                <span className="text-sm font-semibold text-ink">
                  {hrv.valueMs != null
                    ? `${hrv.valueMs} ms${hrv.deltaPct != null ? ` · ${hrv.deltaPct > 0 ? '↑' : '↓'}${Math.abs(hrv.deltaPct)}%` : ''}`
                    : 'Sin datos'}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-ink/50">Dolor</span>
                <span className="text-sm font-semibold text-ink">
                  {pain.avgPainLevel != null ? `${pain.avgPainLevel}/10` : 'Sin lesiones activas'}
                </span>
              </div>
              <div className="py-3 space-y-1">
                <span className="text-sm text-ink/50">Cómo se calcula</span>
                <p className="text-xs text-ink/40">
                  sueño {data.weights.sleep}% · HRV {data.weights.hrv}% · dolor {data.weights.pain}% · carga {data.weights.load}%
                </p>
              </div>
            </div>

            {onNavToProgreso && (
              <button
                type="button"
                onClick={() => { onClose(); onNavToProgreso(); }}
                className="w-full rounded-3xl bg-ink py-4 text-sm font-semibold text-white"
              >
                Ver histórico en Progreso
              </button>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
```

- [ ] **Step 2: Wire the tap interaction into `DayScoreCard`**

In `apps/web/components/day-score-card.tsx`:

```tsx
import { DayScoreDetailSheet } from './day-score-detail-sheet';
```

Add local state and the prop:
```tsx
export function DayScoreCard({ selectedDate, onNavToProgreso }: { selectedDate: string; onNavToProgreso?: () => void }) {
  const [data, setData] = useState<DayScoreResponse | null>(null);
  const [showDetail, setShowDetail] = useState(false);
```

Wrap the card's outer `<div className="rounded-4xl bg-white shadow-card p-5 space-y-4">` in a `<button type="button" onClick={() => setShowDetail(true)} className="w-full text-left">` (the existing div keeps its className; the new button just adds the tap target, matching how "Movimiento hoy" already uses a `<button>` wrapper for its whole card body). Then, right before the component's closing `</div>` return, add:

```tsx
      {data && <DayScoreDetailSheet isOpen={showDetail} onClose={() => setShowDetail(false)} data={data} onNavToProgreso={onNavToProgreso} />}
```

- [ ] **Step 3: Thread `onNavToProgreso` through `TodayScreen` and `AppShell`**

In `apps/web/components/today-screen.tsx`:
```tsx
export function TodayScreen({ onNavToActividades, onNavToProgreso }: { onNavToActividades?: () => void; onNavToProgreso?: () => void } = {}) {
```
and pass it down: `<DayScoreCard selectedDate={selectedDate} onNavToProgreso={onNavToProgreso} />`.

In `apps/web/components/app-shell.tsx`, find the line `{activeTab === 'hoy' && <TodayScreen onNavToActividades={() => switchTab('actividades')} />}` and add the new prop:
```tsx
{activeTab === 'hoy' && <TodayScreen onNavToActividades={() => switchTab('actividades')} onNavToProgreso={() => switchTab('progreso')} />}
```

- [ ] **Step 4: Verify**

Run: `cd apps/web && npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/day-score-detail-sheet.tsx apps/web/components/day-score-card.tsx apps/web/components/today-screen.tsx apps/web/components/app-shell.tsx
git commit -m "feat(web): add DayScoreDetailSheet and wire the Estado de hoy tap interaction"
```

---

## Task 9: "Movimiento hoy" restyle + `PasosDetailSheet`

The current "Movimiento hoy" card is a single `<button>` that opens `MovementSheet` (a **manual edit** form for steps/calories — not a history view). The new design taps the steps row specifically to open a **history** view instead. Both capabilities are kept: editing moves to a small pencil-icon button in the card's corner (matching the edit-icon-button convention already used in `sueno-screen.tsx`'s history rows), and tapping the steps block opens the new `PasosDetailSheet`.

**Files:**
- Modify: `apps/web/lib/health-metrics.ts`
- Modify: `apps/web/components/today-screen.tsx`
- Create: `apps/web/components/pasos-detail-sheet.tsx`

**Interfaces:**
- Consumes: `dailyHealthMetrics` from `useRecoveryStore` (already fully loaded — `loadTodayData` fetches health metrics from `2010-01-01`, confirmed this session, no new fetch needed); `ProgressChart`'s new `averageValue` prop (Task 6).
- Produces: `pickBySourcePrecedence` moves from a private function in `today-screen.tsx` to an exported one in `apps/web/lib/health-metrics.ts`, reused by both files. `PasosDetailSheet({ isOpen, onClose, healthMetrics, selectedDate, onNavToProgreso })`.

- [ ] **Step 1: Move `pickBySourcePrecedence` into `lib/health-metrics.ts`**

Add to `apps/web/lib/health-metrics.ts` (needs `sameDay` from `./date`):

```ts
import { sameDay } from './date';

// Manual entries win over COROS ones for the same day; COROS is only used as a fallback
// when no manual entry exists for that day.
export function pickBySourcePrecedence<T extends { date: string; source?: string }>(
  entries: T[],
  date: string,
): T | undefined {
  const sameDayEntries = entries.filter((e) => sameDay(e.date, date));
  return sameDayEntries.find((e) => (e.source ?? 'manual') === 'manual') ?? sameDayEntries[0];
}
```

In `apps/web/components/today-screen.tsx`: delete the local `pickBySourcePrecedence` function definition, and import it instead:
```ts
import { ACTIVE_CALORIES_GOAL, getMovementPercent, pickBySourcePrecedence, STEPS_GOAL } from '../lib/health-metrics';
```

- [ ] **Step 2: Restyle the "Movimiento de hoy" card**

Replace the whole block (the `<button onClick={() => setShowMovementSheet(true)} ...>` wrapping steps+calories) with:

```tsx
        {/* ── Movimiento de hoy ──────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
            Movimiento de hoy
          </p>
          <div className="rounded-4xl bg-white shadow-card px-5 py-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-bold text-ink">Movimiento hoy</p>
                <p className="text-xs text-ink/40 mt-0.5">{overallPct}% objetivo diario</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMovementSheet(true)}
                className="h-9 w-9 rounded-xl bg-canvas flex items-center justify-center flex-shrink-0"
                aria-label="Editar movimiento"
              >
                <Pencil size={14} className="text-ink/35" />
              </button>
            </div>
            {/* Pasos — tap abre historial */}
            <button type="button" onClick={() => setShowPasosSheet(true)} className="w-full space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Footprints size={13} className="text-ink/40" />
                  <span className="text-xs text-ink/50">Pasos</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-ink">{movementSteps.toLocaleString('es-ES')}</span>
                  <span className="text-[10px] text-ink/30">/ {STEPS_GOAL.toLocaleString('es-ES')}</span>
                </div>
              </div>
              <div className="w-full bg-ink/[0.08] rounded-full h-1.5">
                <div className="bg-moss h-1.5 rounded-full" style={{ width: `${stepsPct}%` }} />
              </div>
            </button>
            {/* Calorías */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Flame size={13} className="text-ember" />
                  <span className="text-xs text-ink/50">Calorías</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-ink">{movementActiveCalories}</span>
                  <span className="text-[10px] text-ink/30">/ {ACTIVE_CALORIES_GOAL} kcal</span>
                </div>
              </div>
              <div className="w-full bg-ink/[0.08] rounded-full h-1.5">
                <div className="bg-ember h-1.5 rounded-full" style={{ width: `${activeCaloriesPct}%` }} />
              </div>
            </div>
          </div>
        </div>
```

Add `Pencil` to the `lucide-react` import list, add `const [showPasosSheet, setShowPasosSheet] = useState(false);` next to the other `useState` declarations, and render `<PasosDetailSheet isOpen={showPasosSheet} onClose={() => setShowPasosSheet(false)} healthMetrics={dailyHealthMetrics} selectedDate={selectedDate} onNavToProgreso={onNavToProgreso} />` in the "Sheets" section alongside the other sheets. Import it: `import { PasosDetailSheet } from './pasos-detail-sheet';`.

- [ ] **Step 3: Implement `PasosDetailSheet`**

```tsx
// apps/web/components/pasos-detail-sheet.tsx
'use client';

import { X } from 'lucide-react';
import { Portal } from './portal';
import { ProgressChart } from './progress-chart';
import { pickBySourcePrecedence, STEPS_GOAL } from '../lib/health-metrics';
import { addDays } from '../lib/date';
import type { DailyHealthMetricEntry } from '../stores/recovery-store';

export function PasosDetailSheet({
  isOpen,
  onClose,
  healthMetrics,
  selectedDate,
  onNavToProgreso,
}: {
  isOpen: boolean;
  onClose: () => void;
  healthMetrics: DailyHealthMetricEntry[];
  selectedDate: string;
  onNavToProgreso?: () => void;
}) {
  if (!isOpen) return null;

  const last7Dates = Array.from({ length: 7 }, (_, i) => addDays(selectedDate, i - 6));
  const chartData = last7Dates.map((date) => {
    const entry = pickBySourcePrecedence(healthMetrics, date);
    const d = new Date(date + 'T12:00:00');
    const day = String(d.getDate()).padStart(2, '0');
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    return { label: `${day}/${mon}`, rangeLabel: `${day}/${mon}`, value: entry?.steps ?? 0, weekStart: date };
  });

  const todaySteps = chartData[chartData.length - 1]?.value ?? 0;
  const validDays = chartData.filter((p) => p.value > 0);
  const avg7d = validDays.length > 0
    ? Math.round(validDays.reduce((s, p) => s + (p.value as number), 0) / validDays.length)
    : 0;

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[70] animate-slide-up">
        <div className="mx-auto max-w-md bg-canvas rounded-t-4xl shadow-card-lg overflow-y-auto" style={{ maxHeight: '85vh' }}>
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-ink/20" />
          </div>

          <div className="px-5 pt-2 pb-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30">Pasos</p>
                <p className="text-xl font-bold text-ink mt-0.5">
                  {todaySteps.toLocaleString('es-ES')} de {STEPS_GOAL.toLocaleString('es-ES')}
                </p>
              </div>
              <button type="button" onClick={onClose}
                className="h-8 w-8 rounded-full bg-canvas-light flex items-center justify-center flex-shrink-0">
                <X size={15} className="text-ink/60" />
              </button>
            </div>

            <div className="rounded-4xl bg-white shadow-card px-4 pt-4 pb-3">
              <ProgressChart
                data={chartData}
                type="bar"
                color="#54715a"
                averageValue={avg7d}
                formatValue={(v) => `${v.toLocaleString('es-ES')} pasos`}
              />
            </div>

            <div className="rounded-3xl bg-white shadow-card px-4 divide-y divide-ink/5">
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-ink/50">Tu media 7 días</span>
                <span className="text-sm font-semibold text-ink">{avg7d.toLocaleString('es-ES')}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-ink/50">Objetivo diario</span>
                <span className="text-sm font-semibold text-ink">{STEPS_GOAL.toLocaleString('es-ES')}</span>
              </div>
            </div>

            {onNavToProgreso && (
              <button
                type="button"
                onClick={() => { onClose(); onNavToProgreso(); }}
                className="w-full rounded-3xl bg-ink py-4 text-sm font-semibold text-white"
              >
                Ver histórico en Progreso
              </button>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
```

Check `apps/web/lib/date.ts` exports an `addDays(dateStr: string, delta: number): string` function (used above) — it's already used elsewhere in `apps/web/lib/metrics.ts` per this session's earlier exploration (`addDays(today, -6)`), so it exists; import it the same way.

- [ ] **Step 4: Verify**

Run: `cd apps/web && npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/health-metrics.ts apps/web/components/today-screen.tsx apps/web/components/pasos-detail-sheet.tsx
git commit -m "feat(web): restyle Movimiento hoy and add PasosDetailSheet history view"
```

---

## Task 10: `AlimentacionDetailSheet`

**Files:**
- Modify: `apps/web/components/today-screen.tsx`
- Create: `apps/web/components/alimentacion-detail-sheet.tsx`

**Interfaces:**
- Consumes: `NutritionService.fetchMealsForDate(date)` (existing, `apps/web/lib/services.ts`); `useNutritionStore(s => s.mealsByDate[date])` (existing); `dailyNutrition: DailySummary` (existing, already loaded in `today-screen.tsx`); `movementActiveCalories` (existing local variable in `today-screen.tsx`, `todayMovement?.activeCalories ?? 0`).
- Produces: `AlimentacionDetailSheet({ isOpen, onClose, dailyNutrition, activeCalories, selectedDate })`.

"Gasto" in this sheet is `DailyHealthMetric.activeCalories` for the day — there is no real TDEE/energy-balance calculation in this codebase (confirmed this session), so the sheet labels it plainly as "activas" rather than implying a full metabolic estimate.

- [ ] **Step 1: Wire the tap target in `today-screen.tsx`**

In the "Alimentación" card, wrap the `dailyNutrition ? (<>...</>) : (<div>...</div>)` content block (everything below the header row with the "Añadir" button) in:
```tsx
<button type="button" onClick={() => setShowAlimentacionSheet(true)} disabled={!dailyNutrition} className="w-full text-left space-y-3 disabled:cursor-default">
```
closing `</button>` where that content block currently ends. The header row (icon, title, "Añadir" button) stays outside this new button, unchanged.

Add `const [showAlimentacionSheet, setShowAlimentacionSheet] = useState(false);` next to the other `useState` declarations, import `AlimentacionDetailSheet`, and render it in the "Sheets" section:
```tsx
{dailyNutrition && (
  <AlimentacionDetailSheet
    isOpen={showAlimentacionSheet}
    onClose={() => setShowAlimentacionSheet(false)}
    dailyNutrition={dailyNutrition}
    activeCalories={movementActiveCalories}
    selectedDate={selectedDate}
  />
)}
```

- [ ] **Step 2: Implement the sheet**

```tsx
// apps/web/components/alimentacion-detail-sheet.tsx
'use client';

import { useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { Portal } from './portal';
import { useNutritionStore } from '../stores/nutrition-store';
import { NutritionService } from '../lib/services';
import type { DailySummary } from '../stores/nutrition-store';

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Desayuno', lunch: 'Comida', snack: 'Snacks', dinner: 'Cena', extra: 'Extra',
};

export function AlimentacionDetailSheet({
  isOpen,
  onClose,
  dailyNutrition,
  activeCalories,
  selectedDate,
}: {
  isOpen: boolean;
  onClose: () => void;
  dailyNutrition: DailySummary;
  activeCalories: number;
  selectedDate: string;
}) {
  const meals = useNutritionStore((s) => s.mealsByDate[selectedDate]);

  useEffect(() => {
    if (isOpen) void NutritionService.fetchMealsForDate(selectedDate);
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  const balance = dailyNutrition.totalCalories - activeCalories;

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[70] animate-slide-up">
        <div className="mx-auto max-w-md bg-canvas rounded-t-4xl shadow-card-lg overflow-y-auto" style={{ maxHeight: '85vh' }}>
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-ink/20" />
          </div>

          <div className="px-5 pt-2 pb-8 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30">Alimentación hoy</p>
                <p className="text-xl font-bold text-ink mt-0.5">
                  {dailyNutrition.totalCalories.toLocaleString('es-ES')} / {dailyNutrition.caloriesTarget.toLocaleString('es-ES')} kcal
                </p>
              </div>
              <button type="button" onClick={onClose}
                className="h-8 w-8 rounded-full bg-canvas-light flex items-center justify-center flex-shrink-0">
                <X size={15} className="text-ink/60" />
              </button>
            </div>

            <div className="h-1.5 rounded-full bg-white overflow-hidden">
              <div className="h-full rounded-full bg-ember transition-all" style={{ width: `${Math.min(dailyNutrition.caloriesProgressPercent, 100)}%` }} />
            </div>
            <p className="text-xs text-ink/40">{dailyNutrition.caloriesProgressPercent}% del objetivo</p>

            <div className="rounded-3xl bg-white shadow-card px-4 divide-y divide-ink/5">
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-ink/50">Consumidas</span>
                <span className="text-sm font-semibold text-ink">{dailyNutrition.totalCalories.toLocaleString('es-ES')} kcal</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-ink/50">Calorías activas</span>
                <span className="text-sm font-semibold text-ink">{activeCalories.toLocaleString('es-ES')} kcal</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-ink/50">Balance</span>
                <span className={`text-sm font-semibold ${balance >= 0 ? 'text-ember' : 'text-moss'}`}>
                  {balance >= 0 ? '+' : ''}{balance} kcal
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">Comidas</p>
              <div className="rounded-3xl bg-white shadow-card px-4 divide-y divide-ink/5">
                {(meals ?? []).length === 0 ? (
                  <p className="py-3 text-sm text-ink/30">Sin comidas registradas</p>
                ) : (
                  (meals ?? []).map((meal) => (
                    <div key={meal.id} className="flex items-center justify-between py-3">
                      <span className="text-sm text-ink/70">{MEAL_TYPE_LABELS[meal.mealType] ?? meal.mealType}</span>
                      <span className="text-sm font-semibold text-ink">{meal.calories} kcal</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">Macros</p>
              <div className="rounded-3xl bg-white shadow-card px-4 py-3 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-ink/70">Proteína</span>
                    <span className="text-sm font-semibold text-ink">
                      {dailyNutrition.totalProtein} / {dailyNutrition.proteinTarget} g
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-canvas overflow-hidden">
                    <div className="h-full rounded-full bg-moss transition-all" style={{ width: `${Math.min(dailyNutrition.proteinProgressPercent, 100)}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink/70">Carbohidratos</span>
                  <span className="text-sm font-semibold text-ink">{dailyNutrition.totalCarbs} g</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink/70">Grasas</span>
                  <span className="text-sm font-semibold text-ink">{dailyNutrition.totalFat} g</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
```

- [ ] **Step 3: Verify**

Run: `cd apps/web && npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/today-screen.tsx apps/web/components/alimentacion-detail-sheet.tsx
git commit -m "feat(web): add AlimentacionDetailSheet"
```

---

## Task 11: "Tu día" section — activity plan, restyled

**Deviation from the design spec, discovered during planning:** the spec said to reactivate the dead `{false && planEntries.length > 0 && (...)}` block in `today-screen.tsx`. On closer inspection that block has a real bug — it checks `(a as any).activityType === entry.type`, but `ActivityEntry` has no `activityType` field (the real field is `type`), so its `isDone` is always `false` and every planned activity would show as never-completed. There is a **second, already-active** implementation right above it (`plannedActivityRows`, built via `getPlannedActivityMatches`, rendered inside "Registros de hoy" using the correct `activity.type === entry.type` match) that works correctly today. Reviving the dead/buggy block would duplicate that logic and reintroduce the bug. Instead: this task **restyles the already-working `plannedActivityRows` rendering** into its own "Tu día" section (matching the spec's visual intent), removes it from "Registros de hoy" (which keeps only Sueño/Peso/Lesión), and deletes the dead block. Net effect matches the spec's intent — activity-plan status gets its own styled section — without reviving broken code or duplicating the matching logic.

**Files:**
- Modify: `apps/web/components/today-screen.tsx`

**Interfaces:** none new — pure restyle/relocation of existing local state (`plannedActivityRows`, `dayActivities`, `PLAN_ICONS`, `MUSCLE_LABELS`, `formatActivitySummary`, `matchesPlanEntry` — all already defined in this file).

- [ ] **Step 1: Delete the dead block**

Delete the entire `{false && planEntries.length > 0 && (...)}` block (the one with the `activityType` bug) — it's unreachable code, safe to remove outright.

- [ ] **Step 2: Simplify "Registros de hoy" — drop the activity branch**

In the "Registros del día" section, remove the `{plannedActivityRows.length > 0 ? (...) : (<DailyRow icon={Dumbbell} label="Actividad" .../>)}` block entirely (both branches — activities move to the new "Tu día" section below). Change the header paragraph from the conditional `{planEntries.length > 0 ? 'Tareas de hoy' : 'Registros de hoy'}` to the constant `Registros de hoy` (no longer conditional, since this section no longer shows activities). The section keeps exactly: the `Sueño` `DailyRow`, the `Peso` `DailyRow`, and the conditional `Lesión` `DailyRow` — unchanged.

- [ ] **Step 3: Add the new "Tu día" section**

Insert this new section right after "Alimentación" (before "Activities detail" / "Active injury status"):

```tsx
        {/* ── Tu día ─────────────────────────────────────────── */}
        {planEntries.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
              Tu día
            </p>
            <div className="rounded-4xl bg-white shadow-card overflow-hidden">
              {plannedActivityRows.map(({ entry, matchedActivity }, index) => {
                const Icon = PLAN_ICONS[entry.type] ?? Target;
                const isDone = !!matchedActivity;
                const summary = matchedActivity ? formatActivitySummary(matchedActivity) : null;
                const details = [entry.time, entry.muscleGroups?.map((g) => MUSCLE_LABELS[g] ?? g).join(' · ')]
                  .filter(Boolean).join(' · ');

                return (
                  <button
                    key={`${entry.type}-${entry.label}-${index}`}
                    type="button"
                    onClick={() => {
                      if (matchedActivity) { setDetailActivity(matchedActivity); return; }
                      setEditActivity(undefined);
                      setDetailActivity(null);
                      setPrefillActivity({ type: entry.type, muscleGroups: entry.muscleGroups });
                      setShowAddActivity(true);
                    }}
                    className={`w-full flex items-center gap-3 px-5 py-4 text-left ${
                      index < plannedActivityRows.length - 1 ? 'border-b border-ink/5' : ''
                    } ${isDone ? '' : 'active:bg-canvas-light'}`}
                  >
                    <div className={`h-[22px] w-[22px] rounded-full flex items-center justify-center flex-shrink-0 ${
                      isDone ? 'bg-moss' : 'border-[1.5px] border-ink/15'
                    }`}>
                      {isDone && <Check size={11} strokeWidth={2.5} className="text-white" />}
                    </div>
                    <div className="h-9 w-9 rounded-xl bg-canvas flex items-center justify-center flex-shrink-0">
                      <Icon size={15} className={isDone ? 'text-moss' : 'text-ink/40'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold leading-snug ${isDone ? 'text-ink' : 'text-ink/70'}`}>
                        {entry.label}
                      </p>
                      <p className="text-xs text-ink/40 mt-0.5">
                        {isDone ? [summary, 'hecho'].filter(Boolean).join(' · ') : (details || 'Sin hora fijada')}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
```

(`plannedActivityRows`, `PLAN_ICONS`, `MUSCLE_LABELS`, `formatActivitySummary`, `Target`, `Check` are already imported/defined earlier in this file — no new imports needed.)

- [ ] **Step 4: Verify**

Run: `cd apps/web && npm run build`
Expected: succeeds.

Manually re-read the full file once to confirm: no orphaned reference to the deleted dead block, "Registros de hoy" shows exactly 2-3 rows (Sueño, Peso, optionally Lesión), and "Tu día" only renders when there's an actual weekly plan (`planEntries.length > 0`).

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/today-screen.tsx
git commit -m "feat(web): add restyled Tu dia section, remove dead/buggy plan block"
```

---

## Task 12: Injury phase — frontend types, edit UI, and "Lo que importa esta semana"

**Scope note:** the mockup's card shows "Semana 3 de 8" and "Próxima: Rehab · hoy 13:00" — neither is derivable from real data (there's no concept of "total weeks" and rehab isn't a distinct `ActivityType`, it's a boolean habit flag). This task shows what's honestly derivable: `phaseLabel`, completed/target sessions with a progress bar, and a plain-language remaining-sessions line. No fabricated week/next-session data.

**Files:**
- Modify: `apps/web/stores/recovery-store.ts`
- Modify: `apps/web/lib/services.ts`
- Modify: `apps/web/components/lesion-sheet.tsx`
- Modify: `apps/web/components/today-screen.tsx`

**Interfaces:**
- Produces: `Injury` type gains `phaseLabel: string | null`, `phaseStartDate: string | null`, `phaseTargetSessions: number | null`. `RecoveryService.updateInjuryPhase(id, data)`. Consumed only within this task (self-contained UI feature).

- [ ] **Step 1: Extend the frontend `Injury` type and mapper**

```ts
// apps/web/stores/recovery-store.ts — extend the Injury type
export type Injury = {
  id: string;
  name: string;
  description?: string;
  bodyPart?: string;
  startDate: string;
  status: InjuryStatus;
  phaseLabel: string | null;
  phaseStartDate: string | null;
  phaseTargetSessions: number | null;
};
```

```ts
// apps/web/lib/services.ts — extend ServerInjury and mapServerInjury
type ServerInjury = {
  id: string;
  userId: string;
  name: string;
  bodyPart?: string | null;
  description?: string | null;
  startDate: string;
  status: string;
  phaseLabel?: string | null;
  phaseStartDate?: string | null;
  phaseTargetSessions?: number | null;
  logs?: ServerInjuryLog[];
};

function mapServerInjury(i: ServerInjury): Injury {
  return {
    id: i.id,
    name: i.name,
    bodyPart: i.bodyPart ?? undefined,
    description: i.description ?? undefined,
    startDate: isoDate(i.startDate),
    status: i.status as InjuryStatus,
    phaseLabel: i.phaseLabel ?? null,
    phaseStartDate: i.phaseStartDate ? isoDate(i.phaseStartDate) : null,
    phaseTargetSessions: i.phaseTargetSessions ?? null,
  };
}
```

Also update `RecoveryService.createInjury` in `apps/web/lib/services.ts`, which currently reads:

```ts
  createInjury(data: { name: string; bodyPart?: string; description?: string; startDate: string; status?: InjuryStatus }) {
    const id = crypto.randomUUID();
    const status = data.status ?? 'active';
    useRecoveryStore.getState().addInjury({ ...data, status, id });
```

Change the `addInjury` call to include the three new fields as `null`, so the optimistic local object satisfies the widened `Injury` type (a new injury never starts with a phase):

```ts
    useRecoveryStore.getState().addInjury({ ...data, status, id, phaseLabel: null, phaseStartDate: null, phaseTargetSessions: null });
```

- [ ] **Step 2: Add `updateInjuryPhase` to `RecoveryService`**

Add this method right after the existing `updateInjuryStatus` (shown above) in `apps/web/lib/services.ts`, matching its exact optimistic-update-then-PATCH shape:

```ts
  updateInjuryPhase(id: string, data: { phaseLabel: string | null; phaseStartDate: string | null; phaseTargetSessions: number | null }) {
    useRecoveryStore.getState().updateInjury(id, data);
    const userId = useSessionStore.getState().user?.id;
    if (userId) {
      patchJson(`/injuries/${id}`, data)
        .catch(() => toast.error('No se pudo actualizar la fase de rehabilitación.'));
    }
  },
```

(`updateInjury`'s store action already accepts `Partial<Omit<Injury, 'id'>>`, so no store-action signature change is needed.)

- [ ] **Step 3: Add phase fields to `LesionSheet`, editing only**

In `apps/web/components/lesion-sheet.tsx`, extend the props interface:

```tsx
interface LesionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  defaultName?: string;
  defaultBodyPart?: string;
  defaultStartDate?: string;
  defaultStatus?: InjuryStatus;
  defaultPhaseLabel?: string;
  defaultPhaseTargetSessions?: string;
  editId?: string;
}
```

Extend the component's destructured props and add the two new state variables:

```tsx
export function LesionSheet({
  isOpen, onClose,
  defaultName = '', defaultBodyPart = '', defaultStartDate, defaultStatus = 'active',
  defaultPhaseLabel = '', defaultPhaseTargetSessions = '',
  editId,
}: LesionSheetProps) {
  const [name,                 setName]                 = useState(defaultName);
  const [bodyPart,              setBodyPart]              = useState(defaultBodyPart);
  const [startDate,             setStartDate]             = useState(defaultStartDate ?? todayIso());
  const [status,                setStatus]                = useState<InjuryStatus>(defaultStatus);
  const [phaseLabel,            setPhaseLabel]            = useState(defaultPhaseLabel);
  const [phaseTargetSessions,   setPhaseTargetSessions]   = useState(defaultPhaseTargetSessions);
  const [saved,                 setSaved]                 = useState(false);
```

Extend the `useEffect` that resets state on open:

```tsx
  useEffect(() => {
    if (isOpen) {
      setName(defaultName);
      setBodyPart(defaultBodyPart);
      setStartDate(defaultStartDate ?? todayIso());
      setStatus(defaultStatus);
      setPhaseLabel(defaultPhaseLabel);
      setPhaseTargetSessions(defaultPhaseTargetSessions);
      setSaved(false);
    }
  }, [isOpen, defaultName, defaultBodyPart, defaultStartDate, defaultStatus, defaultPhaseLabel, defaultPhaseTargetSessions]);
```

In `handleSave`, when `editId` is set, also call the new phase update (only if the label is non-empty — leaving it blank means "no phase tracking", matching the spec's "solo se muestra si tiene phaseLabel"):

```ts
  function handleSave() {
    if (!name.trim()) return;
    if (editId) {
      RecoveryService.updateInjuryStatus(editId, status);
      RecoveryService.updateInjuryPhase(editId, {
        phaseLabel: phaseLabel.trim() || null,
        phaseStartDate: phaseLabel.trim() ? todayIso() : null,
        phaseTargetSessions: phaseTargetSessions ? Number(phaseTargetSessions) : null,
      });
    } else {
      RecoveryService.createInjury({ name: name.trim(), bodyPart: bodyPart || undefined, startDate, status });
    }
    setSaved(true);
    setTimeout(onClose, 600);
  }
```

(`phaseStartDate` resets to today every time the label is (re)saved non-empty — this is intentional: editing the phase label is how the user signals "I've started a new phase," which is exactly when the session count should reset to 0.)

Add the UI block, only rendered when `editId` is set, right after the "Status" block and before "Save":

```tsx
          {editId && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-ink/40">Fase de rehabilitación (opcional)</label>
              <input
                type="text"
                value={phaseLabel}
                onChange={(e) => setPhaseLabel(e.target.value)}
                placeholder="ej. Fase 2"
                className="w-full rounded-2xl bg-canvas px-4 py-3 text-sm font-medium text-ink placeholder:text-ink/25 outline-none"
              />
              <input
                type="number"
                min={1}
                value={phaseTargetSessions}
                onChange={(e) => setPhaseTargetSessions(e.target.value)}
                placeholder="Sesiones objetivo (ej. 9)"
                className="w-full rounded-2xl bg-canvas px-4 py-3 text-sm font-medium text-ink placeholder:text-ink/25 outline-none"
              />
              <p className="text-[11px] text-ink/30 px-1">
                Guardar un nombre de fase reinicia el contador de sesiones desde hoy.
              </p>
            </div>
          )}
```

- [ ] **Step 4: Pass the new default props at the edit call site**

In `apps/web/components/lesiones-screen.tsx`, the second `<LesionSheet>` invocation (the edit one, using `editInjury` state) currently reads:

```tsx
      <LesionSheet
        isOpen={editInjury !== null}
        onClose={() => setEditInjury(null)}
        editId={editInjury?.id}
        defaultName={editInjury?.name}
        defaultBodyPart={editInjury?.bodyPart}
        defaultStartDate={editInjury?.startDate}
        defaultStatus={editInjury?.status}
```

Add two more lines to that same prop list:

```tsx
        defaultPhaseLabel={editInjury?.phaseLabel ?? ''}
        defaultPhaseTargetSessions={editInjury?.phaseTargetSessions != null ? String(editInjury.phaseTargetSessions) : ''}
```

- [ ] **Step 5: Add the "Lo que importa esta semana" card to `today-screen.tsx`**

Add this computed value near the other derived values (after `activeInjuries` is computed):

```tsx
  const phaseInjury = activeInjuries.find((i) => i.phaseLabel);
  const phaseCompletedSessions = phaseInjury
    ? injuryLogs.filter((l) => l.injuryId === phaseInjury.id && l.didRehab && (!phaseInjury.phaseStartDate || l.date >= phaseInjury.phaseStartDate)).length
    : 0;
```

Add the card, right after the "Tu día" section from Task 11:

```tsx
        {/* ── Lo que importa esta semana ────────────────────── */}
        {phaseInjury && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
              Lo que importa esta semana
            </p>
            <div className="rounded-4xl bg-white shadow-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-base font-bold text-ink">{phaseInjury.name} · {phaseInjury.phaseLabel}</p>
                {phaseInjury.phaseTargetSessions != null && (
                  <p className="text-sm font-semibold text-ink/50">
                    {phaseCompletedSessions}/{phaseInjury.phaseTargetSessions}
                  </p>
                )}
              </div>
              {phaseInjury.phaseTargetSessions != null && (
                <div className="w-full bg-ink/[0.08] rounded-full h-1.5">
                  <div
                    className="bg-moss h-1.5 rounded-full"
                    style={{ width: `${Math.min(100, Math.round((phaseCompletedSessions / phaseInjury.phaseTargetSessions) * 100))}%` }}
                  />
                </div>
              )}
              <p className="text-xs text-ink/40">
                {phaseInjury.phaseTargetSessions != null && phaseCompletedSessions >= phaseInjury.phaseTargetSessions
                  ? 'Fase completada.'
                  : phaseInjury.phaseTargetSessions != null
                    ? `Te quedan ${phaseInjury.phaseTargetSessions - phaseCompletedSessions} sesion${phaseInjury.phaseTargetSessions - phaseCompletedSessions === 1 ? '' : 'es'} para completar la fase.`
                    : 'Sin objetivo de sesiones definido.'}
              </p>
            </div>
          </div>
        )}
```

- [ ] **Step 6: Verify**

Run: `cd apps/web && npm run build`
Expected: succeeds.

- [ ] **Step 7: Commit**

```bash
git add apps/web/stores/recovery-store.ts apps/web/lib/services.ts apps/web/components/lesion-sheet.tsx apps/web/components/lesiones-screen.tsx apps/web/components/today-screen.tsx
git commit -m "feat(web): add rehab phase editing and the weekly phase progress card"
```

---

## Task 13: "Lo que he visto" — reposition and relabel

**Files:**
- Modify: `apps/web/components/today-screen.tsx`

**Interfaces:** none new — pure relocation + label change of the existing insight card. `insight` (from `buildRuleBasedInsight`) is untouched, per spec ("se reutiliza el insight semanal ya existente, solo restyled").

- [ ] **Step 1: Move the insight card**

The current block (at the very end of the scrollable content, after "Active injury status"):

```tsx
        {/* ── Insight ───────────────────────────────────────── */}
        <div className="rounded-4xl bg-ink p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-white/10 flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">Insight</p>
          </div>
          <p className="text-sm text-white/90 leading-relaxed">{insight}</p>
        </div>
```

Cut this block from its current position and paste it immediately after the "Lo que importa esta semana" block added in Task 12 (before "Activities detail"), changing only the label text:

```tsx
        {/* ── Lo que he visto ────────────────────────────────── */}
        <div className="rounded-4xl bg-ink p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-white/10 flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">Lo que he visto</p>
          </div>
          <p className="text-sm text-white/90 leading-relaxed">{insight}</p>
        </div>
```

- [ ] **Step 2: Verify**

Run: `cd apps/web && npm run build`
Expected: succeeds.

Manually confirm in the file that the card now appears once (moved, not duplicated) and that `Sparkles` is still imported (it was already imported for this exact block, so no import change needed).

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/today-screen.tsx
git commit -m "feat(web): reposition and relabel the insight card as Lo que he visto"
```

---

## Task 14: Final integration pass

**Files:** none new — verification only.

**Known environment limitation (from prior work this session, not this task's fault):** `npm run start:dev` fails to boot in this Windows/npm-workspaces environment at NestJS's `PackageLoader` stage, confirmed pre-existing and unrelated to any application code. A live authenticated-browser check of the redesigned screen is not possible here — this task verifies via full test suite + build + careful manual code read-through against the spec's acceptance criteria instead, exactly as Tasks 11/13 of the earlier COROS integration plan did.

- [ ] **Step 1: Full backend test suite**

Run: `cd apps/api && npx jest`
Expected: all suites pass, including the new `day-score-math.spec.ts` (24 tests), `day-score-insights.spec.ts` (5 tests), `get-day-score.use-case.spec.ts` (4 tests) — 33 new tests — plus every pre-existing suite still green (no regressions from the `Injury` entity/DTO changes in Task 1).

- [ ] **Step 2: Backend compile check**

Run: `cd apps/api && npx tsc --noEmit`
Expected: no new errors outside the pre-existing `.spec.ts` jest-typing gap.

- [ ] **Step 3: Full frontend build**

Run: `cd apps/web && npm run build`
Expected: succeeds, all routes prerender.

- [ ] **Step 4: Manual read-through against the spec's acceptance criteria**

Open `docs/superpowers/specs/2026-09-09-hoy-rediseno-v4-design.md` and check each acceptance-criteria line against the actual code:

- `GET /day-score` returns 0-100 with correct weights/formulas, `null` components when data is missing — re-read `get-day-score.use-case.ts` once fully assembled.
- `DayScoreCard` doesn't render when `score` is `null` — confirm the `if (!data || data.score == null) return null;` guard is still present after all edits.
- "Lo que importa esta semana" doesn't render without `phaseLabel` — confirm the `{phaseInjury && (...)}` guard.
- `PasosDetailSheet`'s average line is real (`averageValue={avg7d}`, not a hardcoded number).
- "Tu día" shows no priority badge, no "Cena"/"Objetivo de sueño" entries — confirm by reading the final JSX, not just recalling the plan.
- No file in this plan calls `openai` or any LLM client — `grep -rn "openai" apps/api/src/modules/day-score/ apps/web/components/day-score*.tsx apps/web/components/pasos-detail-sheet.tsx apps/web/components/alimentacion-detail-sheet.tsx` should return nothing.

- [ ] **Step 5: Record the outcome in the design spec**

Append a short "Resultado" section to `docs/superpowers/specs/2026-09-09-hoy-rediseno-v4-design.md` noting: test counts, the Task 11 deviation (dead-block discovery), and confirmation that all acceptance criteria hold — mirroring how the COROS integration spec recorded its Fase 1 outcome.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-09-09-hoy-rediseno-v4-design.md
git commit -m "docs: record Hoy redesign v4 implementation outcome"
```

