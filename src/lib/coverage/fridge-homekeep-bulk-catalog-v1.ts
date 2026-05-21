/**
 * Read-only curated refrigerator filter catalog for bulk Homekeep CSV generation
 * and coverage factory ranking. Single source of truth — do not duplicate in reports.
 *
 * @see scripts/generate-fridge-homekeep-bulk-csv.ts
 */

export type FridgeHomekeepBulkFilterEntryV1 = {
  slug: string;
  oem: string;
  name: string;
  notes?: string;
};

/** Curated OEM rows — slugs stable for URLs; oem_part_number matches manufacturer markings. */
export const FRIDGE_HOMEKEEP_BULK_FILTERS_BY_BRAND_V1: Record<string, FridgeHomekeepBulkFilterEntryV1[]> =
  {
    lg: [
      { slug: "lt1000p", oem: "LT1000P", name: "LG LT1000P (common 2018+ French door / side-by-side)" },
      { slug: "lt700p", oem: "LT700P", name: "LG LT700P (prior-gen slim filter)" },
      { slug: "lt800p", oem: "LT800P", name: "LG LT800P" },
      { slug: "lt600p", oem: "LT600P", name: "LG LT600P" },
      { slug: "adq74793501", oem: "ADQ74793501", name: "LG ADQ74793501 slim-line cartridge" },
      { slug: "adq73613402", oem: "ADQ73613402", name: "LG ADQ73613402" },
      { slug: "adq73613403", oem: "ADQ73613403", name: "LG ADQ73613403" },
      { slug: "adq36006101", oem: "ADQ36006101", name: "LG ADQ36006101" },
      { slug: "mdj64844601", oem: "MDJ64844601", name: "LG MDJ64844601" },
      { slug: "adq75795101", oem: "ADQ75795101", name: "LG ADQ75795101" },
      { slug: "lt1000pc", oem: "LT1000PC", name: "LG LT1000PC (certified alternate listing)" },
      { slug: "adq74793502", oem: "ADQ74793502", name: "LG ADQ74793502" },
    ],
    samsung: [
      { slug: "da29-00020b", oem: "DA29-00020B", name: "Samsung DA29-00020B / HAF-CIN family" },
      { slug: "da97-17376b", oem: "DA97-17376B", name: "Samsung DA97-17376B / HAF-QIN family" },
      { slug: "da29-00003g", oem: "DA29-00003G", name: "Samsung DA29-00003G" },
      { slug: "da97-08006b", oem: "DA97-08006B", name: "Samsung DA97-08006B" },
      { slug: "da29-00019a", oem: "DA29-00019A", name: "Samsung DA29-00019A" },
      { slug: "da29-10105j", oem: "DA29-10105J", name: "Samsung DA29-10105J" },
      { slug: "da97-19467c", oem: "DA97-19467C", name: "Samsung DA97-19467C" },
      { slug: "da97-15217d", oem: "DA97-15217D", name: "Samsung DA97-15217D" },
      { slug: "da29-00020a", oem: "DA29-00020A", name: "Samsung DA29-00020A (prior revision)" },
      { slug: "da97-06317a", oem: "DA97-06317A", name: "Samsung DA97-06317A" },
      { slug: "da29-00012b", oem: "DA29-00012B", name: "Samsung DA29-00012B" },
      { slug: "da97-17376a", oem: "DA97-17376A", name: "Samsung DA97-17376A (HAF-QIN variant)" },
    ],
    whirlpool: [
      { slug: "edr1rxd1", oem: "EDR1RXD1", name: "EveryDrop Filter 1 (Whirlpool/KitchenAid/Maytag)" },
      { slug: "edr2rxd1", oem: "EDR2RXD1", name: "EveryDrop Filter 2" },
      { slug: "edr3rxd1", oem: "EDR3RXD1", name: "EveryDrop Filter 3" },
      { slug: "edr4rxd1", oem: "EDR4RXD1", name: "EveryDrop Filter 4" },
      {
        slug: "ukf8001",
        oem: "UKF8001",
        name: "KitchenAid UKF8001 (EveryDrop Filter 4 compatible)",
      },
      { slug: "w10413645a", oem: "W10413645A", name: "Whirlpool W10413645A" },
      { slug: "4396841", oem: "4396841", name: "Whirlpool 4396841 (EveryDrop 1 compatible)" },
      { slug: "4396710", oem: "4396710", name: "Whirlpool 4396710" },
      { slug: "4396508", oem: "4396508", name: "Whirlpool 4396508" },
      { slug: "4396395", oem: "4396395", name: "Whirlpool 4396395" },
      { slug: "8171413", oem: "8171413", name: "Whirlpool 8171413" },
      { slug: "4396842", oem: "4396842", name: "Whirlpool 4396842" },
      { slug: "46-9002", oem: "46-9002", name: "Whirlpool 46-9002" },
    ],
    ge: [
      { slug: "mwf", oem: "MWF", name: "GE MWF SmartWater (older side-by-side)" },
      { slug: "mswf", oem: "MSWF", name: "GE MSWF" },
      { slug: "rpwfe", oem: "RPWFE", name: "GE RPWFE (RFID)" },
      { slug: "xwfe", oem: "XWFE", name: "GE XWFE (RFID)" },
      { slug: "xwf", oem: "XWF", name: "GE XWF (non-RFID shell)" },
      { slug: "gswf", oem: "GSWF", name: "GE GSWF" },
      { slug: "smartwater-mwfp", oem: "MWFP", name: "GE MWFP" },
      { slug: "opfg3f", oem: "OPFG3F", name: "GE OPFG3F (published GE alternate)" },
      { slug: "pfmwf", oem: "PFMWF", name: "GE PFMWF" },
      { slug: "gswf2", oem: "GSWF2", name: "GE GSWF2 listing (verify housing)" },
    ],
    frigidaire: [
      { slug: "wf3cb", oem: "WF3CB", name: "Frigidaire PureSource 3 (WF3CB)" },
      { slug: "ultrawf", oem: "ULTRAWF", name: "Frigidaire ULTRAWF PureSource Ultra" },
      { slug: "eptwfu01", oem: "EPTWFU01", name: "Frigidaire EPTWFU01" },
      { slug: "fppwfu01", oem: "FPPWFU01", name: "Frigidaire FPPWFU01" },
      { slug: "wf2cb", oem: "WF2CB", name: "Frigidaire WF2CB" },
      { slug: "wfcb", oem: "WFCB", name: "Frigidaire WFCB" },
      { slug: "purepour", oem: "PPWFU01", name: "Frigidaire PPWFU01" },
      { slug: "frig-242017801", oem: "242017801", name: "Frigidaire 242017801 OEM" },
      { slug: "frig-242086201", oem: "242086201", name: "Frigidaire 242086201 OEM" },
      { slug: "frig-242294502", oem: "242294502", name: "Frigidaire 242294502 OEM" },
    ],
  };

export type FridgeHomekeepBulkFilterRowV1 = {
  brand_slug: string;
  slug: string;
  oem_part_number: string;
  name: string;
};

/** Flatten curated bulk catalog for read-only coverage ranking. */
export function listFridgeHomekeepBulkFilterRowsV1(): FridgeHomekeepBulkFilterRowV1[] {
  const out: FridgeHomekeepBulkFilterRowV1[] = [];
  for (const [brand_slug, rows] of Object.entries(FRIDGE_HOMEKEEP_BULK_FILTERS_BY_BRAND_V1)) {
    for (const row of rows) {
      out.push({
        brand_slug,
        slug: row.slug.trim().toLowerCase(),
        oem_part_number: row.oem.trim().toUpperCase(),
        name: row.name.trim(),
      });
    }
  }
  return out;
}
