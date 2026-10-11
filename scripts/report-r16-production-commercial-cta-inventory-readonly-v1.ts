/**
 * Read-only production commercial CTA census (HTML/RSC): counts exposed `/go/*` and
 * `/air-purifier/go/*` links on sitemap URLs. Does not GET `/go` endpoints.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";

const SITE = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://buckparts.com";
const OUT = path.join(
  process.cwd(),
  "data/ops/site-integrity/production-integrity-baseline-2026-10-10/r16-production-cta-inventory-2026-10-11.json",
);

/** Match customer-facing commercial `/go` paths in SSR HTML and RSC payload (query strings allowed). */
const GO_PATH_IN_HTML_RE = /(?:^|["'(\s])((?:\/(?:air-purifier|whole-house-water|vacuum|humidifier|appliance-air))?\/go\/[0-9a-f-]{36})/gi;

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": "BuckPartsR16Inventory/1.0 read-only-html" },
  });
  if (!res.ok) throw new Error(`fetch_failed: ${url} status=${res.status}`);
  return res.text();
}

function extractGoPathOccurrences(html: string): string[] {
  const paths: string[] = [];
  GO_PATH_IN_HTML_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = GO_PATH_IN_HTML_RE.exec(html)) !== null) {
    const raw = m[1]!;
    const pathOnly = raw.split("?")[0]!;
    paths.push(pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`);
  }
  return paths;
}

function uuidFromGoPath(goPath: string): string {
  const parts = goPath.split("/");
  return parts[parts.length - 1] ?? goPath;
}

async function main(): Promise<void> {
  const sitemapXml = await fetchText(`${SITE}/sitemap.xml`);
  const locs = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
  const candidatePages = locs.filter((u) => {
    const path = new URL(u).pathname;
    if (path === "/" || path === "/catalog" || path === "/search") return false;
    if (path.startsWith("/help") || path.startsWith("/about")) return false;
    if (path.startsWith("/privacy") || path.startsWith("/terms")) return false;
    return true;
  });

  type Occurrence = {
    page_url: string;
    go_path: string;
    redirect_uuid: string;
  };

  const occurrences: Occurrence[] = [];
  const concurrency = 8;
  for (let i = 0; i < candidatePages.length; i += concurrency) {
    const batch = candidatePages.slice(i, i + concurrency);
    const htmls = await Promise.all(
      batch.map(async (pageUrl) => {
        try {
          return { pageUrl, html: await fetchText(pageUrl) };
        } catch (e) {
          return { pageUrl, html: "", error: String(e) };
        }
      }),
    );
    for (const row of htmls) {
      if (!row.html) continue;
      for (const goPath of extractGoPathOccurrences(row.html)) {
        occurrences.push({
          page_url: row.pageUrl,
          go_path: goPath,
          redirect_uuid: uuidFromGoPath(goPath),
        });
      }
    }
  }

  const pagesWithCta = new Set(occurrences.map((o) => o.page_url));
  const redirectIds = new Set(occurrences.map((o) => o.redirect_uuid));

  const report = {
    contract: "r16_production_commercial_cta_inventory_v1",
    read_only: true,
    generated_at: new Date().toISOString(),
    site_url: SITE,
    sitemap_url_count: locs.length,
    candidate_page_count: candidatePages.length,
    cta_occurrence_count: occurrences.length,
    distinct_page_count: pagesWithCta.size,
    distinct_redirect_id_count: redirectIds.size,
    distinct_redirect_ids: [...redirectIds].sort(),
    occurrences: occurrences.sort((a, b) =>
      a.page_url.localeCompare(b.page_url) || a.go_path.localeCompare(b.go_path),
    ),
    baseline_comparison_note:
      "Compare counts to data/ops/site-integrity/production-integrity-baseline-2026-10-10/r16-baseline-root-v1.json baseline_scope_counts; differences are reported, not forced.",
  };

  writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    cta_occurrence_count: report.cta_occurrence_count,
    distinct_page_count: report.distinct_page_count,
    distinct_redirect_id_count: report.distinct_redirect_id_count,
    out: OUT,
  }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
