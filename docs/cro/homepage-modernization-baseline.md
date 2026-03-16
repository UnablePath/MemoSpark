# Homepage Modernization Baseline

## Objective
Increase pricing conversion from the homepage while preserving MemoSpark's dark, bold brand aesthetic.

## Current Funnel and Event State

- Homepage view event is fired via `trackLandingPageView()` from `src/app/page.tsx`.
- CTA click event is fired from `src/components/ui/ABTestCTA.tsx`.
- Existing CTA test assignment is client-side random and persisted in `localStorage` only.
- Conversion persistence currently uses `conversion_analytics` through `src/app/api/analytics/conversion/route.ts`.
- Secure analytics aggregation in `src/app/api/secure/analytics/route.ts` uses `event_type` filters that do not match current event field usage.

## Baseline UX Constraints

- Homepage composition was previously monolithic in `src/app/page.tsx`.
- Hardcoded visual values mixed with tokens made iterative design testing slower.
- Mid-page interactions competed with pricing intent and diluted the conversion path.

## Baseline Risk List

- Event schema drift between client tracking and server analytics.
- Incomplete experiment attribution in downstream conversion events.
- Lack of deterministic assignment and server-side exposure logging.

## Initial Experiment Hypotheses

1. Pricing-focused hero secondary CTA increases pricing intent events.
2. Clear “How it works” section above social proof reduces confusion and increases CTA click-through.
3. Mid-page pricing strip increases signed-in visits to subscription settings.

## Primary Metrics

- Primary: `pricing_conversion_rate` (from pricing intent to successful paid conversion).
- Leading indicators:
  - `pricing_cta_click`
  - `pricing_strip_click`
  - `sign_up_started`
  - experiment exposure to click-through by variant

## Guardrails

- Maintain page load performance and avoid heavy animation payloads.
- Keep visual identity consistent with current logo, palette, and typography direction.
