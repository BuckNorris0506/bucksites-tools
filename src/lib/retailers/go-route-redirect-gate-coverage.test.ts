import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const APP_ROOT = path.join(process.cwd(), "src", "app");

/** Canonical BuckParts affiliate go handlers: `src/app/.../go/[linkId]/route.ts` */
const GO_ROUTE_REL_RE = /\/go\/\[linkId\]\/route\.ts$/;

const HANDLER_IMPORT_RE =
  /from\s+["']@\/lib\/retailers\/go-affiliate-route-handler["']\s*;/;

const REDIRECT_TARGET_DRIFT_RE = /NextResponse\.redirect\(\s*(target|row\.affiliate_url)\s*,/;

/**
 * Wedge `/go` must load rows from that wedge's retailer source only — wrong import
 * silently sends users to another vertical's links and poisons click_events attribution.
 */
const WEDGE_GO_RETAILER_LOADER: Record<
  string,
  { importFrom: string; importName: string }
> = {
  fridge: {
    importFrom: "@/lib/data/retailers",
    importName: "getRetailerLinkById",
  },
  "air-purifier": {
    importFrom: "@/lib/data/air-purifier/retailers",
    importName: "getAirPurifierRetailerLinkById",
  },
  "whole-house-water": {
    importFrom: "@/lib/data/whole-house-water/retailers",
    importName: "getWholeHouseWaterRetailerLinkById",
  },
  humidifier: {
    importFrom: "@/lib/data/humidifier/retailers",
    importName: "getHumidifierRetailerLinkById",
  },
  vacuum: {
    importFrom: "@/lib/data/vacuum/retailers",
    importName: "getVacuumRetailerLinkById",
  },
  "appliance-air": {
    importFrom: "@/lib/data/appliance-air/retailers",
    importName: "getApplianceAirRetailerLinkById",
  },
};

function reEscape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wedgeKeyFromGoRouteRel(rel: string): string {
  const norm = rel.replace(/\\/g, "/");
  if (norm === "src/app/go/[linkId]/route.ts") return "fridge";
  const m = norm.match(/^src\/app\/([^/]+)\/go\/\[linkId\]\/route\.ts$/);
  if (!m) {
    throw new Error(`unrecognized go route rel: ${rel}`);
  }
  return m[1];
}

function* walkFiles(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) yield* walkFiles(full);
    else if (st.isFile()) yield full;
  }
}

function listGoAffiliateRouteFiles(): string[] {
  const out: string[] = [];
  for (const f of walkFiles(APP_ROOT)) {
    const rel = f.replace(/\\/g, "/");
    if (GO_ROUTE_REL_RE.test(rel)) out.push(f);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

describe("go/[linkId] routes use shared affiliate handler", () => {
  it("discovers at least one go route under src/app", () => {
    const routes = listGoAffiliateRouteFiles();
    assert.ok(
      routes.length > 0,
      `expected go/[linkId]/route.ts under ${APP_ROOT}`,
    );
  });

  for (const abs of listGoAffiliateRouteFiles()) {
    const rel = path.relative(process.cwd(), abs).replace(/\\/g, "/");
    it(`${rel} follows standard /go affiliate pattern`, () => {
      const src = fs.readFileSync(abs, "utf8");
      assert.match(
        src,
        HANDLER_IMPORT_RE,
        `must import from @/lib/retailers/go-affiliate-route-handler (shared UUID, fallback, gate re-export, click logging)`,
      );
      assert.ok(
        src.includes("GO_LINK_UUID_RE"),
        `must use shared GO_LINK_UUID_RE for link id validation`,
      );
      assert.ok(
        src.includes("goFallbackRedirect("),
        `must use goFallbackRedirect(request, wedgePath) for invalid-id / missing-row cases`,
      );
      assert.ok(
        src.includes("nextResponseRedirectAffiliateIfSafe("),
        `must call nextResponseRedirectAffiliateIfSafe for the retailer hop`,
      );
      assert.ok(
        src.includes("logClickEventForGoRoute("),
        `must log click_events only via logClickEventForGoRoute (canonical target_url inside handler)`,
      );
      assert.ok(
        !src.includes("isAffiliateUrlSafeForGoRedirect"),
        `use nextResponseRedirectAffiliateIfSafe only — do not split gate check from redirect construction`,
      );
      assert.ok(
        !REDIRECT_TARGET_DRIFT_RE.test(src),
        `do not NextResponse.redirect(target|row.affiliate_url) for outbound retailer — return go.response`,
      );
      assert.ok(
        /\.response\b/.test(src),
        `must return go.response for successful outbound redirect`,
      );
      assert.ok(
        !/from\(\s*["']click_events["']\s*\)/.test(src),
        `do not insert click_events from route files — use logClickEventForGoRoute`,
      );
      assert.ok(
        !src.includes("function isSafeRedirectUrl"),
        `do not duplicate local isSafeRedirectUrl`,
      );

      const wedge = wedgeKeyFromGoRouteRel(rel);
      const loader = WEDGE_GO_RETAILER_LOADER[wedge];
      assert.ok(
        loader,
        `add WEDGE_GO_RETAILER_LOADER["${wedge}"] for this /go route family`,
      );
      assert.match(
        src,
        new RegExp(`from\\s+["']${reEscape(loader.importFrom)}["']`),
        `must import retailer rows from ${loader.importFrom} (wedge ${wedge})`,
      );
      assert.match(
        src,
        new RegExp(`\\b${reEscape(loader.importName)}\\s*\\(`),
        `must call ${loader.importName}(…) for this wedge's /go row lookup`,
      );
      for (const [otherWedge, other] of Object.entries(WEDGE_GO_RETAILER_LOADER)) {
        if (otherWedge === wedge) continue;
        assert.ok(
          !src.includes(other.importFrom),
          `must not import another wedge's retailer module (${other.importFrom}); route is ${wedge}`,
        );
      }
    });
  }
});
