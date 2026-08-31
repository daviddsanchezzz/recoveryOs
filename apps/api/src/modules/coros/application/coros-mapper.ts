/**
 * All four COROS MCP tools (`queryDailyHealthData`, `querySleepData`, `querySleepHrv`,
 * `queryRestingHeartRate`) ignore the `date`/`startDate`/`endDate` argument passed to them
 * and always return a multi-day window (observed as the last 7 days) with one section per
 * day, confirmed against real fixtures captured from the live server (see
 * scripts/coros-mcp-spike/fixtures/*.json). Because of this, every parser below takes a
 * `targetDate` (format `YYYY-MM-DD`, the same string `SyncCorosUseCase` computes as
 * `dateStr`) and first extracts that day's section from the response text before running
 * its field regexes — running the field regexes against the whole blob would silently pick
 * whichever day happens to be listed first, not the day that was actually asked for.
 */

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

// Day sections are delimited by "--- YYYYMMDD ---" (no dashes in the date), e.g. "--- 20260830 ---".
export function parseDailyHealthData(text: string, targetDate: string): ParsedDailyHealth {
  const compactDate = targetDate.replace(/-/g, ''); // '2026-08-30' -> '20260830'
  const section = text.match(new RegExp(`--- ${compactDate} ---\\n([\\s\\S]*?)(?=\\n---|$)`))?.[1] ?? '';
  return {
    steps: parseIntLoose(section.match(/Steps:\s*([\d,]+)/i)?.[1]),
    activeCalories: parseIntLoose(section.match(/Calories:\s*([\d,]+)/i)?.[1]),
    stressAvg: parseIntLoose(section.match(/Stress:\s*Avg\s*(\d+)/i)?.[1]),
  };
}

// Day sections are a bare "YYYY-MM-DD" line, e.g. "2026-08-30", followed by fields including "Main Sleep: Xh Ymin".
export function parseSleepData(text: string, targetDate: string): ParsedSleep {
  const section =
    text.match(new RegExp(`(?:^|\\n)${targetDate}\\n([\\s\\S]*?)(?=\\n\\d{4}-\\d{2}-\\d{2}\\n|$)`))?.[1] ?? '';
  const duration = section.match(/Main Sleep:\s*(\d+)\s*h(?:ours?)?\s*(\d+)?\s*m(?:in)?/i);
  let durationH: number | null = null;
  if (duration) {
    const hours = Number(duration[1]);
    const minutes = duration[2] ? Number(duration[2]) : 0;
    durationH = Math.round((hours + minutes / 60) * 100) / 100;
  }
  return {
    durationH,
    score: parseIntLoose(section.match(/Sleep Score:\s*(\d+)/i)?.[1]),
  };
}

// Response has an "HRV Assessment" section (what we want) followed by a much larger "Sleep HRV
// Time Series" section (raw per-timestamp values) — only the Assessment section is searched.
// Within it, each day is "YYYY-MM-DD:" followed by an indented "  HRV Avg: NN ms — ..." line, or
// "  No data" when the day has no reading.
export function parseSleepHrv(text: string, targetDate: string): ParsedHrv {
  const assessmentSection = text.split(/Sleep HRV Time Series/i)[0];
  const day =
    assessmentSection.match(new RegExp(`(?:^|\\n)${targetDate}:\\n([\\s\\S]*?)(?=\\n\\d{4}-\\d{2}-\\d{2}:|$)`))?.[1] ??
    '';
  return { hrv: parseIntLoose(day.match(/HRV Avg:\s*(\d+)\s*ms/i)?.[1]) };
}

// One line per day: "YYYY-MM-DD: NN bpm".
export function parseRestingHeartRate(text: string, targetDate: string): ParsedRestingHeartRate {
  const match = text.match(new RegExp(`${targetDate}:\\s*(\\d+)\\s*bpm`, 'i'));
  return { restingHeartRate: parseIntLoose(match?.[1]) };
}
