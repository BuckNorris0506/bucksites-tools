# Refrigerator manual evidence (fixtures)

This directory is reserved for **reviewed** manual-evidence fixtures (JSON or similar) that pass `validateRefrigeratorManualEvidencePublicReady` in `src/lib/manuals/refrigerator-manual-evidence.ts`.

**Rules**

- No copied manufacturer diagrams or manual page images in BuckParts UI.
- Model-specific filter location or replacement steps on public pages require a **public-ready** record (valid URL, non-unknown source type, high/medium confidence, operator reviewed, at least one of location or steps text).
- Until fixtures exist and pages explicitly load them, fridge PDPs show **only** generic homeowner guidance from `src/lib/copy/fridge-homeowner-help.ts`.
