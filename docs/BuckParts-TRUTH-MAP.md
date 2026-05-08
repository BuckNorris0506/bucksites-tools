# BuckParts Truth Map (Canonical)

Use this file as the primary owner/Cursor navigation map for BuckParts truth sources.

- If this file conflicts with repo code or command output, repo/command output wins.
- If a fact is not proven by the files below or a named command result, treat it as `UNKNOWN`.

## Policy Truth

- **Page state policy**
  - `src/lib/page-state/page-state.ts`
  - `src/lib/page-state/page-state-meta.ts`
- **Quarantine/conflict overrides**
  - `src/lib/fridge/fridge-model-review-overrides.ts`
  - dedicated conflict artifact: `docs/fridge-model-filter-mapping-discrepancies.md`
- **Vertical launch/noindex/sitemap policy**
  - `src/lib/catalog/vertical-launch-state.ts`
  - `src/lib/owner-dashboard/owner-vertical-launch-policy.ts`
- **Buyer-path/safe CTA gate policy**
  - `src/lib/retailers/launch-buy-links.ts`
  - `src/lib/retailers/go-redirect-gate.ts`
- **Public trust-language policy**
  - `src/lib/copy/public-trust.ts`
  - `src/lib/copy/fridge-homeowner-help.ts`

## Runtime Truth

- **Fridge flagship runtime pages**
  - `src/app/fridge/[slug]/page.tsx`
  - `src/app/filter/[slug]/page.tsx`
- **Manual/source evidence runtime**
  - `src/lib/manuals/refrigerator-manual-evidence.ts`
  - `src/lib/manuals/refrigerator-manual-evidence-loader.ts`
  - `src/components/trust/ManualEvidenceCallout.tsx`
- **Form-factor evidence runtime**
  - `src/lib/fridge/fridge-form-factor-evidence.ts`
  - `src/components/trust/VisualReplacementMatchCard.tsx`
- **Buyer-path/safe CTA runtime**
  - `src/lib/trust/part-trust.ts`
  - `src/components/trust/TrustAwareBuySection.tsx`
  - `src/components/TieredBuyLinks.tsx`

## Measurement Truth

- **GA4 fridge trust-funnel analytics**
  - `src/components/AnalyticsScripts.tsx`
  - `src/lib/analytics/fridge-trust-funnel.ts`
  - `src/components/analytics/FridgeTrustFunnelViewTracker.tsx`
  - `src/components/analytics/FridgeTrustFunnelLink.tsx`
  - `src/components/analytics/FridgeTrustFunnelDetails.tsx`
- **`/go` click_events tracking**
  - `src/lib/retailers/go-affiliate-route-handler.ts`
  - `src/app/go/[linkId]/route.ts`
  - wedge routes under `src/app/*/go/[linkId]/route.ts`
- **search_events/search_gaps telemetry**
  - `src/lib/search/telemetry.ts`
  - `src/lib/data/search.ts`
  - `src/app/api/search/route.ts`

## Operator Truth

- **Owner dashboard/reporting**
  - `src/app/ownerdashboard/[secret]/page.tsx`
  - `src/lib/owner-dashboard/load-command-center-report.ts`
  - `src/lib/owner-dashboard/gsc-external-demand.ts`
  - `src/lib/owner-dashboard/gsc-api-artifact.ts`
  - `scripts/report-buckparts-command-center.ts`
  - `scripts/lib/buckparts-command-center-v2.ts`
  - `scripts/lib/buckparts-click-events-snapshot.ts`
  - `scripts/fetch-buckparts-gsc-artifact.ts`
  - setup/runbook: `docs/buckparts-gsc-api-artifact-ingestion.md`
- **HQ/handoff/process docs (context, not canonical runtime truth)**
  - `docs/BuckParts-HQ-HANDOFF.md`
  - `docs/BuckParts-CURSOR-INBOX.md`
  - `docs/buckparts-operating-map.md`
  - `docs/fridge-model-filter-mapping-discrepancies.md`
