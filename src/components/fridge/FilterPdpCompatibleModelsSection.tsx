import Link from "next/link";

import { FILTER_PDP_COMPAT_MODELS_SECTION_MARKER_V1 } from "@/lib/fridge/filter-pdp-referenceability-markers";

export type FilterPdpCompatibleModelRowV1 = {
  id: string;
  slug: string;
  model_number: string;
  brand_name: string;
};

export type FilterPdpCompatibleModelsSectionProps = {
  oemPartNumber: string;
  displayModelCount: number;
  hiddenQuarantinedModelCount: number;
  models: FilterPdpCompatibleModelRowV1[];
};

/**
 * Compat-proven internal links and comparison anchors for refrigerator filter PDPs.
 * Marker: FilterPdpCompatibleModelsSection (referenceability factory v1).
 */
export function FilterPdpCompatibleModelsSection({
  oemPartNumber,
  displayModelCount,
  hiddenQuarantinedModelCount,
  models,
}: FilterPdpCompatibleModelsSectionProps) {
  void FILTER_PDP_COMPAT_MODELS_SECTION_MARKER_V1;

  return (
    <section
      className="space-y-4"
      aria-label="Compatible refrigerator models"
      data-referenceability-compat-models-v1="true"
    >
      <div>
        <h2 className="text-lg font-semibold text-bp-text">
          Compatible refrigerator models ({displayModelCount})
        </h2>
        {displayModelCount > 1 ? (
          <p className="mt-2 text-sm leading-relaxed text-bp-muted">
            Compare your refrigerator model number to the mapped models below. Each link opens the model
            page where we list {oemPartNumber} when compatibility is on file.
          </p>
        ) : null}
      </div>
      {displayModelCount === 0 ? (
        <p className="text-sm leading-relaxed text-bp-muted">
          {hiddenQuarantinedModelCount > 0 ? (
            <>
              Refrigerator models we had linked to this filter are under compatibility review. Open your
              exact model page from search and compare part numbers before buying any replacement filter.
            </>
          ) : (
            <>
              No refrigerator models are linked to this part number on file yet. If you have your fridge model or
              another code from the old filter,{" "}
              <Link
                href="/search"
                className="font-semibold text-bp-trust underline decoration-bp-trust/30 underline-offset-2 hover:decoration-bp-trust/55"
              >
                try search
              </Link>{" "}
              to check spelling, then compare what you see to the numbers on the cartridge before you buy.
            </>
          )}
        </p>
      ) : (
        <ul className="divide-y divide-bp-border overflow-hidden rounded-xl border border-bp-border bg-bp-surface">
          {models.map((m) => (
            <li key={m.id}>
              <Link
                href={`/fridge/${m.slug}`}
                className="block px-4 py-3.5 text-sm transition hover:bg-bp-trust-soft/40"
              >
                <span className="bp-code font-semibold text-bp-text">{m.model_number}</span>
                <span className="ml-2 text-bp-muted">{m.brand_name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
