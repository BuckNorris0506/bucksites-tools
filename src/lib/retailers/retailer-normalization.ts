export const CANONICAL_RETAILER_KEYS = [
  "amazon",
  "appliancepartspros",
  "ge-appliance-parts",
  "home-depot",
  "lowes",
  "levoit-oem-dtc",
  "coway-oem-dtc",
  "winix-oem-dtc",
] as const;

export type CanonicalRetailerKey = (typeof CANONICAL_RETAILER_KEYS)[number];

function normalizeToken(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const RETAILER_NAME_TO_KEY = new Map<string, CanonicalRetailerKey>([
  ["amazon", "amazon"],
  ["amazon com", "amazon"],
  ["amzn", "amazon"],

  ["appliancepartspros", "appliancepartspros"],
  ["appliancepartspros reseller", "appliancepartspros"],
  ["appliance parts pros", "appliancepartspros"],

  ["ge", "ge-appliance-parts"],
  ["ge appliances", "ge-appliance-parts"],
  ["ge parts", "ge-appliance-parts"],
  ["ge appliance parts", "ge-appliance-parts"],

  ["home depot", "home-depot"],
  ["homedepot", "home-depot"],

  ["lowes", "lowes"],
  ["lowe s", "lowes"],

  ["levoit oem dtc", "levoit-oem-dtc"],
  ["levoit", "levoit-oem-dtc"],

  ["coway oem dtc", "coway-oem-dtc"],
  ["coway", "coway-oem-dtc"],

  ["winix oem dtc", "winix-oem-dtc"],
  ["winix", "winix-oem-dtc"],
]);

/** Maps user/vendor retailer text to a canonical BuckParts retailer_key. */
export function normalizeRetailerName(input: string): CanonicalRetailerKey | null {
  const token = normalizeToken(input);
  if (!token) return null;
  return RETAILER_NAME_TO_KEY.get(token) ?? null;
}
