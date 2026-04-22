"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function SearchForm({
  initialQuery = "",
  actionPath = "/search",
}: {
  initialQuery?: string;
  /** Path without query string, e.g. `/air-purifier/search` */
  actionPath?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    const path = actionPath.replace(/\/$/, "");
    router.push(`${path}?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-3 sm:flex-row sm:items-stretch">
      <label htmlFor="search-q" className="sr-only">
        Model or filter part number
      </label>
      <input
        id="search-q"
        name="q"
        type="search"
        autoComplete="off"
        placeholder="Search by model number or part number"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="min-h-14 flex-1 rounded-md border border-neutral-300 bg-white px-4 text-base text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500"
      />
      <button
        type="submit"
        className="min-h-14 shrink-0 rounded-md bg-neutral-900 px-6 text-base font-semibold text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
      >
        Search
      </button>
    </form>
  );
}
