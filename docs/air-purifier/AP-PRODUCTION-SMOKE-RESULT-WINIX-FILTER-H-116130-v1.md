# AP production smoke result — Winix Filter H `116130` v1

## `winix-filter-h-116130`

**Report type:** Production smoke record (docs-only + read-only HTTP GET)  
**Recorded:** 2026-06-12  
**Repo checkpoint:** `a6771ac`  
**Scope:** one slug only — **not** `winix-carbon-116131` demotion/repair  
**Prior slug-status (pre-smoke):** `next_unresolved_stage_id = production_smoke_complete`

**Deploy note:** Deploy for `d58afca` was **cancelled**. `deployed_commit` remains **UNKNOWN** unless a repo tool proves it. Live public exposure in this packet is **PROVEN** by read-only HTTP GET to `buckparts.com`, not by deployed-commit inference.

**This docs step:** Records read-only live smoke only. **Does not** authorize deploy, Supabase mutation, CSV mutation, or owner-decision writes. **No deploy was performed.**

---

## 1. Commands / probes used

### Slug status (before smoke doc)

```bash
npm run buckparts:ap:slug-status -- --slug winix-filter-h-116130
```

**Result (pre-smoke):**

| Field | Value |
|-------|-------|
| `next_unresolved_stage_id` | `production_smoke_complete` |
| `production_smoke_complete.status` | `unknown` |
| `production_smoke_result_path` | `null` |

### Filter page probe

```bash
curl -sS -o /tmp/winix-filter-page.html \
  -w "HTTP_STATUS:%{http_code}\nREDIRECT_URL:%{url_effective}\n" \
  -L "https://buckparts.com/air-purifier/filter/winix-filter-h-116130"
```

**Output:**

```
HTTP_STATUS:200
REDIRECT_URL:https://buckparts.com/air-purifier/filter/winix-filter-h-116130
```

### Go-link redirect probe (first `/air-purifier/go/<uuid>` on filter page)

**Discovered go link:** `/air-purifier/go/39d70dd1-e6e6-4da2-a1ac-6a0e78923b96`

```bash
curl -sS -o /dev/null -w "HTTP_STATUS:%{http_code}\nLOCATION:%{redirect_url}\n" \
  -I "https://buckparts.com/air-purifier/go/39d70dd1-e6e6-4da2-a1ac-6a0e78923b96"
```

**Output:**

```
HTTP_STATUS:302
LOCATION:https://www.winixamerica.com/product/filter-h-116130/
```

**Response headers (excerpt, probe time `Fri, 12 Jun 2026 20:55:45 GMT`):**

```
HTTP/2 302
location: https://www.winixamerica.com/product/filter-h-116130/
server: Netlify
```

---

## 2. Required smoke checks

| # | Check | Result | Label |
|---|-------|--------|-------|
| 1 | Filter route HTTP 200 | `200` on `https://buckparts.com/air-purifier/filter/winix-filter-h-116130` | **PROVEN** pass |
| 2 | Page contains Winix Filter H (116130) | Visible title/H1 area includes `Winix Filter H (116130)` | **PROVEN** pass |
| 3 | Page contains `116130` or `WINIX-116130` | `<title>WINIX-116130 air purifier filter · BuckParts</title>`; H1 `WINIX-116130` | **PROVEN** pass |
| 4 | BuckParts Verified Links visible | Section label `BuckParts Verified Links` present | **PROVEN** pass |
| 5 | Safe CTA visible | Meta/copy references safe buying paths; verified-link CTA present on page | **PROVEN** pass |
| 6 | Go-link returns 302 to Winix PDP | `302` → `https://www.winixamerica.com/product/filter-h-116130/` | **PROVEN** pass |
| 7 | No `/go-unavailable` | No `/go-unavailable` href on filter page | **PROVEN** pass |
| 8 | No wrong-family warning/gate | No wrong-family gate copy; only nav link to `/wrong-part-prevention` policy page | **PROVEN** pass |
| 9 | `winix-5500-2` compatibility visible | Compatibility link to `/air-purifier/model/winix-5500-2` with `5500-2` label | **PROVEN** pass |

---

## 3. Interpretation

1. **Live public exposure is PROVEN** for `winix-filter-h-116130` via read-only HTTP GET against production `buckparts.com` URLs.
2. **`deployed_commit` remains UNKNOWN** — this packet does not infer which git commit Netlify is serving.
3. **Deploy for `d58afca` was cancelled** — prior repo docs treated live runtime as unknown; this smoke closes that gap for this slug only.
4. **`production_smoke_complete` is PROVEN pass** for `winix-filter-h-116130` based on committed smoke result doc + live probe evidence above.
5. **No deploy, Supabase mutation, CSV mutation, or owner-decision rows** were performed in this step.

---

## 4. Slug-status expectation (post-smoke)

Re-run:

```bash
npm run buckparts:ap:slug-status -- --slug winix-filter-h-116130
```

**Expected:**

| Field | Value |
|-------|-------|
| `production_smoke_complete.status` | `complete` |
| `production_smoke_complete.proof_kind` | `repo_artifact` |
| `next_unresolved_stage_id` | `null` |
| `artifact_paths.production_smoke_result_path` | this doc |

---

## 5. Boundaries

- Does **not** prove smoke for any slug other than `winix-filter-h-116130`.
- Does **not** modify `winix-carbon-116131` mappings or artifacts.
- Does **not** replace Supabase parity docs — Supabase truth remains in `AP-SUPABASE-SQL-COMMIT-RESULT-WINIX-FILTER-H-116130-v1.md`.
- Does **not** authorize further mutation without a separate owner packet.
