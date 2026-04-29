-- BuckParts Phase 3 Step 12
-- Prepared SQL plan only. Do NOT auto-run from application code.
-- This file is for operator-reviewed/manual execution in a controlled SQL session.
-- Scope: mark known dead Frigidaire OEM search rows as unsafe/not found in browser-truth fields.
-- Safety: no DELETE statements; UPDATE is constrained by explicit IDs and retailer_key guard.

BEGIN;

-- Pre-mutation verification: confirm current state of the exact target rows.
SELECT
  id,
  retailer_key,
  affiliate_url,
  browser_truth_classification,
  browser_truth_notes,
  browser_truth_checked_at
FROM public.retailer_links
WHERE retailer_key = 'oem-parts-catalog'
  AND id IN (
    'cd49afff-32cd-4c64-97df-57335d1b23da', -- 242017801
    '49dc9fc1-4f94-499b-8932-b33580b0af11', -- 242086201
    '2b446a6f-d4be-4848-abd5-98043e5920a5', -- 242294502
    '96dd791c-4a8f-42f4-9b4d-cb424ea5e879', -- EPTWFU01
    'fe139d6a-4d8c-472f-8f3a-0aeb83870557'  -- FPPWFU01
  )
ORDER BY id;

-- Prepared mutation: mark dead OEM search rows as likely_not_found from manual evidence.
UPDATE public.retailer_links
SET
  browser_truth_classification = 'likely_not_found',
  browser_truth_notes = 'Manual browser evidence 2026-04-29: Frigidaire search URL returned Requested page is not available; no direct PDP discovered.',
  browser_truth_checked_at = '2026-04-29T00:00:00.000Z'
WHERE retailer_key = 'oem-parts-catalog'
  AND id IN (
    'cd49afff-32cd-4c64-97df-57335d1b23da', -- 242017801
    '49dc9fc1-4f94-499b-8932-b33580b0af11', -- 242086201
    '2b446a6f-d4be-4848-abd5-98043e5920a5', -- 242294502
    '96dd791c-4a8f-42f4-9b4d-cb424ea5e879', -- EPTWFU01
    'fe139d6a-4d8c-472f-8f3a-0aeb83870557'  -- FPPWFU01
  );

-- Post-mutation verification: confirm expected browser-truth values were written.
SELECT
  id,
  retailer_key,
  affiliate_url,
  browser_truth_classification,
  browser_truth_notes,
  browser_truth_checked_at
FROM public.retailer_links
WHERE retailer_key = 'oem-parts-catalog'
  AND id IN (
    'cd49afff-32cd-4c64-97df-57335d1b23da',
    '49dc9fc1-4f94-499b-8932-b33580b0af11',
    '2b446a6f-d4be-4848-abd5-98043e5920a5',
    '96dd791c-4a8f-42f4-9b4d-cb424ea5e879',
    'fe139d6a-4d8c-472f-8f3a-0aeb83870557'
  )
ORDER BY id;

-- Safety default for planning sessions: do not persist automatically.
-- Replace ROLLBACK with COMMIT only after operator review of post-mutation verification output.
ROLLBACK;
