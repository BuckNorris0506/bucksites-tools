// Presentation-only / illustrative. Does NOT decide visibility and is NOT the
// product-page buyer-path gate (that is TrustAwareBuySection). Marketing use.
export function VerifiedLinkCard({
  destinationLabel = "Official manufacturer path",
  checkedDate,
  illustrative = false,
}: { destinationLabel?: string; checkedDate?: string; illustrative?: boolean }) {
  return (
    <div className="rounded-2xl border border-bp-border bg-bp-surface p-5">
      <span className="inline-flex items-center gap-2 rounded-full bg-bp-success-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-bp-success">
        <span className="h-2 w-2 rounded-full bg-bp-success" aria-hidden /> BuckParts Verified Link
      </span>
      <p className="mt-3 font-semibold text-bp-text">{destinationLabel}</p>
      <ul className="m-0 mt-3 space-y-2 p-0 text-sm">
        {["Part — matched", "Listing — checked", "Evidence — on file"].map((r) => (
          <li key={r} className="flex items-center gap-2 text-bp-text/90">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-bp-success text-[10px] font-bold text-white" aria-hidden>✓</span>
            {r}
          </li>
        ))}
      </ul>
      {checkedDate ? (
        <p className="bp-code mt-3 inline-block text-xs text-bp-success">Checked against this filter number · {checkedDate}</p>
      ) : null}
      <p className="mt-3 border-t border-dashed border-bp-border pt-3 text-xs text-bp-muted">We may earn a commission. It never decides what we show.</p>
      <p className="mt-2 text-xs italic text-bp-muted">Not every filter has a Verified Link.</p>
      {illustrative ? <span className="sr-only">Illustrative example, not your appliance.</span> : null}
    </div>
  );
}
