"use client";

import { addRecentSearch } from "@/lib/client/recent-searches";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useState,
  type RefObject,
} from "react";

export function SearchForm({
  initialQuery = "",
  actionPath = "/search",
  submitLabel = "Look it up",
  label = "Model or filter part number",
  labelVisible = false,
  placeholder = "Model number, part number, or the code on your old filter",
  placeholderDesktop,
  inputId = "search-q",
  inputRef,
  formClassName,
  inputClassName,
  buttonClassName,
  supportingLine,
  validationMessage,
  describedBy,
  stackedUntilLg = false,
}: {
  initialQuery?: string;
  actionPath?: string;
  submitLabel?: string;
  label?: string;
  labelVisible?: boolean;
  placeholder?: string;
  placeholderDesktop?: string;
  inputId?: string;
  inputRef?: RefObject<HTMLInputElement>;
  formClassName?: string;
  inputClassName?: string;
  buttonClassName?: string;
  supportingLine?: string;
  validationMessage?: string;
  describedBy?: string;
  stackedUntilLg?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [error, setError] = useState<string | null>(null);
  const [resolvedPlaceholder, setResolvedPlaceholder] = useState(placeholder);

  useEffect(() => {
    if (!placeholderDesktop) {
      setResolvedPlaceholder(placeholder);
      return;
    }
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setResolvedPlaceholder(mq.matches ? placeholderDesktop : placeholder);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [placeholder, placeholderDesktop]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      if (validationMessage) setError(validationMessage);
      return;
    }
    setError(null);
    addRecentSearch(trimmed);
    const path = actionPath.replace(/\/$/, "");
    router.push(`${path}?q=${encodeURIComponent(trimmed)}`);
  }

  const rowClass = stackedUntilLg
    ? "flex w-full flex-col gap-3 lg:flex-row lg:items-stretch"
    : "flex w-full flex-col gap-3 sm:flex-row sm:items-stretch";

  return (
    <form onSubmit={onSubmit} className={formClassName ?? "flex w-full flex-col gap-3"}>
      <label htmlFor={inputId} className={labelVisible ? "bp-home__label" : "sr-only"}>
        {label}
      </label>
      <div className={rowClass}>
        <input
          ref={inputRef}
          id={inputId}
          name="q"
          type="search"
          autoComplete="off"
          autoFocus={false}
          placeholder={resolvedPlaceholder}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (error) setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={[describedBy, `${inputId}-error`].filter(Boolean).join(" ") || undefined}
          className={
            inputClassName ??
            "min-h-14 flex-1 rounded-xl border border-bp-border bg-bp-surface px-4 text-base text-bp-text shadow-sm placeholder:text-bp-muted focus:border-bp-text focus:outline-none focus:ring-2 focus:ring-bp-trust/30"
          }
        />
        <button
          type="submit"
          className={
            buttonClassName ??
            "bp-btn-press min-h-14 shrink-0 rounded-xl bg-bp-action-press px-6 text-base font-semibold text-white transition-colors hover:bg-bp-action focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bp-action"
          }
        >
          {submitLabel}
        </button>
      </div>
      {supportingLine ? <p className="bp-home__meta">{supportingLine}</p> : null}
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-base text-bp-block">
          {error}
        </p>
      ) : (
        <p id={`${inputId}-error`} className="sr-only" aria-live="polite" />
      )}
    </form>
  );
}
