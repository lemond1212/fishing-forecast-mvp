import { NextRequest, NextResponse } from "next/server";
import { buildForecast } from "@/lib/forecast-service";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim();

  if (!query) {
    return NextResponse.json({ error: "请先输入钓点名称或坐标。" }, { status: 400 });
  }

  try {
    const forecast = await buildForecast(query);
    return NextResponse.json(forecast);
  } catch (error) {
    const message = error instanceof Error ? error.message : "预测服务暂时不可用。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
