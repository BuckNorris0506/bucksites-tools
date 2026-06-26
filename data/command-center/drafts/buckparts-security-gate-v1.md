# BuckParts Security Gate v1

- generated_at: **2026-06-26T17:17:08.904Z**
- overall_status: **WARN**
- deploy_readiness: **SAFE**
- safe_to_commit_verdict: **SAFE_TO_COMMIT**
- check_count: **16**

## Category rollups

- **secret_exposure**: pass=3 warn=0 fail=0 unknown=0
- **env_leakage**: pass=1 warn=0 fail=0 unknown=0
- **client_bundle**: pass=1 warn=0 fail=0 unknown=0
- **http_headers**: pass=0 warn=1 fail=0 unknown=0
- **rate_limiting**: pass=0 warn=1 fail=0 unknown=0
- **public_api**: pass=1 warn=1 fail=0 unknown=0
- **owner_dashboard**: pass=1 warn=0 fail=0 unknown=0
- **mcp_boundaries**: pass=2 warn=0 fail=0 unknown=0
- **dependencies**: pass=0 warn=0 fail=1 unknown=0
- **deploy_safety**: pass=2 warn=1 fail=0 unknown=0

## Blockers

- npm_audit_critical_high:npm audit reports critical=0, high=6.

## Warnings

- security_headers_repo_config:No security headers configuration found in next.config.mjs, netlify.toml, or middleware.
- public_api_rate_limit:/api/search has no application-level rate limit (observation only).
- api_error_leakage:Search API may return internal error messages in JSON 500 responses.
- security_gate_in_build_chain:Security gate not yet wired into Netlify build/CI enforce chain (expected for slice 1).

## Checks

### secret_in_tracked_files
- status: **PASS**
- category: secret_exposure
- severity: critical
- notes: No high-signal secret patterns in tracked text files (tests/docs/binary paths excluded).

### secret_in_committed_env_files
- status: **PASS**
- category: secret_exposure
- severity: critical
- notes: No .env / .env.local / .env.production files are git-tracked.

### secret_in_data_artifacts
- status: **PASS**
- category: secret_exposure
- severity: high
- notes: No high-signal secret patterns in data/**/*.json artifacts.

### dangerous_env_in_next_config
- status: **PASS**
- category: env_leakage
- severity: critical
- notes: next.config.mjs does not map non-NEXT_PUBLIC server secrets into client env.

### next_public_surface_audit
- status: **PASS**
- category: client_bundle
- severity: medium
- notes: All 5 NEXT_PUBLIC_* reference(s) in src/ match allowlist.

### security_headers_repo_config
- status: **WARN**
- category: http_headers
- severity: medium
- notes: No security headers configuration found in next.config.mjs, netlify.toml, or middleware.

### public_api_rate_limit
- status: **WARN**
- category: rate_limiting
- severity: medium
- notes: /api/search has no application-level rate limit (observation only).

### api_route_inventory
- status: **PASS**
- category: public_api
- severity: low
- notes: 7 Next.js route handler(s) inventoried under src/app.

### api_error_leakage
- status: **WARN**
- category: public_api
- severity: low
- notes: Search API may return internal error messages in JSON 500 responses.

### owner_dashboard_secret_gate
- status: **PASS**
- category: owner_dashboard
- severity: high
- notes: Owner dashboard uses secret env gate with constant-time compare and notFound() on mismatch.

### mcp_read_only_annotations
- status: **PASS**
- category: mcp_boundaries
- severity: high
- notes: 25 MCP tool registration(s) use read-only annotations.

### mcp_mutation_tool_present
- status: **PASS**
- category: mcp_boundaries
- severity: critical
- notes: No MCP mutation tools detected in buckparts-truth server.

### npm_audit_critical_high
- status: **FAIL**
- category: dependencies
- severity: high
- notes: npm audit reports critical=0, high=6.

### netlify_build_enforce_chain
- status: **PASS**
- category: deploy_safety
- severity: high
- notes: Netlify build runs repo-runtime-convergence:check --enforce before npm run build.

### ship_guard_available
- status: **PASS**
- category: deploy_safety
- severity: low
- notes: Ship guard CLI available (npm run buckparts:ship-guard).

### security_gate_in_build_chain
- status: **WARN**
- category: deploy_safety
- severity: low
- notes: Security gate not yet wired into Netlify build/CI enforce chain (expected for slice 1).

## Recommended next action

Review WARN findings (headers, rate limits, API error leakage); hardening slices are separate from this gate.

