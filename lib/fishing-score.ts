import type { ForecastHour, RecommendationWindow, TideEvent } from "@/lib/types";
import { average, clamp } from "@/lib/utils";

function getPressureBonus(pressure: number) {
  if (pressure >= 1012 && pressure <= 1022) {
    return 18;
  }
  if (pressure >= 1005 && pressure < 1012) {
    return 10;
  }
  if (pressure > 1022 && pressure <= 1028) {
    return 8;
  }
  return 0;
}

function getWindBonus(speed: number) {
  if (speed <= 12) {
    return 18;
  }
  if (speed <= 20) {
    return 10;
  }
  if (speed <= 28) {
    return 2;
  }
  return -18;
}

function getWeatherPenalty(code: number) {
  if (code >= 95) {
    return -28;
  }
  if (code >= 80) {
    return -18;
  }
  if (code >= 61) {
    return -10;
  }
  return 0;
}

function getTideBonus(trend: ForecastHour["tideTrend"], tideHeight: number | null) {
  if (tideHeight === null) {
    return 6;
  }

  const movementBonus = trend === "slack" ? 8 : 16;
  const heightPenalty = tideHeight < 0.2 ? -4 : tideHeight > 3.8 ? -4 : 0;
  return movementBonus + heightPenalty;
}

function buildRisks(hour: ForecastHour) {
  const risks: string[] = [];

  if (hour.windSpeed > 28) {
    risks.push("\u5927\u98ce\u5f71\u54cd\u629b\u6295\u4e0e\u5cb8\u8fb9\u5b89\u5168");
  }
  if (hour.weatherCode >= 95) {
    risks.push("\u96f7\u66b4\u98ce\u9669\u8f83\u9ad8\uff0c\u5efa\u8bae\u505c\u6b62\u51fa\u9493");
  } else if (hour.weatherCode >= 80) {
    risks.push("\u964d\u96e8\u8f83\u5f3a\uff0c\u6ce8\u610f\u9632\u6ed1\u4e0e\u89c6\u7ebf");
  }
  if (hour.pressure < 1002) {
    risks.push("\u4f4e\u6c14\u538b\u53ef\u80fd\u5bfc\u81f4\u9c7c\u53e3\u53d8\u5f31");
  }
  if (hour.tideTrend === "slack") {
    risks.push("\u5e73\u6f6e\u65f6\u6bb5\u53ef\u80fd\u9700\u8981\u653e\u6162\u4f5c\u9493\u8282\u594f");
  }

  return risks;
}

export function scoreForecast(hours: Omit<ForecastHour, "fishingScore" | "risks">[]) {
  return hours.map((hour) => {
    const base =
      42 +
      getPressureBonus(hour.pressure) +
      getWindBonus(hour.windSpeed) +
      getWeatherPenalty(hour.weatherCode) +
      getTideBonus(hour.tideTrend, hour.tideHeight);

    const fishingScore = clamp(Math.round(base), 0, 100);
    const risks = buildRisks({
      ...hour,
      fishingScore,
      risks: []
    });

    return {
      ...hour,
      fishingScore,
      risks
    };
  });
}

export function summarizeForecast(hours: ForecastHour[]) {
  const overallScore = Math.round(average(hours.map((hour) => hour.fishingScore)));
  const scoreLabel =
    overallScore >= 75
      ? "\u9002\u5408\u91cd\u70b9\u51fa\u9493"
      : overallScore >= 55
        ? "\u53ef\u4ee5\u5c1d\u8bd5"
        : "\u5efa\u8bae\u4fdd\u5b88\u8bc4\u4f30";

  const riskAlerts = Array.from(new Set(hours.flatMap((hour) => hour.risks))).slice(0, 4);

  const bestWindows: RecommendationWindow[] = [];
  for (let index = 0; index < hours.length - 2; index += 1) {
    const windowHours = hours.slice(index, index + 3);
    const windowScore = Math.round(average(windowHours.map((hour) => hour.fishingScore)));

    if (windowScore < 65) {
      continue;
    }

    bestWindows.push({
      start: windowHours[0].time,
      end: windowHours[windowHours.length - 1].time,
      score: windowScore,
      reason:
        windowHours[0].tideTrend === "slack"
          ? "\u4e34\u8fd1\u5e73\u6f6e\uff0c\u9002\u5408\u5b88\u53e3\u4e0e\u6162\u641c"
          : "\u98ce\u538b\u548c\u6f6e\u4f4d\u7ec4\u5408\u76f8\u5bf9\u7a33\u5b9a"
    });
  }

  return {
    overallScore,
    scoreLabel,
    bestWindows: bestWindows.slice(0, 3),
    riskAlerts
  };
}

export function inferTideTrend(currentHeight: number | null, nextHeight: number | null) {
  if (currentHeight === null || nextHeight === null) {
    return "slack" as const;
  }

  const delta = nextHeight - currentHeight;
  if (Math.abs(delta) < 0.03) {
    return "slack" as const;
  }

  return delta > 0 ? ("rising" as const) : ("falling" as const);
}

export function normalizeTideEvents(events: TideEvent[]) {
  return [...events]
    .sort((left, right) => new Date(left.time).getTime() - new Date(right.time).getTime())
    .slice(0, 8);
}
