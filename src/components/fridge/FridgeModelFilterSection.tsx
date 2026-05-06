import Link from "next/link";
import { Prose } from "@/components/Prose";
import { TrustAwareBuySection } from "@/components/trust/TrustAwareBuySection";
import type { FridgeMappedFilterRow } from "@/lib/data/fridges";
import { buyPathSortContextForFilter } from "@/lib/retailers/launch-buy-links";
import { buildPartPageTrust } from "@/lib/trust/part-trust";

const FRIDGE_MODEL_FILTER_BUY_SUPPRESS =
  "Compare your old filter or manual first — we're not showing a store button on this page yet.";

function intervalLabel(months: number | null | undefined): string | null {
  if (months == null || months <= 0) return null;
  if (months === 1) return "About every month";
  return `About every ${months} months`;
}

function filterNotesHtml(notes: string | null | undefined): string | null {
  const t = (notes ?? "").trim();
  return t.length > 0 ? t : null;
}

export function FridgeModelFilterSection({
  filters,
  quarantineMessage,
}: {
  filters: FridgeMappedFilterRow[];
  quarantineMessage?: string | null;
}) {
  if (quarantineMessage) {
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Filter guidance</h2>
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          {quarantineMessage}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
          Full detail for each number
        </h2>
        <p className="max-w-prose text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          Same numbers as the chips above—here with notes and store links.{" "}
          <strong className="font-medium text-neutral-800 dark:text-neutral-200">Not ranked.</strong> Open filter details
          before using any store link.
        </p>
      </div>

      {filters.length === 0 ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          We do not have mapped filter numbers for this model in our reference yet. If you have the OEM number from your
          old filter, try search or check back after catalog updates.
        </p>
      ) : (
        <ul className="m-0 list-none space-y-6 p-0">
          {filters.map((f) => {
            const fInterval = intervalLabel(f.replacement_interval_months);
            const filterHref = `/filter/${f.slug}`;
            const buyPathSortContext = buyPathSortContextForFilter(
              f.slug,
              f.name,
              f.oem_part_number,
            );
            const trustSummary = buildPartPageTrust({
              modelsCount: f.compatible_fridge_model_count,
              retailerLinks: f.retailer_links,
              oemPartNumber: f.oem_part_number,
              alsoKnownAs: f.also_known_as,
              notes: f.notes,
              buyPathSortContext,
            });
            const notesHtml = filterNotesHtml(f.notes);
            const aliases = f.also_known_as ?? [];

            return (
              <li
                key={f.id}
                className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-5 dark:border-neutral-800 dark:bg-neutral-900/35"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Number to compare
                    </p>
                    <Link
                      href={filterHref}
                      className="block font-mono text-2xl font-semibold tracking-tight text-neutral-900 underline decoration-neutral-400 decoration-2 underline-offset-2 hover:decoration-neutral-600 dark:text-neutral-50 dark:decoration-neutral-600 dark:hover:decoration-neutral-400"
                    >
                      {f.oem_part_number}
                    </Link>
                    <div>
                      <Link
                        href={filterHref}
                        className="inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-neutral-900 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 shadow-sm transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 dark:border-neutral-100 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-900 dark:focus:ring-offset-neutral-950"
                      >
                        Open filter details<span aria-hidden> →</span>
                      </Link>
                    </div>
                    {f.name?.trim() ? (
                      <p className="text-sm text-neutral-700 dark:text-neutral-300">{f.name.trim()}</p>
                    ) : null}
                    {aliases.length > 0 ? (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">Also listed as:</span>{" "}
                        <span className="font-mono text-neutral-800 dark:text-neutral-200">{aliases.join(" · ")}</span>
                      </p>
                    ) : null}
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      Compare this number to the text on your existing cartridge before you buy.
                    </p>
                    {fInterval ? (
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        Typical replacement timing on file: {fInterval}
                      </p>
                    ) : null}
                  </div>
                </div>

                {notesHtml ? (
                  <div className="mt-4 border-t border-neutral-200/80 pt-4 text-sm dark:border-neutral-700/80">
                    <Prose>{notesHtml}</Prose>
                  </div>
                ) : null}

                <div className="mt-5 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    Store links (secondary—only after this number matches what you need)
                  </p>
                  <div className="mt-3">
                    <TrustAwareBuySection
                      trust={trustSummary}
                      links={f.retailer_links}
                      goBase="/go"
                      primaryCtaLabel="Open a verified listing"
                      suppressMessage={FRIDGE_MODEL_FILTER_BUY_SUPPRESS}
                      gateSuppressionSummary={f.buy_path_gate_suppression}
                      buyPathSortContext={buyPathSortContext}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
