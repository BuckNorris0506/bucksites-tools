/** Row shapes aligned with Supabase tables (extend as your schema evolves). */

export type Brand = {
  id: string;
  slug: string;
  name: string;
  created_at?: string;
};

export type Filter = {
  id: string;
  slug: string;
  brand_id: string;
  oem_part_number: string;
  name: string | null;
  replacement_interval_months: number | null;
  notes: string | null;
};

export type FilterAlias = {
  id: string;
  filter_id: string;
  alias: string;
};

export type FridgeModel = {
  id: string;
  slug: string;
  brand_id: string;
  model_number: string;
  notes: string | null;
};

export type FridgeModelAlias = {
  id: string;
  fridge_model_id: string;
  alias: string;
};

export type CompatibilityMapping = {
  fridge_model_id: string;
  filter_id: string;
};

export type RetailerLink = {
  id: string;
  filter_id: string;
  retailer_name: string | null;
  affiliate_url: string;
  is_primary: boolean | null;
};

export type HelpPage = {
  id: string;
  slug: string;
  title: string;
  body: string | null;
  meta_description: string | null;
};

export type ResetInstruction = {
  id: string;
  brand_id: string;
  title: string | null;
  body_markdown: string;
};

export type ClickEvent = {
  id?: string;
  retailer_link_id: string | null;
  target_url: string;
  user_agent: string | null;
  referrer: string | null;
  created_at?: string;
};
