"use client";

import { addRecentSearch } from "@/lib/client/recent-searches";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function SearchForm({
  initialQuery = "",
  actionPath = "/search",
}: {
  initialQuery?: string;
  actionPath?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    addRecentSearch(trimmed);
    const path = actionPath.replace(/\/$/, "");
    router.push(`${path}?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-3 sm:flex-row sm:items-stretch">
      <label htmlFor="search-q" className="sr-only">Model or filter part number</label>
      <input
        id="search-q"
        name="q"
        type="search"
        autoComplete="off"
        placeholder="Model number, part number, or the code on your old filter"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="min-h-14 flex-1 rounded-xl border border-bp-border bg-bp-surface px-4 text-base text-bp-text shadow-sm placeholder:text-bp-muted focus:border-bp-text focus:outline-none focus:ring-2 focus:ring-bp-trust/30"
      />
      <button
        type="submit"
        className="bp-btn-press min-h-14 shrink-0 rounded-xl bg-bp-action-press px-6 text-base font-semibold text-white transition-colors hover:bg-bp-action focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bp-action"
      >
        Look it up
      </button>
    </form>
  );
}
