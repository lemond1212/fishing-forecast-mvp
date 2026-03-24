export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function formatHourLabel(value: string, timezone: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone,
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function isCoordinateQuery(query: string) {
  return /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(query.trim());
}

export function parseCoordinates(query: string) {
  const [lat, lon] = query.split(",").map((item) => Number(item.trim()));
  return { lat, lon };
}

export function degToDirection(deg: number) {
  const directions = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
  const index = Math.round((((deg % 360) + 360) % 360) / 45) % directions.length;
  return directions[index];
}
