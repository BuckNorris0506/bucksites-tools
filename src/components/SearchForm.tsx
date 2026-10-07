"use client";

import { addRecentSearch } from "@/lib/client/recent-searches";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export const SEARCH_FORM_DEFAULT_SUBMIT_LABEL = "Look it up" as const;
export const SEARCH_FORM_DEFAULT_INPUT_LABEL = "Model or filter part number" as const;
export const SEARCH_FORM_DEFAULT_PLACEHOLDER =
  "Model number, part number, or the code on your old filter" as const;

export function SearchForm({
  initialQuery = "",
  actionPath = "/search",
  submitLabel = SEARCH_FORM_DEFAULT_SUBMIT_LABEL,
  inputLabel = SEARCH_FORM_DEFAULT_INPUT_LABEL,
  showInputLabel = false,
  placeholder = SEARCH_FORM_DEFAULT_PLACEHOLDER,
}: {
  initialQuery?: string;
  actionPath?: string;
  submitLabel?: string;
  inputLabel?: string;
  showInputLabel?: boolean;
  placeholder?: string;
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
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-2">
      <label
        htmlFor="search-q"
        className={
          showInputLabel
            ? "text-sm font-medium text-bp-text"
            : "sr-only"
        }
      >
        {inputLabel}
      </label>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-stretch">
        <input
          id="search-q"
          name="q"
          type="search"
          autoComplete="off"
          placeholder={placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-h-14 flex-1 rounded-xl border border-bp-border bg-bp-surface px-4 text-base text-bp-text shadow-sm placeholder:text-bp-muted focus:border-bp-text focus:outline-none focus:ring-2 focus:ring-bp-trust/30"
        />
        <button
          type="submit"
          className="bp-btn-press min-h-14 shrink-0 rounded-xl bg-bp-action-press px-6 text-base font-semibold text-white transition-colors hover:bg-bp-action focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bp-action"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
