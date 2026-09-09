export type HealthMetricSnapshot = {
  restingHeartRate: number | null;
  hrv: number | null;
  stressAvg: number | null;
  recoveryPct: number | null;
  steps: number;
  activeCalories: number;
};

export type HealthContext = {
  date: string;
  window: { from: string; to: string; days: number };
  sleep: {
    today: {
      durationH: number;
      score: number | null;
      quality: number;
      source: string;
    } | null;
    averageDuration7d: number | null;
    averageScore7d: number | null;
    daysWithData7d: number;
  };
  recovery: {
    today: HealthMetricSnapshot | null;
    baseline28d: {
      restingHeartRate: number | null;
      hrv: number | null;
      stressAvg: number | null;
      recoveryPct: number | null;
    };
    hrvChangePct: number | null;
    restingHeartRateChangePct: number | null;
    daysWithData28d: number;
  };
  activity: {
    today: Array<{
      type: string;
      durationMin: number | null;
      distanceKm: number | null;
      calories: number | null;
    }>;
    last7d: { sessions: number; durationMin: number; distanceKm: number };
    previous7d: { sessions: number; durationMin: number; distanceKm: number };
    loadChangePct: number | null;
  };
  nutrition: {
    today: { calories: number; proteinGrams: number; meals: number };
    averageLoggedDay7d: { calories: number; proteinGrams: number } | null;
    daysWithData7d: number;
    targets: { calories: number; proteinGrams: number } | null;
  };
  injuries: Array<{
    name: string;
    bodyPart: string | null;
    status: string;
    latestPain: number | null;
    latestLogDate: string | null;
    rehabCompleted: boolean | null;
  }>;
  weight: {
    latestKg: number | null;
    latestDate: string | null;
    change28dKg: number | null;
  };
  missingData: string[];
};
