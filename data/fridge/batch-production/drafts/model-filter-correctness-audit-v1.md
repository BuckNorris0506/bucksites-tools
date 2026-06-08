# Model filter correctness audit v1

- generated_at: **2026-06-08T05:13:00.095Z**
- total_models: **500**
- factory_scaling.safe: **15**
- factory_scaling.needs_evidence: **409**
- factory_scaling.dangerous: **76**

## Classification counts

| Classification | Count |
| --- | ---: |
| PROVEN_CORRECT | 15 |
| LIKELY_CORRECT_NEEDS_EVIDENCE | 409 |
| WRONG_PART_RISK | 75 |
| BLOCKED | 1 |
| UNKNOWN | 0 |

## Confusion-family summary

| Family | Models affected |
| --- | ---: |
| haf_qin_vs_haf_cin | 0 |
| da29_vs_da97 | 13 |
| xwf_vs_xwfe | 4 |
| fppwfu01_vs_fppwfu02 | 0 |
| lg_lt_generation_mixes | 34 |
| ge_rpwfe_mixed_legacy | 3 |
| wildcard_blocked_haf_cin | 1 |
| wildcard_review_da29_conflict | 26 |

## Indexable-risk pages

_None — no dangerous classifications intersect quality-gate indexable artifacts._

## Top 50 risk pages

- `lg-lfxs26596s` score=117 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt1000p,lt1000pc,lt700p
- `lg-lfxs28566s` score=117 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt1000p,lt1000pc,lt700p
- `samsung-rf18a5101sr` score=116 WRONG_PART_RISK — wildcard:DA29_COMPAT_PRESENT
- `samsung-rf23m8590sr` score=116 WRONG_PART_RISK — wildcard:DA29_COMPAT_PRESENT
- `lg-lfcc22426s` score=115 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt1000p,lt1000pc
- `lg-lfcs22520s` score=115 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt1000p,lt1000pc
- `lg-lfds22520s` score=115 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt1000p,lt1000pc
- `lg-lfxc22526s` score=115 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt1000p,lt1000pc
- `lg-lfxc24796d` score=115 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt1000p,lt1000pc
- `lg-lfxs26973d` score=115 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt1000p,lt1000pc
- `lg-lfxs28596s` score=115 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt1000p,lt1000pc
- `lg-lfxs28968d` score=115 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt1000p,lt1000pc
- `lg-lfxs28991s` score=115 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt1000p,lt1000pc
- `lg-lfxs30796d` score=115 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt1000p,lt1000pc
- `lg-lmws27626s` score=115 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt1000p,lt1000pc
- `lg-lmxs30796s` score=115 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt1000p,lt1000pc
- `lg-lrmvc2306s` score=115 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt1000p,lt1000pc
- `lg-lrsxs2706s` score=115 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt1000p,lt1000pc
- `lg-lsxs26366s` score=115 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt1000p,lt1000pc
- `samsung-rf20a5101sr` score=114 WRONG_PART_RISK — wildcard:REVIEW_DA29_CONFLICT
- `samsung-rf28r6201sr` score=114 WRONG_PART_RISK — wildcard:REVIEW_DA29_CONFLICT
- `samsung-rf28r6241sr` score=114 WRONG_PART_RISK — wildcard:REVIEW_DA29_CONFLICT
- `samsung-rf28r7201ww` score=114 WRONG_PART_RISK — wildcard:REVIEW_DA29_CONFLICT
- `samsung-rf28r7351sw` score=114 WRONG_PART_RISK — wildcard:REVIEW_DA29_CONFLICT
- `samsung-rf28r7551sr` score=114 WRONG_PART_RISK — wildcard:REVIEW_DA29_CONFLICT
- `ge-gfe28gskww` score=109 WRONG_PART_RISK — confusion:XWF vs XWFE (GE RFID shell mismatch)
- `ge-gfe28gynes` score=109 WRONG_PART_RISK — confusion:XWF vs XWFE (GE RFID shell mismatch)
- `ge-gie21gsnerss` score=109 WRONG_PART_RISK — confusion:XWF vs XWFE (GE RFID shell mismatch)
- `ge-gye22hskww` score=109 WRONG_PART_RISK — confusion:GE RPWFE mixed with legacy MWF/XWF/XWFE family
- `ge-pfe28kskbb` score=109 WRONG_PART_RISK — confusion:GE RPWFE mixed with legacy MWF/XWF/XWFE family
- `ge-pfe28kynww` score=109 WRONG_PART_RISK — confusion:XWF vs XWFE (GE RFID shell mismatch)
- `ge-pwe23kmkes` score=109 WRONG_PART_RISK — confusion:GE RPWFE mixed with legacy MWF/XWF/XWFE family
- `lg-lfcc25426s` score=109 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt600p,lt800p
- `lg-lfcs23520s` score=109 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt600p,lt800p
- `lg-lfxc22526d` score=109 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt600p,lt800p
- `lg-lfxc22596d` score=109 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt600p,lt800p
- `lg-lfxc22596s` score=109 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt1000p,lt1000pc
- `lg-lfxs26973s` score=109 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt1000p,lt1000pc
- `lg-lfxs28566b` score=109 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt600p,lt800p
- `lg-lfxs28968s` score=109 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt1000p,lt1000pc
- `lg-lfxs29566s` score=109 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt600p,lt800p
- `lg-lfxs30796s` score=109 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt600p,lt800p
- `lg-lmxs28626s` score=109 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt1000p,lt1000pc
- `lg-lrfvs3006s` score=109 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt1000p,lt1000pc
- `lg-lrfxs2503b` score=109 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt600p,lt800p
- `lg-lrfxs3106w` score=109 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt600p,lt800p
- `lg-lrmvc2306d` score=109 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt600p,lt800p
- `lg-lsxs27366s` score=109 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt600p,lt800p
- `lg-lupxs3186n` score=109 WRONG_PART_RISK — confusion:Multiple LG LT filter generations co-mapped: lt600p,lt800p
- `samsung-rf18hfenbww` score=109 WRONG_PART_RISK — confusion:Samsung DA29 (da29-00020a) + DA97 (da97-15217d) co-mapped

## Recommended next action

Resolve WRONG_PART_RISK and BLOCKED models before batch page factory scaling; prioritize indexable_risk_pages with quality-gate index=true.
