import path from "node:path";

/** Repo path to the private owner dashboard page (Next app route). */
export const OWNER_DASHBOARD_TOP_OF_GAME_PAGE_RELATIVE_V1 = "src/app/ownerdashboard/[secret]/page.tsx" as const;

const HEADLINE_MARKER = "Top-of-Game Foundation";
const SCORECARD_CONTRACT_MARKER = "top_of_game_foundation_scorecard_v1";
/** Proves a dedicated section component is present, not only the substring in prose. */
const SECTION_COMPONENT_MARKER = "TopOfGameFoundationSection";

export type OwnerDashboardTopOfGamePanelProofRuntimeV1 = "OK" | "UNKNOWN_INPUT" | "MISSING_FILE" | "IO_ERROR";

/**
 * Read-only proof that the owner dashboard source references the foundation scorecard panel.
 * Does not execute the dashboard — file existence + substring checks only.
 */
export type OwnerDashboardTopOfGamePanelProofV1 = {
  contract: "owner_dashboard_top_of_game_panel_proof_v1";
  runtime_status: OwnerDashboardTopOfGamePanelProofRuntimeV1;
  dashboard_page_relative_path: string;
  file_exists: boolean;
  content_readable: boolean;
  has_headline_marker: boolean;
  has_scorecard_contract_marker: boolean;
  has_section_component_marker: boolean;
  /** True only when file exists, reads OK, and all three markers are present. */
  all_markers_present: boolean;
  proven_facts: string[];
  unknown_facts: string[];
  read_only: true;
  data_mutation: false;
};

export function evaluateOwnerDashboardTopOfGamePanelProofV1(input: {
  rootDir: string;
  fileExists: (absolutePath: string) => boolean;
  readTextFile: (absolutePath: string) => string;
}): OwnerDashboardTopOfGamePanelProofV1 {
  const rel = OWNER_DASHBOARD_TOP_OF_GAME_PAGE_RELATIVE_V1;
  const proven_facts: string[] = [
    "owner_dashboard_top_of_game_panel_proof_v1 is read-only — no Supabase or retailer_links writes.",
  ];
  const unknown_facts: string[] = [];

  if (!input.rootDir || input.rootDir.trim() === "") {
    return {
      contract: "owner_dashboard_top_of_game_panel_proof_v1",
      runtime_status: "UNKNOWN_INPUT",
      dashboard_page_relative_path: rel,
      file_exists: false,
      content_readable: false,
      has_headline_marker: false,
      has_scorecard_contract_marker: false,
      has_section_component_marker: false,
      all_markers_present: false,
      proven_facts,
      unknown_facts: ["rootDir was empty — cannot resolve owner dashboard page path."],
      read_only: true,
      data_mutation: false,
    };
  }

  const abs = path.join(input.rootDir, ...rel.split("/"));

  if (!input.fileExists(abs)) {
    unknown_facts.push(`Owner dashboard page not found at ${rel} under repo root (fileExists).`);
    return {
      contract: "owner_dashboard_top_of_game_panel_proof_v1",
      runtime_status: "MISSING_FILE",
      dashboard_page_relative_path: rel,
      file_exists: false,
      content_readable: false,
      has_headline_marker: false,
      has_scorecard_contract_marker: false,
      has_section_component_marker: false,
      all_markers_present: false,
      proven_facts,
      unknown_facts,
      read_only: true,
      data_mutation: false,
    };
  }

  let text = "";
  try {
    text = input.readTextFile(abs);
  } catch (e) {
    unknown_facts.push(
      `readTextFile failed for ${rel}: ${e instanceof Error ? e.message : String(e)}`,
    );
    return {
      contract: "owner_dashboard_top_of_game_panel_proof_v1",
      runtime_status: "IO_ERROR",
      dashboard_page_relative_path: rel,
      file_exists: true,
      content_readable: false,
      has_headline_marker: false,
      has_scorecard_contract_marker: false,
      has_section_component_marker: false,
      all_markers_present: false,
      proven_facts,
      unknown_facts,
      read_only: true,
      data_mutation: false,
    };
  }

  const has_headline_marker = text.includes(HEADLINE_MARKER);
  const has_scorecard_contract_marker = text.includes(SCORECARD_CONTRACT_MARKER);
  const has_section_component_marker = text.includes(SECTION_COMPONENT_MARKER);
  const all_markers_present =
    has_headline_marker && has_scorecard_contract_marker && has_section_component_marker;

  if (!has_headline_marker) unknown_facts.push(`Dashboard source missing literal "${HEADLINE_MARKER}".`);
  if (!has_scorecard_contract_marker) {
    unknown_facts.push(`Dashboard source missing literal "${SCORECARD_CONTRACT_MARKER}".`);
  }
  if (!has_section_component_marker) {
    unknown_facts.push(`Dashboard source missing "${SECTION_COMPONENT_MARKER}" (section wiring).`);
  }

  if (all_markers_present) {
    proven_facts.push(
      `Scanned ${rel}: found headline, scorecard contract substring, and ${SECTION_COMPONENT_MARKER} — owner dashboard Top-of-Game panel wiring is repo-proven for Command Center scorecard readiness.`,
    );
  }

  return {
    contract: "owner_dashboard_top_of_game_panel_proof_v1",
    runtime_status: "OK",
    dashboard_page_relative_path: rel,
    file_exists: true,
    content_readable: true,
    has_headline_marker,
    has_scorecard_contract_marker,
    has_section_component_marker,
    all_markers_present,
    proven_facts,
    unknown_facts,
    read_only: true,
    data_mutation: false,
  };
}
