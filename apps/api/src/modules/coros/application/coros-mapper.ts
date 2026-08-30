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
