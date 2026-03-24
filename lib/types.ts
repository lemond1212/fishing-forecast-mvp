export type Coordinates = {
  lat: number;
  lon: number;
};

export type LocationResult = Coordinates & {
  name: string;
  timezone: string;
};

export type ForecastHour = {
  time: string;
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  tideHeight: number | null;
  tideTrend: "rising" | "falling" | "slack";
  fishingScore: number;
  risks: string[];
};

export type TideEvent = {
  time: string;
  type: "HIGH" | "LOW";
  height: number | null;
};

export type RecommendationWindow = {
  start: string;
  end: string;
  score: number;
  reason: string;
};

export type ForecastSummary = {
  overallScore: number;
  scoreLabel: string;
  bestWindows: RecommendationWindow[];
  riskAlerts: string[];
  sourceMode: "live" | "mixed" | "demo";
};

export type ForecastResponse = {
  location: LocationResult;
  generatedAt: string;
  summary: ForecastSummary;
  hourly: ForecastHour[];
  tideEvents: TideEvent[];
  futureData: {
    catchRecords: CatchRecord[];
    dailyBriefSubscriptions: DailyBriefSubscription[];
  };
};

export type CatchRecord = {
  id: string;
  locationName: string;
  caughtAt: string;
  species: string;
  weightKg?: number;
  lengthCm?: number;
  bait?: string;
  notes?: string;
  weatherSnapshot?: {
    score: number;
    tideHeight: number | null;
    windSpeed: number;
    pressure: number;
  };
};

export type DailyBriefSubscription = {
  id: string;
  locationName: string;
  scheduleLocalTime: string;
  channel: "app" | "email" | "webhook";
  enabled: boolean;
  lastSentAt?: string;
};
