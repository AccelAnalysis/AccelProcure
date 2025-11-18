# Live Map Insights Pipeline

This document captures how AccelRFx streams AI-generated map overlays, live metrics, and summaries into both the public 3D map and the admin console.

## Server endpoints

| Endpoint | File | Description |
| --- | --- | --- |
| `GET /ai/map-insights` | `src/api/ai/mapInsights.js` | Returns normalized overlays (`features`, `aiInsights` heatmaps/arcs/anomalies), telemetry metrics, and a short AI-generated summary for the requested region. |
| `GET /ai/map-insights/metrics` | `src/api/ai/mapInsights.js` | Lightweight endpoint that exposes only the live metrics envelope used for streaming dashboards and overlays. |

Both endpoints share an in-memory cache (60 seconds) so the expensive Supabase queries and OpenAI completions are reused when multiple clients request the same region in a short window. The data contract matches `data/schema/MapInsightsSchema.json` and is seeded by `data/mock/mapInsights.json` for onboarding/testing.

## Front-end consumers

| Surface | File | Notes |
| --- | --- | --- |
| Public map overlay | `src/scripts/map-ai.js` | Fetches both `/map/layers` and `/ai/map-insights` to render the deck.gl layers plus AI summary + metrics panel. Subscribes to realtime Supabase changes so metric cards update without a full refresh. |
| Admin console | `src/scripts/admin.js` | Renders the same insight summary inside the "AI Insights" card, populates live metrics, and mirrors the realtime stream so administrators can monitor anomalies/hotspots. |

Shared utility CSS for the overlay/metric cards lives in `src/styles/theme.css`, `src/styles/styles.css`, `src/styles/map3d.css`, and `src/styles/forms.css` so any future public page can drop in the components.

## Testing + mock data

* `data/mock/mapInsights.json` – realistic overlays/metrics that can be loaded into Postman or Supabase.
* `data/mock/mapInsightMetrics.json` – rolling metric snapshots for regression tests.
* `docs/postman/` collection – add the two endpoints above for easy smoke testing.

When QA runs in an environment without Supabase/OpenAI credentials the API handlers automatically fall back to deterministic summaries and sample telemetry, so UI smoke tests still render predictable cards.
