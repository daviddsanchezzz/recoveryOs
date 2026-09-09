# Rediseño "Hoy" v4 — Diseño

**Fecha**: 2026-09-09
**Estado**: Aprobado para pasar a plan de implementación

## Contexto

Rediseño de la pantalla "Hoy" de RecoveryOS a partir de mockups (Claude Design, "Hoy Rediseño v4"). El nuevo diseño introduce una tarjeta "Estado de hoy" con una puntuación compuesta (0-100) que combina sueño, HRV, dolor y una "carga de entrenamiento" — dos de estos componentes (carga, y las fases de rehabilitación mostradas en "Lo que importa esta semana") no existen hoy en el modelo de datos. Se decidió diseñar el sistema real (no una aproximación visual) antes de tocar la pantalla.

## Fuera de alcance (explícitamente pospuesto)

- **Hidratación**: `NutritionGoal.waterTargetMl` existe como objetivo pero no hay ningún registro de agua consumida. El sheet de alimentación no incluye hidratación en esta iteración.
- **"Cena" / "Objetivo de sueño" como tareas en "Tu día"**: son metas de un "plan diario" más amplio que no existe. Solo se reactivan las tareas de tipo actividad (que ya existían, desactivadas).
- **Insights por IA real**: los textos de "Estado de hoy" y "Lo que he visto" siguen siendo generados por reglas (`buildRuleBasedInsight`), no por un LLM.
- **Badge "PRIORIDAD"** en "Tu día": el modelo de plan de actividades actual no tiene un concepto de prioridad; se omite del rediseño visual hasta que exista el dato.

## 1. Modelo de datos — fases de rehabilitación

Cambio aditivo en `Injury` (sin migración destructiva):

```prisma
model Injury {
  // ... campos existentes sin cambios ...
  phaseLabel          String?
  phaseStartDate      DateTime?
  phaseTargetSessions Int?
}
```

- `phaseLabel`: texto libre editable manualmente (ej. "Fase 2").
- `phaseStartDate`: fecha desde la que se cuentan las sesiones de la fase actual.
- `phaseTargetSessions`: número objetivo de sesiones de rehab para la fase.
- **Sesiones completadas** ("8/9"): se derivan, no se guardan — `COUNT(InjuryLog WHERE injuryId = X AND didRehab = true AND date >= phaseStartDate)`.
- La tarjeta "Lo que importa esta semana" solo se muestra si la lesión activa más reciente tiene `phaseLabel` no nulo.
- Sin cambios en `InjuryLog`.

No hay tabla nueva para "carga de entrenamiento" — se calcula al vuelo desde `Activity` en cada petición (ver sección 2).

## 2. Carga de entrenamiento

Cálculo server-side, sin persistencia (los datos fuente — `Activity`, `DailyHealthMetric` — ya existen).

**Carga por sesión:**
```
carga_sesion = durationMin * (avgHeartRate / restingHeartRate)   // si hay avgHeartRate en la actividad y restingHeartRate del día (COROS)
carga_sesion = durationMin                                        // fallback si falta cualquiera de los dos
```
`restingHeartRate` del día se toma del `DailyHealthMetric` de esa fecha (fuente COROS); si no hay ninguna fila con `restingHeartRate` en los últimos 7 días, se usa el fallback de solo-duración para todas las sesiones.

**Carga diaria** = suma de `carga_sesion` de todas las `Activity` de ese día.

**Ratio agudo:crónico** = `media(carga_diaria, últimos 7 días) / media(carga_diaria, últimos 28 días)`. Días sin actividad cuentan como carga 0 en ambas medias (no se excluyen del denominador).

- Si no hay ninguna `Activity` en los últimos 28 días: ratio indefinido → el componente "carga" de la puntuación se excluye (ver sección 3).

## 3. Puntuación compuesta "Estado de hoy"

Nuevo módulo `apps/api/src/modules/day-score/` (hexagonal, mismo patrón que el resto: `domain/`, `application/use-cases/`, `presentation/`), con un único endpoint:

```
GET /day-score?date=YYYY-MM-DD   (sesión requerida; date opcional, default hoy)
```

Respuesta:
```ts
{
  score: number;               // 0-100, redondeado
  label: string;                // ver tabla de etiquetas abajo
  explanation: string;          // 1 frase, vía reglas (sección 4)
  tip: string;                  // 1 frase, vía reglas (sección 4)
  components: {
    sleep:  { score: number | null; durationH: number | null; label: string | null };
    hrv:    { score: number | null; valueMs: number | null; deltaPct: number | null };
    pain:   { score: number | null; avgPainLevel: number | null };
    load:   { score: number | null; ratio: number | null; status: 'alta' | 'normal' | 'baja' | null };
  };
  weights: { sleep: 25; hrv: 30; pain: 25; load: 20 };  // constante, se expone para el sheet "¿Por qué X?"
}
```

**Normalización de cada componente a 0-100:**

