import type { Brand } from "@/lib/types/database";

export type HumidifierFilterRow = {
  id: string;
  slug: string;
  brand_id: string;
  oem_part_number: string;
  name: string | null;
  replacement_interval_months: number | null;
  notes: string | null;
};

export type HumidifierModelListRow = {
  id: string;
  slug: string;
  model_number: string;
  brand: Pick<Brand, "slug" | "name">;
};

export type HumidifierRetailerLink = {
  id: string;
  humidifier_filter_id: string;
  retailer_name: string | null;
  affiliate_url: string;
  is_primary: boolean | null;
  retailer_key: string;
  browser_truth_classification?: string | null;
  browser_truth_buyable_subtype?: string | null;
  browser_truth_notes?: string | null;
  browser_truth_checked_at?: string | null;
};
