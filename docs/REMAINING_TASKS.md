# Remaining Tasks Derived from Project Audit

The "Remaining Tasks & Risks" section in `docs/PROJECT_AUDIT.md` enumerates high-level gaps. This tracker expands those findings into concrete, engineer-friendly tasks that can be lifted into Jira / Linear.

## 1. Align client services with API routes
- [x] Diff every service endpoint in `src/services` against the routers in `src/api/routes`.
- [x] Rename or remap mismatched client endpoints (e.g., `/ai/proposals` → `/ai/proposal`).
- [x] Update Express routers when the API contract should change instead of the client.
- [x] Add regression tests that hit each endpoint pair (supertest + mocked fetch).

## 2. Expose missing storage, credits, and admin APIs
- [ ] Create routers/controllers for `/storage/*`, `/credits/*`, `/admin/*` to match existing services.
- [ ] Wire these routers into `src/api/index.js` and secure them with the existing middleware.
- [ ] Add schema validation + rate limiting consistent with other routes.
- [ ] Document the new endpoints in the API reference.

## 3. Populate documentation placeholders
- [ ] Fill in `docs/AI_INTEGRATION.md`, `API_REFERENCE.md`, `AUTH_SYSTEM.md`, `DATA_ENRICHMENT.md`, `DEPLOYMENT.md`, `MAPBOX_3D_SETUP.md`, and `SHEET_STRUCTURE.md` using the plan in `Development Order.txt`.
- [ ] Ensure each doc lists prerequisites, environment variables, and key workflows.
- [ ] Link these docs from `docs/README.md` for discoverability.

## 4. Define JSON schemas and mock fixtures
- [ ] Author canonical schemas in `data/schema/*.json` (profiles, RFx, responses, credit ledger).
- [ ] Backfill `data/mock/demoProfiles.json` and `data/mock/demoRfx.json` with realistic sample data.
- [ ] Update tests and Supabase seed scripts to use the new schemas and fixtures.

## 5. Restore Google Workspace / Sheets automations
- [ ] Implement the Apps Script logic in `backend/Code.gs` and `backend/sheetSchema.gs` per the spreadsheet workflows outlined in `Development Order.txt`.
- [ ] Document deployment instructions for the scripts (OAuth scopes, triggers, Sheets IDs).
- [ ] Provide a sample spreadsheet or export template referenced by the script.

## 6. Broaden automated testing
- [ ] Add API contract tests (e.g., supertest) that cover auth, profiles, RFx, AI, map, storage, credits, and admin routers.
- [ ] Add Jest/Vitest tests for frontend modules (map initialization, admin dashboard data flows, service integrations).
- [ ] Introduce UI smoke/e2e tests (Playwright or Cypress) for the Vite bundle.
- [ ] Configure CI to run the expanded suites.

## 7. Close the loop on credits & analytics flows
- [ ] Stand up backend endpoints (and matching schemas) that persist credit debits/ledger entries.
- [ ] Ensure the admin analytics flows can reconcile credit events with RFx / AI activity.
- [ ] Update `creditService` and admin dashboard controllers once the new APIs exist.
- [ ] Document the end-to-end credit lifecycle and analytics KPIs.
