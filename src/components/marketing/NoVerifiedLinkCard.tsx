// Presentation-only / illustrative. Not the gate.
export function NoVerifiedLinkCard({ illustrative = false }: { illustrative?: boolean }) {
  return (
    <div className="rounded-2xl border border-bp-border bg-bp-surface p-5">
      <span className="inline-flex items-center gap-2 rounded-full bg-bp-caution-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-bp-caution">
        <span className="h-2 w-2 rounded-full bg-bp-caution" aria-hidden /> No link yet
      </span>
      <p className="mt-3 font-semibold text-bp-text">We haven&apos;t found a buying path we&apos;d vouch for yet — still checking.</p>
      <ul className="m-0 mt-3 space-y-1.5 p-0 text-sm text-bp-muted">
        <li>· Compare the code on your old filter</li>
        <li>· Check your owner&apos;s manual</li>
        <li>· Don&apos;t let a random listing rush you</li>
      </ul>
      <p className="mt-3 text-xs italic text-bp-muted">A missing link means we&apos;re still checking — not that you&apos;re stuck.</p>
      {illustrative ? <span className="sr-only">Illustrative example, not your appliance.</span> : null}
    </div>
  );
}
