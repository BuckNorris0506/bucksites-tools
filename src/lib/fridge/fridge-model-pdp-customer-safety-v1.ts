/**
 * Customer-facing fridge model PDP safety — downgrades confident buy when learned-failure
 * confusion_family guards fire at WARN. Read-only; does not mutate catalog data.
 */

import {
  getFridgeLearnedFailureGuardRowV1,
  resolveFridgeCustomerSafetyV1,
  type FridgeCustomerSafetyEvidenceBasisV1,
} from "@/lib/fridge/fridge-learned-failure-customer-guard-v1";

export const FRIGIDAIRE_PROVEN_ANCHOR_SIBLING_DRIFT_GUARD_ID_V1 =
  "frigidaire_proven_anchor_sibling_drift" as const;

export const CONFUSION_FAMILY_WARN_MODEL_PAGE_NOTE_V1 =
  "BuckParts flagged a part-family conflict for this refrigerator model. Verify your exact model number and compare the cartridge code on your old filter before buying." as const;

export const DISPUTED_ANCHOR_MODEL_PAGE_NOTE_V1 =
  "BuckParts is reviewing whether this model's linked filter is correct — sibling models in the same family use a different cartridge. Verify your exact model and part number before buying." as const;

export type FridgeModelPdpCustomerSafetyV1 = {
  quarantine: boolean;
  confusion_family_warn_guard_ids: string[];
  disputed_proven_anchor: boolean;
  model_page_caution_note: string | null;
  prefer_caution_buy: boolean;
  prefer_noindex: boolean;
  evidence_basis: FridgeCustomerSafetyEvidenceBasisV1;
};

function warnConfusionFamilyGuardIds(
  row: NonNullable<ReturnType<typeof getFridgeLearnedFailureGuardRowV1>>,
): string[] {
  return row.confusion_family_guards
    .filter((guard) => guard.verdict === "WARN")
    .map((guard) => guard.guard_id);
}

export function resolveFridgeModelPdpCustomerSafetyV1(args: {
  fridgeModelSlug: string;
  rootDir?: string;
}): FridgeModelPdpCustomerSafetyV1 {
  const base = resolveFridgeCustomerSafetyV1(args);
  if (base.quarantine) {
    return {
      quarantine: true,
      confusion_family_warn_guard_ids: [],
      disputed_proven_anchor: false,
      model_page_caution_note: null,
      prefer_caution_buy: false,
      prefer_noindex: true,
      evidence_basis: base.evidence_basis,
    };
  }

  const guardRow = getFridgeLearnedFailureGuardRowV1(args);
  const warnGuardIds = guardRow ? warnConfusionFamilyGuardIds(guardRow) : [];
  if (warnGuardIds.length === 0) {
    return {
      quarantine: false,
      confusion_family_warn_guard_ids: [],
      disputed_proven_anchor: false,
      model_page_caution_note: null,
      prefer_caution_buy: false,
      prefer_noindex: false,
      evidence_basis: guardRow ? "PROVEN" : "UNKNOWN",
    };
  }

  const disputed_proven_anchor = warnGuardIds.includes(
    FRIGIDAIRE_PROVEN_ANCHOR_SIBLING_DRIFT_GUARD_ID_V1,
  );
  const model_page_caution_note = disputed_proven_anchor
    ? DISPUTED_ANCHOR_MODEL_PAGE_NOTE_V1
    : CONFUSION_FAMILY_WARN_MODEL_PAGE_NOTE_V1;

  return {
    quarantine: false,
    confusion_family_warn_guard_ids: warnGuardIds,
    disputed_proven_anchor,
    model_page_caution_note,
    prefer_caution_buy: true,
    prefer_noindex: disputed_proven_anchor,
    evidence_basis: "PROVEN",
  };
}
