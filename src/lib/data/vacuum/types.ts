import type { Brand } from "@/lib/types/database";

export type VacuumFilterRow = {
  id: string;
  slug: string;
  brand_id: string;
  oem_part_number: string;
  name: string | null;
  replacement_interval_months: number | null;
  notes: string | null;
};

export type VacuumModelListRow = {
  id: string;
  slug: string;
  model_number: string;
  brand: Pick<Brand, "slug" | "name">;
};

export type VacuumRetailerLink = {
  id: string;
  vacuum_filter_id: string;
  retailer_name: string | null;
  affiliate_url: string;
  is_primary: boolean | null;
  retailer_key: string;
};
