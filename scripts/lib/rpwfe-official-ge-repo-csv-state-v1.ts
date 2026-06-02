/**
 * Read-only RPWFE repo CSV state helpers shared by Command Center lanes.
 */

import {
  isDirectBuyableSafeCtaRow,
  isManufacturerSiteSearchUrl,
} from "@/lib/retailers/launch-buy-links";

import { RPWFE_OFFICIAL_GE_TARGET_URL_V1 } from "./rpwfe-official-ge-browser-capture-v1";

const FILTER_SLUG = "rpwfe" as const;
const RETAILER_KEY = "oem-parts-catalog" as const;

export type RpwfeRepoCsvRowLike = {
  filter_slug?: string;
  retailer_name?: string;
  affiliate_url?: string;
  is_primary?: string;
  retailer_key?: string;
  browser_truth_classification?: string | null;
  browser_truth_notes?: string | null;
  browser_truth_checked_at?: string | null;
};

export function isRpwfeRepoCsvOfficialGeDirectBuyableApplied(
  row: RpwfeRepoCsvRowLike | null,
): boolean {
  if (!row) return false;
  const url = row.affiliate_url?.trim() ?? "";
  const linkRow = {
    retailer_key: row.retailer_key ?? null,
    affiliate_url: url,
    browser_truth_classification: row.browser_truth_classification ?? null,
    browser_truth_buyable_subtype: null,
  };
  return (
    row.filter_slug?.trim().toLowerCase() === FILTER_SLUG &&
    row.retailer_key?.trim().toLowerCase() === RETAILER_KEY &&
    url === RPWFE_OFFICIAL_GE_TARGET_URL_V1 &&
    row.browser_truth_classification?.trim() === "direct_buyable" &&
    !isManufacturerSiteSearchUrl(url) &&
    isDirectBuyableSafeCtaRow(linkRow)
  );
}

export function rpwfeRepoCsvCurrentRowState(row: RpwfeRepoCsvRowLike | null): string {
  if (!row) return "no_retailer_links_csv_row_proven_for_rpwfe";
  if (isRpwfeRepoCsvOfficialGeDirectBuyableApplied(row)) {
    return "repo_direct_buyable_official_ge_spec_pdp_applied";
  }
  const url = row.affiliate_url?.trim() ?? "";
  if (isManufacturerSiteSearchUrl(url)) {
    return "existing_ge_catalog_search_placeholder_blocked";
  }
  return "repo_rpwfe_row_not_ready_for_apply";
}
