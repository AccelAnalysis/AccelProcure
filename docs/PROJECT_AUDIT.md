# AccelProcure Codebase Audit

_Last updated: 2025-11-18 14:45:42Z_

## Tooling & Environment Readiness
- `.env.example` already enumerates every client/server credential (Mapbox, Supabase, Firebase, OpenAI, Stripe, etc.) so new engineers know which keys to supply before running Vite or the Express API. [Ref: `.env.example`]
- `package.json` defines the expected developer workflow (`npm run dev`, `build`, `preview`, `lint`, `format`, `test`, coverage variations, and standalone server scripts), matching the stack described in the root README. [Ref: `package.json`]
- The shared flat `eslint.config.js` enables the React, accessibility, import-order, hooks, Jest, and Prettier plugins for both browser and Node targets so `npm run lint` has a canonical ruleset. [Ref: `eslint.config.js`]
- `.yarnrc.yml` pins Yarn to the classic `node-modules` linker to avoid Plug'n'Play incompatibilities with Vite, Jest, and ESLint.

## Backend/API Surface
- `src/api/index.js` wires Express with JSON/cookie parsing, request IDs, global rate limiting, `/api/health`, and routers for auth, profiles, RFx, AI helpers, and map layers before defaulting to `notFound`/`error` handlers. [Ref: `src/api/index.js`]
- Auth endpoints under `src/api/routes/authRoutes.js` cover login, register, password reset, and session verification with schema validation + per-route rate limiting. Handlers rely on Supabase or Firebase admin helpers inside `src/api/auth/*.js`. [Ref: `src/api/routes/authRoutes.js`]
- RFx routes guard CRUD plus AI evaluation/matching workflows and enforce schemas through `validateRequest`, which handles type checking, enums, min/max length, and nested arrays. [Ref: `src/api/routes/rfxRoutes.js`, `src/api/middleware/validateRequest.js`]
- AI/map telemetry endpoints (`src/api/routes/aiRoutes.js` and `src/api/ai/mapInsights.js`) now expose `/ai/map-insights` and `/ai/map-insights/metrics`, caching Supabase reads and optionally summarizing via OpenAI. [Ref: `src/api/routes/aiRoutes.js`, `src/api/ai/mapInsights.js`]
- Middleware such as `requireAuth` supports both Supabase JWTs and Firebase ID tokens by checking headers, cookies, or query tokens, keeping provider logic inside `src/api/utils`. [Ref: `src/api/middleware/authGuard.js`, `src/api/utils/*.js`]
- `docs/postman/accelprocure-api.postman_collection.json` mirrors these endpoints for QA smoke tests.

## Frontend Shell & Client Logic
- The primary dashboard (`public/app.html`) renders navigation, metric cards, a Mapbox 3D canvas, and AI insight placeholders that are hydrated via ES modules. [Ref: `public/app.html`]
- `src/scripts/app.js` bootstraps navigation, listens for auth changes, initializes the map, and updates DOM segments for guest vs. authenticated states. [Ref: `src/scripts/app.js`]
- `src/scripts/map3d.js` configures Mapbox GL/Deck.gl (terrain, sky, 3D buildings) before delegating to `map-ai.js`, which layers AI heatmaps/arcs/anomalies and panels fed by `analyticsService`. [Ref: `src/scripts/map3d.js`, `src/scripts/map-ai.js`]
- Shared UI utilities (`src/scripts/shared.js`) provide fetch helpers, toast notifications, formatting, debounce, and loading indicators that the auth/profile/proposal scripts consume. [Ref: `src/scripts/shared.js`]
- Public auth flows such as `public/login.html` exercise `authService` directly and gate redirects based on `getCurrentUser`. [Ref: `public/login.html`]

## Services & External Integrations
- `src/services/httpClient.js` standardizes fetch calls, query param sanitization, and session handling (including 401 propagation), while `authService` listens for unauthorized events to clear cached users. [Ref: `src/services/httpClient.js`, `src/services/authService.js`]
- Supabase client initialization lives in `src/config/supabaseClient.js`, while API handlers use the service-role helper inside `src/api/utils/supabaseClient.js`; OpenAI and Firebase helpers follow the same pattern for dependency isolation. [Ref: `src/config/supabaseClient.js`, `src/api/utils/supabaseClient.js`, `src/api/utils/openaiClient.js`, `src/api/utils/firebaseAdmin.js`]
- `analyticsService` bridges Supabase RPC calls, cached map insight summaries, and live metrics polling plus realtime channel subscriptions so both admin dashboards and the map overlay can reuse identical data. [Ref: `src/services/analyticsService.js`]
- Additional services (`rfxService`, `profileService`, `aiService`, `mapService`, `storageService`, `creditService`) expose typed methods around the HTTP client; Jest smoke tests in `src/services/__tests__/services.test.js` assert that each service hits the correct endpoint contracts. [Ref: `src/services/__tests__/services.test.js`]

## Testing & QA Enablement
- `docs/README.md` walks through installing dependencies and running the Jest suite, including guidance for offline environments, while `src/setupTests.js` and `jest.config.js` configure the test harness. [Ref: `docs/README.md`, `jest.config.js`, `src/setupTests.js`]
- `docs/LIVE_MAP_INSIGHTS.md` documents the server/client handshake for map overlays/metrics and references mock data plus Postman steps for validation. [Ref: `docs/LIVE_MAP_INSIGHTS.md`]

## Documentation, Data, and Backend Gaps
- Most Markdown knowledge-base files (AI integration, API reference, auth system, data enrichment, deployment, map setup, sheet structure) remain empty placeholders pending content. [Ref: `wc -l docs/*.md` output]
- Core schema files (`ProfileSchema.json`, `ResponseSchema.json`, `RfxSchema.json`) and mock datasets remain blank, leaving integrators without canonical data contracts. [Ref: `wc -l data/schema/*.json`, `data/mock/*.json`]
- The legacy Apps Script backend stubs under `backend/Code.gs` and `backend/sheetSchema.gs` are zero-length, indicating those automation hooks still need implementation. [Ref: `wc -l backend/*.gs`]

## Immediate Risks & Recommendations
1. **Document the remaining schemas and operational guides.** Populate the empty Markdown and JSON schema files so downstream consumers (Supabase, spreadsheets, admin operations) have authoritative specs instead of guessing field shapes.
2. **Backfill data mocks for integration tests.** Without populated `data/mock` fixtures, E2E tests and Postman collections cannot exercise complex scenarios offline; mirror the structures described in `docs/LIVE_MAP_INSIGHTS.md`.
3. **Implement Google Workspace automation.** The blank Apps Script files should either be removed or filled with working sync logic to avoid confusion for admins expecting Sheets exports.
4. **Add broader automated tests.** Current Jest coverage only asserts service routing; consider API contract tests (supertest) and UI smoke tests to guard the Mapbox/Deck.gl flows.
