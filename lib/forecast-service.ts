import { inferTideTrend, normalizeTideEvents, scoreForecast, summarizeForecast } from "@/lib/fishing-score";
import type {
  CatchRecord,
  Coordinates,
  DailyBriefSubscription,
  ForecastHour,
  ForecastResponse,
  LocationResult,
  TideEvent
} from "@/lib/types";
import { isCoordinateQuery, parseCoordinates } from "@/lib/utils";

const STORMGLASS_API_KEY = process.env.STORMGLASS_API_KEY ?? process.env.WORLDTIDES_API_KEY;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    next: { revalidate: 900 }
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

type GeocodingResponse = {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
    admin1?: string;
    country?: string;
  }>;
};

type NominatimSearchResponse = Array<{
  lat: string;
  lon: string;
  display_name: string;
}>;

type WeatherResponse = {
  timezone: string;
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    pressure_msl: number[];
  };
};

type StormglassSeaLevelPoint = {
  time: string;
  height?: number;
  sg?: number;
  noaa?: number;
  meteo?: number;
};

type StormglassSeaLevelResponse = {
  data?: StormglassSeaLevelPoint[];
};

type StormglassExtremesResponse = {
  data?: Array<{ height?: number; time: string; type: "high" | "low" }>;
};

async function resolveLocation(query: string): Promise<LocationResult> {
  if (isCoordinateQuery(query)) {
    const coords = parseCoordinates(query);
    return {
      ...coords,
      name: `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`,
      timezone: "Asia/Shanghai"
    };
  }

  const openMeteoMatch = await resolveByOpenMeteo(query);
  if (openMeteoMatch) {
    return openMeteoMatch;
  }

  const nominatimMatch = await resolveByNominatim(query);
  if (nominatimMatch) {
    return nominatimMatch;
  }

  throw new Error(
    "\u6ca1\u6709\u627e\u5230\u5bf9\u5e94\u9493\u70b9\uff0c\u8bf7\u5c3d\u91cf\u8f93\u5165\u66f4\u5b8c\u6574\u7684\u5730\u540d\u6216\u76f4\u63a5\u8f93\u5165\u5750\u6807\u3002"
  );
}

async function resolveByOpenMeteo(query: string): Promise<LocationResult | null> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "3");
  url.searchParams.set("language", "zh");
  url.searchParams.set("format", "json");

  const data = await fetchJson<GeocodingResponse>(url.toString());
  const match = data.results?.[0];

  if (!match) {
    return null;
  }

  return {
    lat: match.latitude,
    lon: match.longitude,
    timezone: match.timezone,
    name: [match.name, match.admin1, match.country].filter(Boolean).join(", ")
  };
}

async function resolveByNominatim(query: string): Promise<LocationResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query.trim());
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("accept-language", "zh-CN");
  url.searchParams.set("addressdetails", "1");

  const data = await fetchJson<NominatimSearchResponse>(url.toString(), {
    headers: {
      "User-Agent": "fishing-forecast-mvp/0.1 (local development)",
      Accept: "application/json",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.6"
    }
  });

  const match = data[0];
  if (!match) {
    return null;
  }

  return {
    lat: Number(match.lat),
    lon: Number(match.lon),
    timezone: "Asia/Shanghai",
    name: match.display_name
  };
}

async function fetchWeather(location: Coordinates) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(location.lat));
  url.searchParams.set("longitude", String(location.lon));
  url.searchParams.set(
    "hourly",
    ["temperature_2m", "weather_code", "wind_speed_10m", "wind_direction_10m", "pressure_msl"].join(",")
  );
  url.searchParams.set("forecast_hours", "48");
  url.searchParams.set("timezone", "auto");

  return fetchJson<WeatherResponse>(url.toString());
}

