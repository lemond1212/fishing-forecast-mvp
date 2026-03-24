# Fishing Forecast MVP

Next.js + TypeScript mobile-first web app for 48-hour fishing forecasts, tide windows, and a rule-based fishing index.

## Done

- Search by fishing spot name or coordinates
- Resolve location on the server
- Fetch weather from Open-Meteo
- Fetch tide data from Stormglass
- Show 48-hour weather, wind, pressure, tide events, and sea-level changes
- Calculate a 0-100 fishing score with time window recommendations and risk alerts
- Reserve data structures for catch history and daily briefing features

## APIs

- Weather: Open-Meteo Forecast API
- Tide: Stormglass Tide API
- If `STORMGLASS_API_KEY` is missing or the request fails, the app falls back to demo tide data so the MVP can still run

## Local Run

1. Install Node.js 20+
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local`
4. Fill in `STORMGLASS_API_KEY`
5. Start dev server: `npm run dev`

## Future Extension

- Persist `CatchRecord` from `lib/types.ts` into a database for catch history
- Connect `DailyBriefSubscription` to scheduling and notification channels for daily digests
- Upgrade the rule engine with fish species, season, moon phase, and style-specific tuning
