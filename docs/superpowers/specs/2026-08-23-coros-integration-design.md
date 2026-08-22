# Integración COROS — Diseño

**Fecha**: 2026-08-23
**Estado**: Aprobado para pasar a plan de implementación

## Contexto

RecoveryOS ya tiene una integración funcional con Strava (OAuth, tabla de tokens propia, sync manual + webhook, mapper a `Activity`). Queremos añadir COROS como segunda fuente externa, aportando datos que Strava no cubre bien: sueño, HRV, resting HR, recovery. El esquema actual (`DailyHealthMetric.source`, DTO `HEALTH_METRIC_SOURCES`) ya anticipa `'coros'` como valor válido, pero nada lo produce todavía.

Fuente de datos elegida tras investigación (ver resumen "Hallazgos" más abajo): **COROS MCP oficial** (`https://mcp.coros.com/mcp`), pese a que su idoneidad para sincronización backend desatendida no está confirmada por documentación pública. Por eso el plan arranca con un spike de validación desechable antes de comprometer arquitectura de producción.

## Hallazgos clave de la investigación

- **Transporte**: Streamable HTTP. **Auth**: OAuth basado en navegador la primera vez, reutilización de credenciales después — consistente con MCP Authorization estándar (OAuth 2.1 + PKCE + Dynamic Client Registration), pero COROS no documenta públicamente si un cliente MCP propio (no listado entre ChatGPT/Claude/Codex/OpenClaw/Workbuddy/Hermes) puede completar DCR y mantener sesión sin humano.
- **Tools reales confirmadas** (repo oficial `coroslab/COROS-MCP`): `queryDailyHealthData`, `querySleepData`, `querySleepHrv`, `queryAvgHeartRate`, `queryRestingHeartRate`, `queryStressLevel`, `queryHealthCheckTimeSeries`, `queryStressTimeSeries`, `queryRecoveryStatus`, `queryMenstruationCycles`, `querySportRecords`, `getActivityDetail`, `analyzeActivityDetail`, `queryActivityLapData`, `queryCustomActivityLapData`, `downloadActivityFitFiles`, `queryActivityFitFileDownloadUrls`, `queryFitnessAssessmentOverview`, `queryTrainingLoadAssessment`, `queryTrainingSchedule`, `queryTrainingPlanDetail`*, `generateTrainingPlan`*, `updateTrainingPlan`* (*solo lectura salvo estas 3, marcadas "coming soon"), `queryDevices`, `queryUserInfo`.
- **Límites confirmados**: máx. 50 descargas FIT/día; ventana máx. 7 días en series temporales crudas (`queryHealthCheckTimeSeries`, `queryStressTimeSeries`). Sin rate limit general documentado — hay que ser conservador.
- **Esquema actual ya preparado parcialmente**: `Activity.source` y `DailyHealthMetric.source` ya incluyen `'coros'` en el modelo de datos/DTOs. `SleepEntry` y `WeightEntry` no tienen columna `source`. No existe HRV ni resting HR en ningún modelo. No existe tabla genérica de integraciones — cada proveedor tiene su propia tabla de tokens (`StravaToken`).
- **No existe ningún cron en el proyecto hoy** — toda sync es manual o vía webhook de Strava. Esta integración introduce el primer scheduler (`@nestjs/schedule`).

## Fase 0 — Spike de validación MCP (gate antes de Fase 1)

Script standalone fuera de `apps/api` (p.ej. `scripts/coros-mcp-spike/`), no productivo, que:

1. Se conecta a `https://mcp.coros.com/mcp` vía `StreamableHTTPClientTransport` del SDK oficial de MCP (TypeScript).
2. Completa el flujo OAuth una vez (navegador, cuenta COROS personal del usuario).
3. Persiste localmente lo devuelto por DCR (`client_id`/`client_secret` si aplica) y el `refresh_token`.
4. En una segunda ejecución independiente, **sin volver a abrir navegador**, intenta refrescar el access token y llama a `queryDailyHealthData`, `querySleepData`, `querySleepHrv`, `queryRestingHeartRate` para el día anterior.
5. Guarda el JSON real de respuesta de cada tool como fixture para diseñar el `CorosMapper` con datos reales.

**Criterio de éxito para pasar a Fase 1**: el paso 4 funciona sin interacción humana. Si falla (DCR rechaza el cliente, no hay refresh token utilizable, o la sesión expira sin renovación), se reevalúa la vía de acceso (API de partners oficial u otra) antes de continuar — sin haber tocado el schema de producción.

## Fase 1 — Integración completa

### Arquitectura

```
COROS Cloud → mcp.coros.com (Streamable HTTP + OAuth)
   → CorosClient (infrastructure)       — sesión MCP, refresh, invocación de tools
   → sync-coros.use-case (application)  — orquestación, idempotencia
   → CorosMapper (application)          — COROS → DailyHealthMetric / SleepEntry
   → PrismaCorosRepository              — upserts
   → Supabase/PostgreSQL
   → API existente (health-metrics, sleep) → Frontend (ya tiene placeholder "Coros")
```

### Estructura de módulo (mismo patrón hexagonal que `strava/`)

