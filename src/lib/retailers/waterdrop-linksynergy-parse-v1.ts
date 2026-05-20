/**
 * Read-only parse helpers for Waterdrop / Rakuten LinkSynergy affiliate anchors.
 * No mutation authority; does not validate browser-truth or insert eligibility.
 */

export type ParsedLinkSynergyUrlV1 = {
  affiliate_url: string;
  destination_pdp_url: string | null;
  linksynergy_id: string | null;
  offerid: string | null;
  link_type: string | null;
  is_image_pixel: boolean;
};

export type ParsedWaterdropAnchorV1 = {
  affiliate_url: string;
  destination_pdp_url: string | null;
  visible_title: string | null;
  image_url: string | null;
  image_alt: string | null;
  inferred_token_candidates: string[];
  parse_notes: string[];
};

/** Tracking / impression pixels — never buyer redirect targets. */
export function isLinkSynergyImagePixelUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase();
    if (!host.includes("linksynergy.com")) return false;
    return u.pathname.toLowerCase().includes("/fs-bin/show");
  } catch {
    return false;
  }
}

export function isLinkSynergyClickUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase();
    if (!host.includes("linksynergy.com")) return false;
    if (isLinkSynergyImagePixelUrl(url)) return false;
    return u.pathname.toLowerCase().includes("/link");
  } catch {
    return false;
  }
}

function decodeMurlParam(raw: string | null): string | null {
  if (!raw || raw.trim() === "") return null;
  try {
    return decodeURIComponent(raw.trim());
  } catch {
    return raw.trim();
  }
}

/** Parse Rakuten LinkSynergy click URL (`click.linksynergy.com/link?...&murl=`). */
export function parseLinkSynergyAffiliateUrl(url: string): ParsedLinkSynergyUrlV1 | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (isLinkSynergyImagePixelUrl(trimmed)) {
    return {
      affiliate_url: trimmed,
      destination_pdp_url: null,
      linksynergy_id: null,
      offerid: null,
      link_type: null,
      is_image_pixel: true,
    };
  }
  try {
    const u = new URL(trimmed);
    const murl =
      decodeMurlParam(u.searchParams.get("murl")) ??
      decodeMurlParam(
        Array.from(u.searchParams.entries()).find(([k]) => k.toLowerCase() === "murl")?.[1] ?? null,
      );
    return {
      affiliate_url: trimmed,
      destination_pdp_url: murl,
      linksynergy_id: u.searchParams.get("id"),
      offerid: u.searchParams.get("offerid"),
      link_type: u.searchParams.get("type"),
      is_image_pixel: false,
    };
  } catch {
    return null;
  }
}

/** Compact alphanumeric key for alias matching (DA29-00020B → DA2900020B). */
export function compactPartTokenKey(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

const PATH_TOKEN_RE =
  /\b(da29-\d{5}[a-z]|da97-\d{5}[a-z]|adq\d{8}|lt\d{4}p[a-z]?|edr\drxd\d|wf\d[a-z]{0,3}|ukf\d{4,5}|mwf|mswf|rpwfe|xwfe|xwf|gswf2?|ultrawf|eptwfu01|fppwfu01|wfcb|wf2cb|wf3cb|\d{6,10}[a-z]?)\b/gi;

/** Infer OEM-style tokens from Waterdrop PDP URL path, title, and visible text. */
export function inferTokenCandidatesFromWaterdropText(args: {
  destination_pdp_url?: string | null;
  visible_title?: string | null;
  extra_text?: string | null;
}): string[] {
  const blob = [args.destination_pdp_url, args.visible_title, args.extra_text]
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .join(" ");
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (raw: string) => {
    const t = raw.trim().toUpperCase();
    if (t.length < 5 || /[-/]$/.test(t)) return;
    const key = compactPartTokenKey(t);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };

  const pathRe = new RegExp(PATH_TOKEN_RE.source, PATH_TOKEN_RE.flags);
  let pathMatch: RegExpExecArray | null;
  while ((pathMatch = pathRe.exec(blob)) !== null) {
    add(pathMatch[1]!);
  }
  const genericRe = /\b([A-Z]{2,5}\d{2,}[A-Z0-9-]{0,6})\b/g;
  let genericMatch: RegExpExecArray | null;
  while ((genericMatch = genericRe.exec(blob)) !== null) {
    add(genericMatch[1]!);
  }
  return out;
}

function extractAnchorsFromHtml(html: string): Array<{
  href: string;
  inner: string;
  imgSrc: string | null;
  imgAlt: string | null;
}> {
  const anchors: Array<{ href: string; inner: string; imgSrc: string | null; imgAlt: string | null }> =
    [];
  const re = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const inner = m[2] ?? "";
    const img = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*(?:\balt=["']([^"']*)["'])?/i.exec(inner);
    anchors.push({
      href: decodeHtmlEntitiesInUrl(m[1]!.trim()),
      inner,
      imgSrc: img?.[1]?.trim() ?? null,
      imgAlt: img?.[2]?.trim() ?? null,
    });
  }
  return anchors;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeHtmlEntitiesInUrl(url: string): string {
  return url.replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;/g, "'");
}

/** Parse operator HTML snippet or paste: LinkSynergy anchors + bare URLs in text. */
export function parseWaterdropHtmlSnippet(html: string): ParsedWaterdropAnchorV1[] {
  const out: ParsedWaterdropAnchorV1[] = [];
  const seenAffiliate = new Set<string>();

  const pushUrl = (rawUrl: string, visibleTitle: string | null, imageUrl: string | null, imageAlt: string | null) => {
    const url = rawUrl.trim();
    if (!url) return;
    if (!isLinkSynergyClickUrl(url) && !url.includes("waterdropfilter.com")) return;

    let affiliate_url = url;
    let destination: string | null = null;
    const notes: string[] = [];

    if (isLinkSynergyClickUrl(url)) {
      const parsed = parseLinkSynergyAffiliateUrl(url);
      if (!parsed || parsed.is_image_pixel) return;
      affiliate_url = parsed.affiliate_url;
      destination = parsed.destination_pdp_url;
    } else if (url.includes("waterdropfilter.com")) {
      destination = url;
      notes.push("direct_waterdrop_pdp_only_needs_linksynergy_affiliate_url");
    }

    const key = affiliate_url.toLowerCase();
    if (seenAffiliate.has(key)) return;
    seenAffiliate.add(key);

    out.push({
      affiliate_url,
      destination_pdp_url: destination,
      visible_title: visibleTitle,
      image_url: imageUrl,
      image_alt: imageAlt,
      inferred_token_candidates: inferTokenCandidatesFromWaterdropText({
        destination_pdp_url: destination,
        visible_title: visibleTitle,
      }),
      parse_notes: notes,
    });
  };

  for (const a of extractAnchorsFromHtml(html)) {
    if (isLinkSynergyClickUrl(a.href)) {
      pushUrl(a.href, stripTags(a.inner) || null, a.imgSrc, a.imgAlt);
      continue;
    }
    const innerUrls = a.inner.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
    for (const u of innerUrls) {
      if (isLinkSynergyClickUrl(u)) {
        pushUrl(decodeHtmlEntitiesInUrl(u), stripTags(a.inner) || null, a.imgSrc, a.imgAlt);
      }
    }
  }

  const bareLinkSynergy = html.match(/https?:\/\/click\.linksynergy\.com\/[^\s"'<>]+/gi) ?? [];
  for (const u of bareLinkSynergy) {
    pushUrl(decodeHtmlEntitiesInUrl(u), null, null, null);
  }

  return out;
}