- **Sueño**: reutiliza la lógica de `apps/web/lib/sleep.ts::sleepScore()` (`entry.score ?? entry.quality * 20`), portada al backend. Si no hay `SleepEntry` para la fecha → componente `null`.
- **HRV**: `ratio = hrv_hoy / media(hrv, 7 días previos, excluyendo hoy)`. `score = clamp(50 + (ratio - 1) * 100, 0, 100)` (en la media = 50 neutro; ±10% = ±10 puntos). Si no hay HRV hoy, o menos de 3 días de HRV en la ventana previa para calcular una media fiable → componente `null`.
- **Dolor**: media de `painLevel` de los `InjuryLog` de hoy sobre lesiones activas (`status != 'resolved'`). `score = (10 - avgPain) * 10`. Si no hay lesiones activas → `score = 100` (sin lastre). Si hay lesiones activas pero sin log hoy → componente `null`.
- **Carga**: usando el ratio de la sección 2 — `0.8 ≤ ratio ≤ 1.3` → `score = 100`; `ratio > 1.3` → `score = clamp(100 - (ratio - 1.3) * 200, 0, 100)`; `ratio < 0.8` → `score = clamp(100 - (0.8 - ratio) * 100, 50, 100)`. Sin datos de actividad → componente `null`.

**Puntuación final**: media ponderada solo de los componentes no-`null`, renormalizando los pesos entre los presentes (ej. si falta "carga", los otros tres pesan 25/(25+30+25), 30/(25+30+25), 25/(25+30+25)). Si los 4 componentes son `null` (usuario nuevo sin datos), `score = null` y la tarjeta "Estado de hoy" no se muestra.

**Etiquetas** (ajustadas para que 62 → "Bastante bien", como en el mockup):
```
≥85  Excelente
≥70  Muy bien
≥55  Bastante bien
≥40  Regular
<40  Cuidado
```

## 4. Insights por reglas

Se extiende `apps/web/lib/metrics.ts::buildRuleBasedInsight` (o se añade una función hermana `buildDayScoreInsight`, a decidir en el plan) para generar `explanation` y `tip` a partir de los componentes de la sección 3 — mismo estilo de la función existente (cadena de condiciones ordenadas, primera coincidencia gana, texto plano sin acentos forzados). Ejemplos de reglas (no exhaustivo, el plan detalla la tabla completa):

- HRV `score < 40` y carga `status === 'alta'` → explanation: "Tu HRV está algo por debajo de tu media tras la carga alta de ayer."
- Carga `status === 'normal'` y dolor `score ≥ 70` → tip: "Carga moderada · evita impacto y mantén la bici suave."
- Fallback si todo está en rango normal → tip genérico de mantenimiento.

## 5. Rediseño frontend — pantalla "Hoy"

Todos los cambios en `apps/web/components/today-screen.tsx` salvo donde se indique.

1. **Calendario semanal**: `WeeklyCalendar` ya coincide con el diseño (orden L→D confirmado vía `weekDates()`, pastilla oscura en seleccionado, puntos). Solo ajustes menores de espaciado/color si hace falta al implementar, sin reescritura.
2. **Estado de hoy**: nueva tarjeta que consume `GET /day-score`. Anillo de progreso SVG (nuevo, sin librería externa) + label + explanation, fila de 3 stats (sueño/HRV/dolor) con sus valores crudos, y caja de tip. Tap en la tarjeta → nuevo sheet `DayScoreDetailSheet` con el desglose de los 4 componentes, los pesos, y un botón "Ver histórico en Progreso" (navega a la pestaña Progreso existente).
3. **Movimiento hoy**: pasa de botón-abre-sheet a bloques inline (pasos y kcal activas, cada uno con barra de progreso, como ya existe hoy pero sin el wrapper de botón). Tap en el bloque de pasos → nuevo sheet `PasosDetailSheet` con gráfico de barras de los últimos 7 días (extensión de `ProgressChart` con una prop `averageValue?: number` que dibuja una línea de referencia discontinua — no existe hoy, hay que añadirla) y las filas "Tu media 7 días" / "Objetivo diario".
4. **Alimentación hoy**: la tarjeta resumen se mantiene. Tap → nuevo sheet `AlimentacionDetailSheet` con consumido/gasto/balance (gasto = `DailyHealthMetric.activeCalories` del día — no hay TDEE real, se usa el activeCalories tal cual, dejado claro en el sheet), lista de comidas del día (vía `NutritionService.fetchMealsForDate`), macros con barra de proteína, y botón "Ver alimentación completa".
5. **Tu día**: se reactiva el bloque `{false && planEntries.length > 0 && (...)}` ya existente (plan de actividades), restyled al nuevo diseño visual (fila con círculo de estado, icono, label, chip de hora/músculo). Sin badge de prioridad (fuera de alcance, sección "Fuera de alcance").
6. **Lo que importa esta semana**: nueva tarjeta, condicional a que la lesión activa tenga `phaseLabel`. Muestra `phaseLabel`, sesiones completadas/objetivo (sección 1), barra de progreso, y la próxima sesión de rehab planeada (si `planEntries` tiene una entrada de tipo rehab hoy).
7. **Lo que he visto**: reutiliza el insight semanal ya existente (`buildRuleBasedInsight` actual, sin tocar), solo con el estilo visual oscuro del mockup — ya coincide bastante con la tarjeta "Insight" actual al final de la pantalla; se mueve de posición (más arriba, tras "Lo que importa esta semana") y se restyla.

## Criterios de aceptación

- `GET /day-score` devuelve una puntuación 0-100 coherente con los pesos y fórmulas de la sección 3, y `null` en los componentes sin datos suficientes (no rompe, no inventa datos).
- La tarjeta "Estado de hoy" no se muestra si `score` es `null` (usuario sin datos).
- "Lo que importa esta semana" no se muestra si la lesión activa no tiene `phaseLabel`.
- El sheet de pasos muestra una línea de media de 7 días real (no decorativa).
- El bloque "Tu día" reactivado no muestra ninguna referencia a prioridad, cena, ni objetivo de sueño.
- Todo el sistema de puntuación es determinista y funciona sin conexión a ningún LLM.
