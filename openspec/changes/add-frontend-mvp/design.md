# Design: add-frontend-mvp

## Context

The backend is a Go modular monolith exposing `/api/v1` REST JSON. Auth is opaque Bearer tokens (server-side sessions, no JWT). Money travels as decimal strings. The frontend directory is empty except for `CLAUDE.md` (project spec + design system) and this OpenSpec change. Sales endpoints exist but currently return 501; the frontend must integrate against the contract and degrade gracefully.

## Goals / Non-Goals

**Goals**
- Ship the MVP screens (login, POS, products, inventory, categories, reports) fast and simple.
- Encode the fixed design system as the only styling path.
- Keep the POS critical path keyboard-first and resilient to network failure.

**Non-Goals**
- Dark mode, offline mode, i18n framework (Spanish copy is hardcoded), returns/refunds, discounts, user management UI, data export.
- No speculative abstraction: no state library, no API-client codegen, no component library beyond the small UI kit.

## Decisions

1. **Next.js App Router + TypeScript + Tailwind.** Tailwind theme extends only the CLAUDE.md tokens (colors, `borderRadius: 12px`, soft shadow scale); arbitrary color values are avoided by convention and review. Alternative (CSS modules) rejected: more ceremony for a small token-driven system.
2. **Auth via Next.js route handlers as a thin proxy** (`/api/session`): login sets an httpOnly cookie with the backend token; server components and route handlers attach `Authorization: Bearer` when calling the backend. Alternative (token in localStorage + client fetch) rejected: exposes the session token to XSS. The role is readable client-side (non-secret) for UI gating; the backend remains the real enforcer.
3. **Plain `fetch` with a tiny typed API wrapper** (`lib/api.ts`) that: prefixes the base URL, attaches auth, parses `{ message }` errors into a typed `ApiError`, and redirects to `/login` on 401. Alternative (TanStack Query) deferred until caching/invalidation pain is real.
4. **Decimal handling**: prices stay strings end-to-end; cart totals computed in integer cents via a small helper. No `parseFloat` on money. Alternative (decimal.js) rejected as overkill for sum/multiply of 2-decimal values.
5. **Feature-folder layout**: `app/(auth)/login`, `app/(app)/{pos,products,inventory,categories,reports}` under a role-gated layout; shared primitives in `components/ui`; per-feature components colocated. UI kit is built first and screens compose it.
6. **Category pastel colors** assigned deterministically (hash of category id → one of 5 pastels) so badges are stable without backend support.

## Risks / Trade-offs

- [Sales endpoints return 501] → POS is built against the documented contract; errors surface the backend message verbatim. Implementation tasks flag this dependency; no mocking.
- [No sales-history/low-stock/category-edit endpoints] → those screens/sections are omitted or read-only until the backend adds them; gaps are flagged in `CLAUDE.md`.
- [httpOnly cookie proxy adds a hop] → acceptable; it keeps tokens out of JS and centralizes 401 handling.
- [Client-side role gating is cosmetic] → backend authorization is authoritative; UI gating is UX only.

## Migration Plan

Greenfield: scaffold app → tokens + UI kit → auth → POS → catalog → inventory → reports. No rollback concerns; nothing deployed yet.

## Open Questions

- Confirm whether `POST /sales` accepts items in the create payload or requires a separate add-item endpoint once the backend implements it (currently 501; contract not final).
- Category management: Admin-only assumed (matches backend system overview "to be confirmed").
