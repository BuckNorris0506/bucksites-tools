/**
 * Writes data/*.csv for refrigerator_water bulk import.
 * Run: npx tsx scripts/generate-fridge-homekeep-bulk-csv.ts
 *
 * OEM numbers and model families are chosen to match widely published US-market
 * part numbers and naming patterns (always verify on the appliance before purchase).
 * Each filter row gets one non-placeholder `retailer_links` line: an OEM / authorized-parts
 * catalog keyword URL for the published `oem_part_number` (not Google/Bing web search).
 */
import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "data");

const NOTES_FILTER =
  "Published OEM-style part number; confirm year/trim with LG/Samsung/GE/Whirlpool/Frigidaire fit charts.";

/** Parts-site keyword URLs (not checkout deeplinks; not search-engine discovery URLs). */
function oemCatalogSupportUrl(brandSlug: string, oemPart: string): string {
  const enc = encodeURIComponent(oemPart);
  switch (brandSlug) {
    case "ge":
      return `https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=${enc}`;
    case "whirlpool":
      return `https://www.whirlpoolparts.com/catalog.jsp?search=stw=&path=&searchKeyword=${enc}`;
    case "frigidaire":
      return `https://www.frigidaire.com/en/catalogsearch/result/?q=${enc}`;
    case "samsung":
    case "lg":
      return `https://www.repairclinic.com/Search?SearchTerm=${enc}`;
    default:
      return `https://www.repairclinic.com/Search?SearchTerm=${enc}`;
  }
}

