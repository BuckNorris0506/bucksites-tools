const ITEMS = [
  { label: "Verified Link", dot: "bg-bp-success", help: "A place to buy we've checked against the part, listing, and evidence." },
  { label: "No link yet", dot: "bg-bp-caution", help: "We haven't found a buying path we'd vouch for yet — still checking." },
  { label: "Wrong-part risk", dot: "bg-bp-block", help: "A look-alike that doesn't actually fit your unit." },
  { label: "Evidence checked", dot: "bg-bp-text", help: "What we checked, and when." },
] as const;

export function StatusLegend() {
  return (
    <ul className="m-0 flex flex-wrap gap-2 p-0" aria-label="What BuckParts statuses mean">
      {ITEMS.map((it) => (
        <li key={it.label} className="list-none">
          <span
            title={it.help}
            className="inline-flex items-center gap-2 rounded-full border border-bp-border bg-bp-surface px-3.5 py-2 text-sm font-semibold text-bp-text"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${it.dot}`} aria-hidden />
            {it.label}
            <span className="sr-only"> — {it.help}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