```
apps/api/src/modules/coros/
  domain/
    coros-token.entity.ts        — mirror de StravaTokenEntity + syncStatus/syncError/lastAttemptAt/lastSuccessfulSyncAt
    coros-repository.port.ts
  application/
    use-cases/
      handle-coros-callback.use-case.ts
      get-coros-status.use-case.ts
      sync-coros.use-case.ts     — el "CorosSyncService"
      disconnect-coros.use-case.ts
    coros-mapper.ts               — funciones puras COROS → DailyHealthMetric / SleepEntry
  infrastructure/
    coros-mcp.client.ts           — el "CorosClient"
    prisma-coros.repository.ts
  presentation/
    coros.controller.ts           — GET /coros/connect, /callback, /:userId/status; POST /coros/sync; DELETE /coros/disconnect
  coros-sync.cron.ts              — @nestjs/schedule, @Cron('0 8 * * *')
  coros.module.ts
```

### Modelo de datos (cambios aditivos, sin migraciones destructivas)

- **`CorosToken`** (tabla nueva) — mirror de `StravaToken` (`id`, `userId @unique`, `accessToken`, `refreshToken`, `expiresAt`, `corosUserId`, `createdAt`, `updatedAt`) + `lastSyncAt`, `lastSuccessfulSyncAt`, `lastAttemptAt`, `syncStatus String @default("idle")`, `syncError String?`.
- **`Activity`**: + `corosId String? @unique` (mismo patrón que `stravaId`).
- **`DailyHealthMetric`**: + `restingHeartRate Int?`, `hrv Int?`, `avgHeartRate Int?`, `stressAvg Int?`, `recoveryPct Int?`. Reutiliza la tabla existente y su `@@unique([userId, date, source])` para upsert idempotente.
- **`SleepEntry`**: + `source String @default("manual")`, `score Int?` (0-100, distinto del `quality` manual 1-5 existente), + **`@@unique([userId, date, source])`** (nueva — hoy `SleepEntry` no tiene ninguna clave única; necesaria para que el upsert diario sea idempotente y el cron no duplique filas si corre más de una vez el mismo día).

Fuera de alcance de este cambio: tabla genérica de integraciones (se mantiene el patrón de tabla por proveedor, decisión explícita del usuario), deduplicación cross-provider COROS+Strava, actividades/Training Load/VO2Max/histórico/FIT.

### Flujo de sync (MVP: solo ayer/hoy)

1. Cron diario 08:00 (o `POST /coros/sync` manual) → `sync-coros.use-case`.
2. `CorosClient` gestiona refresh de sesión MCP si hace falta.
3. Llama, para la fecha objetivo: `queryDailyHealthData`, `querySleepData`, `querySleepHrv`, `queryRestingHeartRate`, `queryRecoveryStatus` (si el spike confirma disponibilidad).
4. `CorosMapper` normaliza cada payload a la forma de `DailyHealthMetric` / `SleepEntry`.
5. Upsert por clave única compuesta (`userId, date, source='coros'`) en ambas tablas.
6. Actualiza `CorosToken.lastSuccessfulSyncAt` / `lastAttemptAt` / `syncStatus` / `syncError`.

### Manejo de errores

Try/catch por tipo de dato (fallo en sueño no bloquea pasos), mismo nivel que el patrón Strava actual. Sin colas nuevas (no hay infraestructura de colas en el proyecto). Un reintento simple in-process si falla una llamada; si persiste, el cron del día siguiente lo resuelve. `syncStatus`/`syncError` en `CorosToken` dan visibilidad sin necesidad de infraestructura adicional.

### Seguridad

- `COROS_CLIENT_ID`/`COROS_CLIENT_SECRET` (si DCR los expone como persistentes) o equivalentes vía variables de entorno, documentadas en `.env.example` (hoy las de Strava tampoco lo están — se corrige de paso).
- Tokens en `CorosToken` siguen el mismo nivel de protección que `StravaToken` hoy (texto plano en BD gestionada por Supabase con acceso restringido) — sin introducir cifrado nuevo que no exista ya para Strava, para no crear inconsistencia de seguridad entre proveedores sin que sea una decisión explícita aparte.

### Frontend

`CorosConnectCard` (mirror de `StravaConnectCard`) sustituyendo el placeholder "Coros — próximamente" en `profile-screen.tsx` e `insights-screen.tsx`.

### Testing

- Unit tests de `CorosMapper` sobre los fixtures JSON reales capturados en el spike de Fase 0.
- Test de idempotencia: correr `sync-coros.use-case` dos veces el mismo día y verificar que no duplica filas en `DailyHealthMetric` ni `SleepEntry`.

### Fuera de alcance (Fase 2, explícitamente pospuesto)

Deduplicación/fusión de actividades COROS+Strava (heurística: mismo usuario + tipo + `performedAt` ±10min + duración ±10%, con COROS como fuente principal de métricas fisiológicas), actividades completas, Training Load, VO2 Max, histórico, descarga de FIT.

## Criterios de aceptación del primer milestone

- Spike de Fase 0 confirma sesión MCP no interactiva y persistente (o se documenta el fallback si no).
- Sueño, pasos, HRV y resting HR de "ayer" visibles en RecoveryOS tras un `POST /coros/sync` manual.
- Cron 08:00 ejecuta la sync sin intervención manual y dos ejecuciones el mismo día no duplican datos.
- `CorosToken.syncStatus`/`syncError` reflejan el estado real tras cada intento.
