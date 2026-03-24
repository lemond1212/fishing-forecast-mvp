"use client";

import { FormEvent, useEffect, useState } from "react";
import type { ForecastResponse } from "@/lib/types";
import { degToDirection, formatHourLabel } from "@/lib/utils";

const DEFAULT_QUERY = "\u821f\u5c71";

function sourceText(mode: ForecastResponse["summary"]["sourceMode"]) {
  if (mode === "live") {
    return "\u5929\u6c14\u4e0e\u6f6e\u6c50\u5747\u4e3a\u5b9e\u65f6 API \u6570\u636e";
  }
  if (mode === "mixed") {
    return "\u5929\u6c14\u4e3a\u5b9e\u65f6 API\uff0cStormglass \u6f6e\u6c50\u8bf7\u6c42\u53ef\u80fd\u5931\u8d25\u540e\u56de\u9000\u4e3a\u6f14\u793a\u6570\u636e";
  }
  return "\u5f53\u524d\u5c55\u793a\u4e3a\u6f14\u793a\u6570\u636e";
}

export function ForecastApp() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);

  async function loadForecast(nextQuery: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/forecast?query=${encodeURIComponent(nextQuery)}`);
      const data = (await response.json()) as ForecastResponse | { error: string };

      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "\u8bf7\u6c42\u5931\u8d25");
      }

      setForecast(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "\u8bf7\u6c42\u5931\u8d25");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadForecast(DEFAULT_QUERY);
  }, []);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadForecast(query);
  }

  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">Fishing Forecast MVP</span>
        <h1>
          {"\u8ba9\u5929\u6c14\u3001\u6f6e\u6c50\u548c\u9c7c\u53e3\uff0c\u53d8\u6210\u4e00\u773c\u80fd\u5224\u65ad\u7684\u51fa\u9493\u5efa\u8bae\u3002"}
        </h1>
        <p>
          {
            "\u8f93\u5165\u9493\u70b9\u540d\u79f0\u6216\u5750\u6807\uff0c\u67e5\u770b\u672a\u6765 48 \u5c0f\u65f6\u5929\u6c14\u3001\u98ce\u901f\u98ce\u5411\u3001\u6c14\u538b\u3001\u6f6e\u6c50\u65f6\u95f4\u548c\u6c34\u4f4d\u53d8\u5316\uff0c\u5e76\u57fa\u4e8e\u89c4\u5219\u6a21\u578b\u751f\u6210 0-100 \u7684\u51fa\u9493\u6307\u6570\u3001\u63a8\u8350\u65f6\u6bb5\u548c\u98ce\u9669\u63d0\u9192\u3002"
          }
        </p>
      </section>

      <section className="search-card">
        <form className="search-form" onSubmit={onSubmit}>
          <label htmlFor="spot">{"\u9493\u70b9\u540d\u79f0\u6216\u5750\u6807"}</label>
          <input
            id="spot"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="\u4f8b\u5982\uff1a\u9752\u5c9b / \u821f\u5c71 / 30.0444, 122.1068"
          />
          <div className="search-actions">
            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? "\u9884\u6d4b\u4e2d..." : "\u5f00\u59cb\u9884\u6d4b"}
            </button>
            <button className="ghost-btn" type="button" onClick={() => setQuery(DEFAULT_QUERY)}>
              {"\u8f7d\u5165\u793a\u4f8b"}
            </button>
          </div>
          <div className="status">
            {error ?? "\u652f\u6301\u4e2d\u6587\u5730\u540d\u548c\u7eac\u5ea6,\u7ecf\u5ea6\u683c\u5f0f\u8f93\u5165\u3002"}
          </div>
        </form>
      </section>

      {forecast ? (
        <section className="dashboard grid">
          <div className="summary-grid">
            <article className="panel">
              <div className="score-wrap">
                <div>
                  <div className="muted">{forecast.location.name}</div>
                  <h2>{"\u51fa\u9493\u6307\u6570"}</h2>
                </div>
                <div className="score-number">
                  <strong>{forecast.summary.overallScore}</strong>
                  <span className="score-chip">{forecast.summary.scoreLabel}</span>
                </div>
                <div className="mini-stats">
                  <div className="stat-box">
                    <div className="label">{"\u6570\u636e\u72b6\u6001"}</div>
                    <div className="value">{sourceText(forecast.summary.sourceMode)}</div>
                  </div>
                  <div className="stat-box">
                    <div className="label">{"\u672a\u6765\u8303\u56f4"}</div>
                    <div className="value">48 {"\u5c0f\u65f6"}</div>
                  </div>
                </div>
              </div>
            </article>

            <article className="panel">
              <h3>{"\u63a8\u8350\u51fa\u9493\u65f6\u6bb5"}</h3>
              <ul className="list">
                {forecast.summary.bestWindows.length ? (
                  forecast.summary.bestWindows.map((window) => (
                    <li key={`${window.start}-${window.end}`}>
                      <strong>{window.score} {"\u5206"}</strong>
                      <div>
                        {formatHourLabel(window.start, forecast.location.timezone)} -{" "}
                        {formatHourLabel(window.end, forecast.location.timezone)}
                      </div>
                      <div className="muted">{window.reason}</div>
                    </li>
                  ))
                ) : (
                  <li>
                    {
                      "\u672a\u6765 48 \u5c0f\u65f6\u5185\u6ca1\u6709\u660e\u663e\u5f3a\u52bf\u7a97\u53e3\uff0c\u5efa\u8bae\u7075\u6d3b\u89c2\u5bdf\u73b0\u573a\u6f6e\u6d41\u548c\u98ce\u5411\u3002"
                    }
                  </li>
                )}
              </ul>
            </article>

            <article className="panel">
              <h3>{"\u98ce\u9669\u63d0\u9192"}</h3>
              <ul className="list">
                {forecast.summary.riskAlerts.length ? (
                  forecast.summary.riskAlerts.map((risk) => (
                    <li key={risk} className="danger">
                      {risk}
                    </li>
                  ))
                ) : (
                  <li>
                    {
                      "\u5f53\u524d\u6ca1\u6709\u660e\u663e\u6781\u7aef\u98ce\u9669\uff0c\u4f46\u4ecd\u5efa\u8bae\u5173\u6ce8\u73b0\u573a\u53d8\u5316\u3002"
                    }
                  </li>
                )}
              </ul>
            </article>

            <article className="panel">
              <h3>{"\u6f6e\u6c50\u8282\u70b9"}</h3>
              <ul className="list">
                {forecast.tideEvents.map((event) => (
                  <li key={`${event.time}-${event.type}`}>
                    <strong>{event.type === "HIGH" ? "\u9ad8\u6f6e" : "\u4f4e\u6f6e"}</strong>
                    <div>{formatHourLabel(event.time, forecast.location.timezone)}</div>
                    <div className="muted">
                      {event.height === null
                        ? "\u6c34\u4f4d\u5f85\u8865\u5145"
                        : `\u6c34\u4f4d ${event.height.toFixed(2)} m`}
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <div className="grid">
            {forecast.hourly.map((hour) => (
              <article className="timeline-item" key={hour.time}>
                <div className="timeline-head">
                  <strong>{formatHourLabel(hour.time, forecast.location.timezone)}</strong>
                  <span className="score-chip">{hour.fishingScore} {"\u5206"}</span>
                </div>
                <div className="timeline-grid">
                  <div>
                    <div className="label">{"\u5929\u6c14"}</div>
                    <div className="value">{hour.temperature.toFixed(1)} C / code {hour.weatherCode}</div>
                  </div>
                  <div>
                    <div className="label">{"\u98ce"}</div>
                    <div className="value">
                      {hour.windSpeed.toFixed(1)} km/h {degToDirection(hour.windDirection)}
                    </div>
                  </div>
                  <div>
                    <div className="label">{"\u6c14\u538b"}</div>
                    <div className="value">{hour.pressure.toFixed(0)} hPa</div>
                  </div>
                  <div>
                    <div className="label">{"\u6f6e\u4f4d"}</div>
                    <div className="value">
                      {hour.tideHeight === null ? "\u5f85\u8865\u5145" : `${hour.tideHeight.toFixed(2)} m`} /{" "}
                      {hour.tideTrend}
                    </div>
                  </div>
                </div>
                {hour.risks.length ? <p className="footer-note danger">{hour.risks.join("\uff1b")}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <p className="footer-note">
        {
          "\u5df2\u4e3a\u540e\u7eed\u529f\u80fd\u9884\u7559\u6570\u636e\u7ed3\u6784\uff1afutureData.catchRecords \u53ef\u6269\u5c55\u5386\u53f2\u6e14\u83b7\u8bb0\u5f55\uff0cfutureData.dailyBriefSubscriptions \u53ef\u6269\u5c55\u81ea\u52a8\u6bcf\u65e5\u7b80\u62a5\u3002"
        }
      </p>
    </main>
  );
}
