# HealthGuard

HealthGuard is a safety-first symptom-triage assistant that helps people understand how urgently to seek professional care without claiming to diagnose disease.


## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/healthguard` — the user-facing React/Vite web app
- `artifacts/api-server/src/routes/triage.ts` — transparent, stateless triage safety rules
- `lib/api-spec/openapi.yaml` — source of truth for the triage API contract
- `lib/api-client-react` and `lib/api-zod` — generated client hooks and validation schemas

## Architecture decisions

- Triage is intentionally rule-first and stateless; high-risk indicators are evaluated before any future generative layer.
- Results use urgency tiers and possible symptom categories instead of definitive disease diagnoses.
- Test guidance is phrased as clinician discussion guidance, never as an order or requirement.
- The first version does not persist symptom details or create medical records.

## Product

- A calm welcome screen explains the safety boundary before assessment.
- A multi-step guided assessment collects symptom description, severity, timing, context, history, medications, and pregnancy status.
- The result view gives an urgency label, red flags, next steps, possible symptom categories, and tests a clinician may consider.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