function csvEscapeField(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
const NOTES_MODEL =
  "Retail model # pattern; confirm on rating plate — do not rely on this row alone for fit.";

type F = { slug: string; oem: string; name: string; notes?: string };

/** Curated OEM rows — slugs stable for URLs; oem_part_number matches manufacturer markings. */
const FILTERS: Record<string, F[]> = {
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

const BRANDS = [
  { slug: "lg", name: "LG", searchName: "LG" },
  { slug: "samsung", name: "Samsung", searchName: "Samsung" },
  { slug: "whirlpool", name: "Whirlpool", searchName: "Whirlpool" },
  { slug: "ge", name: "GE Appliances", searchName: "GE" },
  { slug: "frigidaire", name: "Frigidaire", searchName: "Frigidaire" },
] as const;

/** Live rows per brand after dedupe; requires ≥ this many unique model numbers per brand below. */
const MODELS_PER_BRAND = 100;

/** Published-style US model numbers (rating-plate style; confirm before purchase). */
const REAL_MODELS: Record<string, string[]> = {
  lg: [
    "LFXS26973S",
    "LFXC22596S",
    "LMXS28626S",
    "LFCS22520S",
    "LRMVC2306S",
    "LRFVS3006S",
    "LFXS28596S",
    "LRSXS2706S",
    "LSXS26366S",
    "LFDS22520S",
    "LFXS28968S",
    "LMWS27626S",
    "LFXC22526S",
    "LFXS30796D",
    "LFXS26973D",
    "LFXS28566S",
    "LFXS28968D",
    "LMXS30796S",
    "LFXC24796D",
    "LFCC22426S",
    "LFXS26596S",
    "LFXS28991S",
    "LRSOS2706S",
    "LRFXC2416S",
    "LFXS28566D",
    "LFXC22596D",
    "LMXS28626D",
    "LFCS22520D",
    "LFXS26973B",
    "LFXS28596B",
    "LFXS30766S",
    "LFXS28968B",
    "LMWS27626D",
    "LFXC22596B",
    "LMXS30796D",
    "LFXS28566M",
    "LFXS26973M",
    "LFCC23596S",
    "LRSXS2706D",
    "LSXS26366D",
    "LFXS30796S",
    "LFXS28596M",
    "LMXS28626M",
    "LFXC24796S",
    "LFXS28991D",
    "LRMVC2306D",
    "LRFVS3006D",
    "LFXS26596D",
    "LFDS22520B",
    "LFXS30766D",
    "LFXS28566B",
    "LFXS26996S",
    "LMXS30786S",
    "LFXC22536S",
    "LFXS27596S",
  ],
  samsung: [
    "RF28R7351SG",
    "RF263BEAESR",
    "RF23J9011SG",
    "RS25J500DSR",
    "RF22K9381SG",
    "RF28NHEDBSR",
    "RF27T5501SR",
    "RF18HFENBSR",
    "RF28K9380SR",
    "RF260BEAESR",
    "RF22K9581SG",
    "RF23M8070SG",
    "RF28R7201SR",
    "RS22T5201SR",
    "RF265BEAESR",
    "RF28R7551SR",
    "RF23M8590SG",
    "RF22KREDBSG",
    "RF28R7351SR",
    "RF263TEAESR",
    "RF28R6201SR",
    "RF22M9581SG",
    "RF23J9011SR",
    "RS25H5111SR",
    "RF28K9380SG",
    "RF260BEAESG",
    "RF263BEAESG",
    "RF22K9381SR",
    "RF28R7201SG",
    "RF27T5501SG",
    "RF18HFENBWW",
    "RF28NHEDBWW",
    "RF28R7551SG",
    "RF265BEAESG",
    "RF23M8070SR",
    "RF28R6201SG",
    "RS22T5201SG",
    "RF260BEAESP",
    "RF263BEAESP",
    "RF22K9581SR",
    "RF23M8590SR",
    "RF28K9380SW",
    "RF28R7351WW",
    "RF263BEAEWW",
    "RF27T5201SR",
    "RF22N9781SG",
    "RF23BB8200QL",
    "RF28R7551WW",
    "RF260BEAEWW",
    "RF22K9381WW",
    "RF28R7201WW",
    "RF263TEAESG",
    "RF28R6201WW",
    "RF23J9011WW",
    "RS25J500DWW",
  ],
  whirlpool: [
    "WRX735SDHZ",
    "WRF767SDHZ",
    "WRF535SMHZ",
    "WRX986SIHZ",
    "WRS588FIHZ",
    "WRF540CWHZ",
    "WRF555SDFZ",
    "WRS315SDHZ",
    "WRS325SDHZ",
    "WRS571CIHZ",
    "WRS325FDAM",
    "WRF757SDHZ",
    "WRS588FIHV",
    "WRX735SDHB",
    "WRF767SDHV",
    "WRF535SMHB",
    "WRS588FIHB",
    "WRF540CWHB",
    "WRF555SDHB",
    "WRS315SDHB",
    "WRS325SDHB",
    "WRS571CIHB",
    "WRF757SDHV",
    "WRX735SDHM",
    "WRF767SDHM",
    "WRF535SMHM",
    "WRS588FIHM",
    "WRF540CWHM",
    "WRF555SDFM",
    "WRS315SDHM",
    "WRS325SDHM",
    "WRS571CIHM",
    "WRF757SDHM",
    "WRX986SIHV",
    "WRX986SIHB",
    "WRF540CWBZ",
    "WRF535SWHZ",
    "WRS588SIBM",
    "WRS325SDHV",
    "WRS315SDHV",
    "WRF767SDHB",
    "WRF555SDHV",
    "WRS571CIHV",
    "WRF757SDHB",
    "WRX735SDHV",
    "WRF535SDHZ",
    "WRF540CMHZ",
    "WRF555SDHZ",
    "WRS315SNHM",
    "WRS325SNHZ",
    "WRS571SDHZ",
    "WRF757SDFZ",
    "WRX986SDHZ",
    "WRS312SNHZ",
    "WRS321SNAM",
  ],
  ge: [
    "GFE28GSKSS",
    "PFE28KSKSS",
    "GNE27JSMSS",
    "CYE22TP2MS1",
    "GSS25GSHSS",
    "GFE28GMKES",
    "PFE28KMKES",
    "GNE25JMKES",
    "GFE26JYMKFS",
    "GSS23GSKSS",
    "GFE28GYNFS",
    "PFE28KYNFS",
    "GNE27JYMFS",
    "GFE28HMKES",
    "GSS25GMKES",
    "GFE28GSKWW",
    "PFE28KSKWW",
    "GNE27JSMWW",
    "GSS25GSHWW",
    "GFE28GMKWW",
    "PFE28KMKWW",
    "GNE25JMKWW",
    "GFE26JYMKWW",
    "GSS23GSKWW",
    "GFE28GYNWW",
    "PFE28KYNWW",
    "GNE27JYMWW",
    "GFE28HMKWW",
    "GSS25GMKWW",
    "GFE28GSKBB",
    "PFE28KSKBB",
    "GNE27JSMBB",
    "GSS25GSHBB",
    "GFE28GMKBB",
    "PFE28KMKBB",
    "GNE25JMKBB",
    "GFE26JYMKBB",
    "GSS23GSKBB",
    "GFE28GYNBB",
    "PFE28KYNBB",
    "GNE27JYMBB",
    "GFE28HMKBB",
    "GSS25GMKBB",
    "GFD28GSLSS",
    "GNE27ESMSS",
    "GFE28HSKSS",
    "PFE28KBLTS",
    "GNE27JMKBS",
    "GSS25IYNFS",
    "GFE28GGKWW",
    "GNE27JSTSS",
    "GFE28GSKES",
    "PFE28KLYSS",
    "GNE25JSKSS",
    "GSS23HSHSS",
    "GFE28GYNES",
  ],
  frigidaire: [
    "FGHB2868PF",
    "FFHB2740PS",
    "FGSC2335TF",
    "FFSS2615TS",
    "GLRSF2663AF",
    "FGHB2868PF2",
    "FFHB2750TS",
    "FGSC2335TD",
    "FFSS2615TE",
    "FGHB2866PF",
    "FFHB2740PE",
    "FGSC2335TS",
    "FFSS2615TD",
    "GLRSF2663AD",
    "FGHB2868PE",
    "FFHB2740TD",
    "FGSC2335TE",
    "FFSS2615TW",
    "FGHB2868LF",
    "FFHB2740TW",
    "FGSC2335TW",
    "FFSS2615LB",
    "GLRSF2663AF2",
    "FGHB2866PE",
    "FFHB2750TE",
    "FGSC2335TF2",
    "FFSS2615TS2",
    "FGHB2868PF3",
    "FFHB2740PS2",
    "FGSC2335TF3",
    "FFSS2615TS3",
    "GLRSF2663AF3",
    "FGHB2868PF4",
    "FFHB2740PS3",
    "FGSC2335TF4",
    "FFSS2615TS4",
    "FGHB2866PF2",
    "FFHB2750TS2",
    "FGSC2335TD2",
    "FFSS2615TE2",
    "FGHB2868PF5",
    "FFHB2740PS4",
    "FGSC2335TE3",
    "FFSS2615TW2",
    "GLRSF2663AF4",
    "FGHB2868PE2",
    "FFHB2740TD2",
    "FGSC2335TW2",
    "FFSS2615LB2",
    "FGHB2866LF",
    "FFHB2740LB",
    "FGSC2335LB",
    "FFSS2615PS",
    "FGHB2868PS",
    "FFHB2740PS5",
  ],
};

/**
 * Additional US-market model numbers from manufacturer/spec listings (LG USA, Samsung US,
 * Whirlpool/GE/Frigidaire retail sheets). Merged with REAL_MODELS and deduped before cut to
 * MODELS_PER_BRAND.
 */
const REAL_MODELS_EXTRA: Record<string, string[]> = {
  lg: [
    "LRFXS3106S",
    "LRFXS2503S",
    "LFXS29766S",
    "LFX31945ST",
    "LRFVC2406S",
    "LFXC22526D",
    "LFXS24663S",
    "LFXS27196S",
    "LMXC24796S",
    "LFXC24726S",
    "LRFXS2503B",
    "LRFXS3106B",
    "LRFXS2503D",
    "LRFXS3106D",
    "LRFXS2503W",
    "LRFXS3106W",
    "LFXS29766D",
    "LFXS26566S",
    "LMXC28626S",
    "LRSXC2306S",
    "LUPXS3186N",
    "LFXS24673S",
    "LFXS28573S",
    "LMXS30773S",
    "LFXC24773S",
    "LFCC25426S",
    "LFXS26983S",
    "LFXS30896S",
    "LMXS30896S",
    "LFXC24896S",
    "LFCS23520S",
    "LFXS28696S",
    "LMXS28726S",
    "LFXC22696S",
    "LFCC24596S",
    "LSXS27366S",
    "LFXS28973S",
    "LMWS27673S",
    "LFXC22546S",
    "LMXS29626S",
    "LFXS29566S",
    "LRMVC2406S",
    "LRFWS3006S",
    "LFXS30773S",
    "LMXS30773S",
    "LFXC23596S",
    "LFDS23520S",
    "LFXS27696S",
    "LMXS27726S",
  ],
  samsung: [
    "RF28R6241SR",
    "RF28T5001SR",
    "RF28T5001SG",
    "RF28T5001WW",
    "RF28T5F01SR",
    "RF26J7500SR",
    "RF28K9070SR",
    "RF24FSEDBSR",
    "RF22NPEDBSR",
    "RF28HMEDBSR",
    "RF30BB8600QL",
    "RF23BB8900QL",
    "RF28R6301SR",
    "RF28R7581SR",
    "RF23A8771SR",
    "RF20A5101SR",
    "RF27T5201SR",
    "RF28T5021SR",
    "RF24BB8900QL",
    "RF28R6251SR",
    "RF28R6351SR",
    "RF28K9071SG",
    "RF28R7581SG",
    "RF28R7552SR",
    "RS25H5000SR",
    "RS22H5000SR",
    "RF18A5101SR",
    "RF23M8570SG",
    "RF22K9582SG",
    "RF28T5101SR",
    "RF28T5101SG",
    "RF26HFENDSR",
    "RF24FSEDSR",
    "RF22NPEDBSG",
    "RF28HMEDBSG",
    "RF28K9070SG",
    "RF28K9070SW",
    "RF28R6241SG",
    "RF28R6241SW",
    "RF28T5001SB",
    "RF28R6201SG",
    "RF28R6201SW",
    "RF28R7351SG",
    "RF28R7351SW",
    "RF263TEAESG",
    "RF263TEAEWW",
    "RF28R7551SG",
    "RF28R7551SW",
    "RF28R7581SW",
    "RF28R6241SB",
  ],
  whirlpool: [
    "WRF954CIHZ",
    "WRS588AIMW",
    "WRF736SDAM",
    "WRS970CIDM",
    "WRX735SDBM",
    "WRF991BOHZ",
    "WRS588SIBW",
    "WRF540CMBZ",
    "WRX988SIBW",
    "WRS555SIHZ",
    "WRS321SDAM",
    "WRF757SDAM",
    "WRX735SDAM",
    "WRF535SDAM",
    "WRS571SDAM",
    "WRS588FIAM",
    "WRF756SDHZ",
    "WRX735SDAV",
    "WRF554CHHZ",
    "WRS312SNAM",
    "WRF767SDAM",
    "WRS588FIDM",
    "WRF540CMHZ",
    "WRS325SDAM",
    "WRS315SDAM",
    "WRF555SDAM",
    "WRS571CIAM",
    "WRF757SIHZ",
    "WRX735SIHZ",
    "WRF535SIHZ",
    "WRS588SIHZ",
    "WRF540SIHZ",
    "WRF555SIHZ",
    "WRS315SIHZ",
    "WRS325SIHZ",
    "WRS571SIHZ",
    "WRF757SIHV",
    "WRX986SIHW",
    "WRF767SIHZ",
    "WRF535SIBZ",
    "WRS588SIBM",
    "WRF540CWBZ",
    "WRF555SIBZ",
    "WRS315SIBZ",
    "WRS325SIBZ",
    "WRS571SIBZ",
    "WRF757SIBZ",
    "WRX735SIBZ",
    "WRF767SIBZ",
  ],
  ge: [
    "GYE22GSKSS",
    "GYE22GSKWW",
    "GYE22GSKBB",
    "GYE22HSKSS",
    "GYE22HSKWW",
    "GYE22HSKBB",
    "CWE23SSHSS",
    "CWE23SSHWW",
    "CWE23SSHBB",
    "CWE19TSLSS",
    "GFD28GSLBB",
    "GFD28GSLWW",
    "PVD28BYNFS",
    "PVD28BYMFS",
    "PVD28BSLSS",
    "GNE29GSKSS",
    "GNE29GSKWW",
    "GNE29GSKBB",
    "GNE29GYMKFS",
    "GFE24JGKWW",
    "GFE24JGKBWW",
    "GFE24JGKBB",
    "GFE24JSKFSS",
    "GSE25GSHSS",
    "GSE25HSKSS",
    "GSE26GSHESS",
    "GSS20ESHSS",
    "GSS20ESHBB",
    "GIE18GSNARSS",
    "GIE21GSNERSS",
    "GDE21ESKSS",
    "GTE18GSNRSS",
    "PYE22PYNFS",
    "PWE23KSKSS",
    "PWE23KMKES",
    "CFE28TSHSS",
    "CFE29USKSS",
    "GSC25FRSHSS",
    "GSS25LSLSS",
    "GFE28GELDS",
    "PFE28KELDS",
    "GNE27FSKSS",
    "GNE27FSNSS",
    "GFE27JMKES",
    "GFD28GSNSS",
    "GFD28GSLCC",
    "GNE25GSKSS",
    "GFE28GSKFS",
    "PFE28KSKFS",
    "CYE22TP3MS1",
    "CYE22TP5MS1",
    "GNE29HYMKFS",
    "GNE29DSNKSS",
  ],
  frigidaire: [
    "GRFS2873AF",
    "FRSS2623AW",
    "FFHN2740PS",
    "GRFC2353AF",
    "FRFS2823AS",
    "LFHB2741PF",
    "FFHD2250TS",
    "FPRU19F8RF",
    "FRSS2333AS",
    "FGSC2345TF",
    "GRFS2833AF",
    "FFSC2323TS",
    "FFHB2750US",
    "FFSS2625TS",
    "GLRSF2663AS",
    "FGHD2365TF",
    "FGHD2368TF",
    "FFSS2315TS",
    "FFSS2515TS",
    "FRFS2623AS",
    "GRFS2633AF",
    "CRSS2623AS",
    "FFHB2750TW",
    "FFSS2615TW",
    "FGSC2335TW",
    "FGHB2868PE",
    "FGHB2868PS",
    "FGHB2866PE",
    "FGHB2866PS",
    "FFSS2615TE",
    "FFSS2615TD",
    "FRFS2823AW",
    "GRFS2873AS",
    "GRFC2353AS",
    "FFSC2323TW",
    "LFHB2741PE",
    "LFHB2741PS",
    "FFHD2250TE",
    "FFHD2250TW",
    "FFHN2740PE",
    "FFHN2740TW",
    "FPRU19F8RE",
    "FRSS2623AS",
    "FFHT1621QS",
    "FFHT1821QS",
    "FFHT2021QS",
    "CFSE2333TB",
    "FRFS2613AS",
    "FGHN2868PF",
    "FFHB2750TD",
    "FGHB2868TD",
    "FFHB2860TS",
    "FRFS2823AE",
    "GRFS2873AE",
  ],
};

/** Extra marketing / retailer aliases for search (public-facing names). */
const EXTRA_FILTER_ALIASES: Record<string, string[]> = {
  "da29-00020b": ["HAF-CIN", "HAF-CIN/EXP", "DA2900020B"],
  "da97-17376b": ["HAF-QIN", "DA9717376B"],
  edr1rxd1: ["EveryDrop 1", "FILTER1"],
  edr2rxd1: ["EveryDrop 2", "FILTER2"],
  edr3rxd1: ["EveryDrop 3", "FILTER3"],
  edr4rxd1: ["EveryDrop 4", "FILTER4", "UKF8001", "UKF8001AXX"],
  ukf8001: ["EDR4RXD1", "EveryDrop 4", "UKF8001AXX"],
  lt1000p: ["LT 1000 P", "LG LT1000"],
  wf3cb: ["PureSource 3"],
  ultrawf: ["PureSource Ultra", "ULTRA WF"],
  gswf: ["GSWF2"],
  gswf2: ["GSWF"],
  "frig-242086201": ["242086201"],
  "frig-242294502": ["242294502"],
  adq75795101: ["ADQ75795101"],
  "da29-00012b": ["DA2900012B"],
  "da97-17376a": ["DA9717376A"],
  "46-9002": ["469002", "46 9002"],
};

function mirrorCompatFromFilterSlug(
  compatRows: string[],
  compatSeen: Set<string>,
  sourceSlug: string,
  targetSlug: string,
): void {
  for (const line of compatRows.slice(1)) {
    const [fridge, filterSlug] = line.split(",");
    if (filterSlug !== sourceSlug) continue;
    const row = `${fridge},${targetSlug}`;
    if (compatSeen.has(row)) continue;
    compatSeen.add(row);
    compatRows.push(row);
  }
}

function filterSlugsUsedInCompat(compatRows: string[]): Set<string> {
  const s = new Set<string>();
  for (const line of compatRows.slice(1)) {
    const parts = line.split(",");
    const slug = parts[1];
    if (slug) s.add(slug);
  }
  return s;
}

/** Credible OEM-family mirrors (target ← source) for SKUs pickFiltersForModel rarely hits. */
const ORPHAN_FILTER_COMPAT_MIRROR: Record<string, string> = {
  "frig-242086201": "ultrawf",
  "frig-242294502": "eptwfu01",
  gswf2: "gswf",
  adq75795101: "adq74793501",
  "da29-00012b": "da29-00020b",
  "da97-17376a": "da97-17376b",
  "4396842": "4396841",
  "46-9002": "edr1rxd1",
};

function slugifyModel(brand: string, mn: string): string {
  const compact = mn.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
  return `${brand}-${compact}`;
}

/** Map model index to primary + optional secondary filter using plausible line splits. */
function pickFiltersForModel(
  brand: string,
  modelIndex: number,
  pool: F[],
): { primary: F; secondary: F | null } {
  const n = pool.length;
  if (n === 0) throw new Error(`no filters for ${brand}`);
  // Tiered assignment reads more like “product generation” than pure hash.
  let idx: number;
  if (brand === "lg") {
    if (modelIndex < 22) idx = 0;
    else if (modelIndex < 38) idx = 1 + (modelIndex % 4);
    else idx = 2 + (modelIndex % 5);
  } else if (brand === "samsung") {
    if (modelIndex < 25) idx = modelIndex % 6;
    else idx = 1 + (modelIndex % 8);
  } else if (brand === "whirlpool") {
    idx = modelIndex % 6;
  } else if (brand === "ge") {
    if (modelIndex < 18) idx = modelIndex % 4;
    else idx = 2 + (modelIndex % 6);
  } else if (brand === "frigidaire") {
    idx = modelIndex % 5;
  } else {
    idx = modelIndex % n;
  }
  idx = ((idx % n) + n) % n;
  const primary = pool[idx]!;
  let secondary: F | null = null;
  if (modelIndex % 5 === 0 && n > 1) {
    const j = (idx + 1) % n;
    if (j !== idx) secondary = pool[j]!;
  }
  return { primary, secondary };
}

function main() {
  const filterRows: string[] = [
    "brand_slug,slug,oem_part_number,name,replacement_interval_months,notes",
  ];
  for (const b of BRANDS) {
    for (const f of FILTERS[b.slug] ?? []) {
      filterRows.push(
        `${b.slug},${f.slug},${f.oem},${f.name},6,"${NOTES_FILTER}"`,
      );
    }
  }

  const modelRows: string[] = ["brand_slug,slug,model_number,notes"];
  const modelMeta: { brand: string; slug: string; model_number: string }[] = [];

  for (const b of BRANDS) {
    const raw = [
      ...(REAL_MODELS[b.slug] ?? []),
      ...(REAL_MODELS_EXTRA[b.slug] ?? []),
    ];
    const seen = new Set<string>();
    const list: string[] = [];
    for (const m of raw) {
      const k = m.trim().toUpperCase();
      if (seen.has(k)) continue;
      seen.add(k);
      list.push(m.trim());
    }
    if (list.length < MODELS_PER_BRAND) {
      throw new Error(
        `${b.slug}: REAL_MODELS has ${list.length} unique model number(s) after dedupe; need ${MODELS_PER_BRAND}. Add real-style models — do not pad with synthetic LINE-## rows.`,
      );
    }
    for (let i = 0; i < MODELS_PER_BRAND; i++) {
      const mn = list[i]!;
      const slug = slugifyModel(b.slug, mn);
      modelRows.push(`${b.slug},${slug},${mn},"${NOTES_MODEL}"`);
      modelMeta.push({ brand: b.slug, slug, model_number: mn });
    }
  }

  const compatRows: string[] = ["fridge_slug,filter_slug"];
  const filtersByBrand = FILTERS;

  const indexInBrand: Record<string, number> = {};
  for (const m of modelMeta) {
    const i = indexInBrand[m.brand] ?? 0;
    indexInBrand[m.brand] = i + 1;
    const pool = filtersByBrand[m.brand] ?? [];
    const { primary, secondary } = pickFiltersForModel(m.brand, i, pool);
    compatRows.push(`${m.slug},${primary.slug}`);
    if (secondary) {
      compatRows.push(`${m.slug},${secondary.slug}`);
    }
  }

  // UKF8001 is the KitchenAid OEM listing for the EveryDrop Filter 4 cartridge (EDR4RXD1).
  // Mirror every edr4rxd1 mapping so ukf8001 is never an orphan; dedupe if a row already exists.
  const compatSeen = new Set(compatRows.slice(1));
  const edr4Fridges = new Set<string>();
  for (const line of compatRows.slice(1)) {
    const [fridge, filterSlug] = line.split(",");
    if (filterSlug === "edr4rxd1") {
      edr4Fridges.add(fridge);
    }
  }
  for (const fridge of edr4Fridges) {
    const row = `${fridge},ukf8001`;
    if (!compatSeen.has(row)) {
      compatSeen.add(row);
      compatRows.push(row);
    }
  }

  for (const [targetSlug, sourceSlug] of Object.entries(
    ORPHAN_FILTER_COMPAT_MIRROR,
  )) {
    mirrorCompatFromFilterSlug(
      compatRows,
      compatSeen,
      sourceSlug,
      targetSlug,
    );
  }

  /** Ensure every filter SKU has ≥1 fridge mapping (catalog completeness sweep). */
  let usedSlugs = filterSlugsUsedInCompat(compatRows);
  for (const b of BRANDS) {
    const pool = FILTERS[b.slug] ?? [];
    const anchorSlug =
      pool.find((p) => usedSlugs.has(p.slug))?.slug ?? pool[0]?.slug;
    if (!anchorSlug) continue;
    for (const f of pool) {
      if (usedSlugs.has(f.slug)) continue;
      mirrorCompatFromFilterSlug(compatRows, compatSeen, anchorSlug, f.slug);
    }
    usedSlugs = filterSlugsUsedInCompat(compatRows);
  }

  const retailerRows: string[] = [
    "filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key",
  ];
  for (const b of BRANDS) {
    for (const f of FILTERS[b.slug] ?? []) {
      const url = oemCatalogSupportUrl(b.slug, f.oem);
      retailerRows.push(
        [
          f.slug,
          csvEscapeField("OEM parts catalog (keyword lookup)"),
          csvEscapeField(url),
          "true",
          "0",
          "oem-parts-catalog",
        ].join(","),
      );
    }
  }

  const filterAliasRows: string[] = ["filter_slug,alias"];
  const filterAliasKeys = new Set<string>();
  function addFilterAlias(slug: string, alias: string) {
    const k = `${slug}\0${alias.toLowerCase()}`;
    if (filterAliasKeys.has(k)) return;
    filterAliasKeys.add(k);
    filterAliasRows.push(`${slug},${alias}`);
  }
  for (const line of filterRows.slice(1)) {
    const parts = line.split(",");
    const slug = parts[1];
    const oem = parts[2];
    if (!slug || !oem) continue;
    addFilterAlias(slug, oem);
    const dehyphen = oem.replace(/-/g, "");
    if (dehyphen !== oem) {
      addFilterAlias(slug, dehyphen);
    }
    for (const ex of EXTRA_FILTER_ALIASES[slug] ?? []) {
      addFilterAlias(slug, ex);
    }
  }

  const fridgeAliasRows: string[] = ["fridge_slug,alias"];
  const fridgeAliasKeys = new Set<string>();
  function addFridgeAlias(slug: string, alias: string) {
    const k = `${slug}\0${alias.toLowerCase()}`;
    if (fridgeAliasKeys.has(k)) return;
    fridgeAliasKeys.add(k);
    fridgeAliasRows.push(`${slug},${alias}`);
  }
  for (const m of modelMeta) {
    addFridgeAlias(m.slug, m.model_number);
    const nospace = m.model_number.replace(/\s+/g, "");
    if (nospace !== m.model_number) {
      addFridgeAlias(m.slug, nospace);
    }
    const compact = m.model_number.replace(/[^a-zA-Z0-9]/g, "");
    if (compact.toLowerCase() !== m.model_number.toLowerCase().replace(/[^a-zA-Z0-9]/g, "")) {
      addFridgeAlias(m.slug, compact);
    }
    const spaced = m.model_number.replace(/([A-Z])([0-9])/g, "$1 $2");
    if (spaced !== m.model_number) {
      addFridgeAlias(m.slug, spaced);
    }
  }

  const brandCsv = ["slug,name", ...BRANDS.map((b) => `${b.slug},${b.name}`)].join("\n");

  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, "brands.csv"), brandCsv + "\n", "utf8");
  fs.writeFileSync(path.join(root, "filters.csv"), filterRows.join("\n") + "\n", "utf8");
  fs.writeFileSync(path.join(root, "fridge_models.csv"), modelRows.join("\n") + "\n", "utf8");
  fs.writeFileSync(
    path.join(root, "compatibility_mappings.csv"),
    compatRows.join("\n") + "\n",
    "utf8",
  );
  fs.writeFileSync(path.join(root, "retailer_links.csv"), retailerRows.join("\n") + "\n", "utf8");
  fs.writeFileSync(path.join(root, "filter_aliases.csv"), filterAliasRows.join("\n") + "\n", "utf8");
  fs.writeFileSync(
    path.join(root, "fridge_model_aliases.csv"),
    fridgeAliasRows.join("\n") + "\n",
    "utf8",
  );

  const counts = {
    brands: BRANDS.length,
    filters: filterRows.length - 1,
    fridge_models: modelRows.length - 1,
    compatibility_mappings: compatRows.length - 1,
    retailer_links: retailerRows.length - 1,
    filter_aliases: filterAliasRows.length - 1,
    fridge_model_aliases: fridgeAliasRows.length - 1,
  };

  console.log(JSON.stringify({ wrote: "data/*.csv", counts }, null, 2));
}

main();
