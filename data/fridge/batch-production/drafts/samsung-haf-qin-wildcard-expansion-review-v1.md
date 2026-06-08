# Samsung HAF-QIN wildcard expansion review v1

Generated: 2026-06-08T00:56:58.558Z

## Stop condition

Read-only classification only. Does **not** authorize catalog mutation, compatibility mutation, Supabase writes, or Page Factory publish.

## Summary

- review_status: **READY_FOR_OWNER_REVIEW**
- candidate_pattern_count: **109**
- matched_catalog_slug_count: **43**
- wildcard_unsupported_pattern_count: **6**
- no_catalog_match_pattern_count: **82**

### Catalog slug buckets

| Bucket | Count |
|---|---:|
| COVERED | 8 |
| CANDIDATE_REVIEW | 8 |
| REVIEW_DA29_CONFLICT | 26 |
| BLOCKED_HAF_CIN_CANONICAL | 1 |

### Catalog slug rows

| fridge_slug | bucket | compat | warnings |
|---|---|---|---|
| `samsung-rf18a5101sr` | COVERED | da29-00003g, da97-17376a, da97-17376b | DA29_COMPAT_PRESENT |
| `samsung-rf20a5101sr` | REVIEW_DA29_CONFLICT | da29-00020a, da97-15217d | — |
| `samsung-rf23bb8200ql` | CANDIDATE_REVIEW | da97-15217d | — |
| `samsung-rf23bb8900ql` | CANDIDATE_REVIEW | da97-08006b | — |
| `samsung-rf23m8070sg` | REVIEW_DA29_CONFLICT | da29-10105j | — |
| `samsung-rf23m8070sr` | CANDIDATE_REVIEW | da97-08006b | — |
| `samsung-rf23m8570sg` | REVIEW_DA29_CONFLICT | da29-00003g | — |
| `samsung-rf23m8590sg` | REVIEW_DA29_CONFLICT | da29-00019a | — |
| `samsung-rf23m8590sr` | COVERED | da29-00003g, da97-17376a, da97-17376b | DA29_COMPAT_PRESENT |
| `samsung-rf27t5201sr` | REVIEW_DA29_CONFLICT | da29-10105j | — |
| `samsung-rf27t5501sg` | CANDIDATE_REVIEW | da97-19467c | — |
| `samsung-rf27t5501sr` | BLOCKED_HAF_CIN_CANONICAL | da29-00012b, da29-00020b | — |
| `samsung-rf28r6201sg` | REVIEW_DA29_CONFLICT | da29-00019a, da29-10105j | — |
| `samsung-rf28r6201sr` | REVIEW_DA29_CONFLICT | da29-00003g, da97-08006b | — |
| `samsung-rf28r6201sw` | CANDIDATE_REVIEW | da97-15217d | — |
| `samsung-rf28r6201ww` | REVIEW_DA29_CONFLICT | da29-10105j | — |
| `samsung-rf28r6241sb` | REVIEW_DA29_CONFLICT | da29-00019a | — |
| `samsung-rf28r6241sg` | REVIEW_DA29_CONFLICT | da29-00019a | — |
| `samsung-rf28r6241sr` | REVIEW_DA29_CONFLICT | da29-00020a, da97-06317a | — |
| `samsung-rf28r6241sw` | REVIEW_DA29_CONFLICT | da29-10105j | — |
| `samsung-rf28r6301sr` | REVIEW_DA29_CONFLICT | da29-00019a | — |
| `samsung-rf28r7201sg` | REVIEW_DA29_CONFLICT | da29-10105j | — |
| `samsung-rf28r7201sr` | COVERED | da97-17376b | — |
| `samsung-rf28r7201ww` | REVIEW_DA29_CONFLICT | da29-00019a, da97-08006b | — |
| `samsung-rf28r7351sg` | COVERED | da97-17376a, da97-17376b | — |
| `samsung-rf28r7351sr` | COVERED | da97-17376b | — |
| `samsung-rf28r7351sw` | REVIEW_DA29_CONFLICT | da29-00020a, da97-06317a | — |
| `samsung-rf28r7351ww` | CANDIDATE_REVIEW | da97-08006b | — |
| `samsung-rf28r7551sg` | COVERED | da97-17376a, da97-17376b | — |
| `samsung-rf28r7551sr` | REVIEW_DA29_CONFLICT | da29-00019a, da97-08006b | — |
| `samsung-rf28r7551sw` | REVIEW_DA29_CONFLICT | da29-00003g | — |
| `samsung-rf28r7551ww` | REVIEW_DA29_CONFLICT | da29-00020a | — |
| `samsung-rf28t5001sb` | CANDIDATE_REVIEW | da97-19467c | — |
| `samsung-rf28t5001sg` | REVIEW_DA29_CONFLICT | da29-00003g | — |
| `samsung-rf28t5001sr` | COVERED | da97-17376a, da97-17376b | — |
| `samsung-rf28t5001ww` | CANDIDATE_REVIEW | da97-08006b | — |
| `samsung-rf28t5021sr` | REVIEW_DA29_CONFLICT | da29-00020a | — |
| `samsung-rf28t5101sg` | REVIEW_DA29_CONFLICT | da29-10105j | — |
| `samsung-rf28t5101sr` | REVIEW_DA29_CONFLICT | da29-00019a | — |
| `samsung-rf28t5f01sr` | REVIEW_DA29_CONFLICT | da29-00019a | — |
| `samsung-rs22t5201sg` | REVIEW_DA29_CONFLICT | da29-10105j | — |
| `samsung-rs22t5201sr` | COVERED | da97-17376a, da97-17376b | — |
| `samsung-rs25h5111sr` | REVIEW_DA29_CONFLICT | da29-10105j | — |

### Unsupported wildcard patterns

- `RF70F23*E*`
- `RF70F29*E*`
- `RF70H25*E*`
- `RF70H30*E*`
- `RF80H25*E*`
- `RF80H30*E*`