function toUtcHourIso(value: string) {
  const date = new Date(value);
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

function buildIsoRange(hours: string[]) {
  const start = toUtcHourIso(hours[0]);
  const endDate = new Date(hours[hours.length - 1]);
  endDate.setUTCHours(endDate.getUTCHours() + 1, 0, 0, 0);

  return {
    start,
    end: endDate.toISOString()
  };
}

function extractSeaLevelHeight(point: StormglassSeaLevelPoint) {
  if (typeof point.height === "number") {
    return point.height;
  }
  if (typeof point.sg === "number") {
    return point.sg;
  }
  if (typeof point.noaa === "number") {
    return point.noaa;
  }
  if (typeof point.meteo === "number") {
    return point.meteo;
  }

  for (const [key, value] of Object.entries(point)) {
    if (key !== "time" && typeof value === "number") {
      return value;
    }
  }

  return null;
}

function buildDemoTide(location: Coordinates, hours: string[]) {
  const heights = hours.map((time, index) => {
    const phase = index / 3.1;
    const locationOffset = ((location.lat + location.lon) % 1) * 0.2;
    return {
      time,
      height: Number((1.8 + Math.sin(phase) * 0.9 + locationOffset).toFixed(2))
    };
  });

  const events: TideEvent[] = [];
  for (let index = 1; index < heights.length - 1; index += 1) {
    const prev = heights[index - 1].height;
    const current = heights[index].height;
    const next = heights[index + 1].height;

    if (current > prev && current > next) {
      events.push({ time: heights[index].time, type: "HIGH", height: current });
    }
    if (current < prev && current < next) {
      events.push({ time: heights[index].time, type: "LOW", height: current });
    }
  }

  return {
    heights,
    events: events.slice(0, 8),
    sourceMode: "demo" as const
  };
}

async function fetchTides(location: Coordinates, hours: string[]) {
  if (!STORMGLASS_API_KEY) {
    return buildDemoTide(location, hours);
  }

  const { start, end } = buildIsoRange(hours);
  const seaLevelUrl = new URL("https://api.stormglass.io/v2/tide/sea-level/point");
  seaLevelUrl.searchParams.set("lat", String(location.lat));
  seaLevelUrl.searchParams.set("lng", String(location.lon));
  seaLevelUrl.searchParams.set("start", start);
  seaLevelUrl.searchParams.set("end", end);

  const extremesUrl = new URL("https://api.stormglass.io/v2/tide/extremes/point");
  extremesUrl.searchParams.set("lat", String(location.lat));
  extremesUrl.searchParams.set("lng", String(location.lon));
  extremesUrl.searchParams.set("start", start);
  extremesUrl.searchParams.set("end", end);

  const requestInit: RequestInit = {
    headers: {
      Authorization: STORMGLASS_API_KEY
    }
  };

  try {
    const [seaLevelData, extremesData] = await Promise.all([
      fetchJson<StormglassSeaLevelResponse>(seaLevelUrl.toString(), requestInit),
      fetchJson<StormglassExtremesResponse>(extremesUrl.toString(), requestInit)
    ]);

    const heightByHour = new Map(
      (seaLevelData.data ?? []).map((item) => {
        const height = extractSeaLevelHeight(item);
        return [toUtcHourIso(item.time), height === null ? null : Number(height.toFixed(2))] as const;
      })
    );

    const heights = hours.map((time) => ({
      time,
      height: heightByHour.get(toUtcHourIso(time)) ?? null
    }));

    const events: TideEvent[] =
      extremesData.data?.map((item) => ({
        time: item.time,
        type: item.type === "high" ? ("HIGH" as const) : ("LOW" as const),
        height: typeof item.height === "number" ? Number(item.height.toFixed(2)) : null
      })) ?? [];

    if (!heights.some((item) => item.height !== null)) {
      return buildDemoTide(location, hours);
    }

    return {
      heights,
      events,
      sourceMode: "live" as const
    };
  } catch {
    return buildDemoTide(location, hours);
  }
}

function futureDataTemplate(locationName: string): {
  catchRecords: CatchRecord[];
  dailyBriefSubscriptions: DailyBriefSubscription[];
} {
  return {
    catchRecords: [
      {
        id: "sample-catch-1",
        locationName,
        caughtAt: "",
        species: "",
        notes: "\u9884\u7559\u7ed9\u540e\u7eed\u5386\u53f2\u6e14\u83b7\u8bb0\u5f55\u529f\u80fd"
      }
    ],
    dailyBriefSubscriptions: [
      {
        id: "sample-brief-1",
        locationName,
        scheduleLocalTime: "06:30",
        channel: "app",
        enabled: false
      }
    ]
  };
}

export async function buildForecast(query: string): Promise<ForecastResponse> {
  const location = await resolveLocation(query);
  const weather = await fetchWeather(location);
  const resolvedLocation: LocationResult = {
    ...location,
    timezone: weather.timezone || location.timezone
  };
  const tideData = await fetchTides(resolvedLocation, weather.hourly.time);

  const hours: Omit<ForecastHour, "fishingScore" | "risks">[] = weather.hourly.time.map((time, index) => {
    const currentTide = tideData.heights[index]?.height ?? null;
    const nextTide = tideData.heights[index + 1]?.height ?? null;

    return {
      time,
      temperature: weather.hourly.temperature_2m[index],
      weatherCode: weather.hourly.weather_code[index],
      windSpeed: weather.hourly.wind_speed_10m[index],
      windDirection: weather.hourly.wind_direction_10m[index],
      pressure: weather.hourly.pressure_msl[index],
      tideHeight: currentTide,
      tideTrend: inferTideTrend(currentTide, nextTide)
    };
  });

  const scored = scoreForecast(hours);
  const summaryBase = summarizeForecast(scored);

  return {
    location: resolvedLocation,
    generatedAt: new Date().toISOString(),
    summary: {
      ...summaryBase,
      sourceMode: tideData.sourceMode === "demo" ? "mixed" : "live"
    },
    hourly: scored,
    tideEvents: normalizeTideEvents(tideData.events),
    futureData: futureDataTemplate(location.name)
  };
}
