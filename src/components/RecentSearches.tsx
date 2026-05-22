"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  clearRecentSearches,
  loadRecentSearches,
  RECENT_SEARCHES_UPDATED_EVENT,
} from "@/lib/client/recent-searches";

export function RecentSearches({
  actionPath = "/search",
  className = "",
}: {
  actionPath?: string;
  className?: string;
}) {
  const [items, setItems] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(() => {
    setItems(loadRecentSearches());
  }, []);

  useEffect(() => {
    setMounted(true);
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener(RECENT_SEARCHES_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(RECENT_SEARCHES_UPDATED_EVENT, onUpdate);
  }, [refresh]);

  if (!mounted || items.length === 0) return null;

  const path = actionPath.replace(/\/$/, "");

  function onClear() {
    clearRecentSearches();
    refresh();
  }

  return (
    <div
      className={`bp-recent-searches ${className}`.trim()}
      aria-label="Your recent lookups on this device"
    >
      <div className="bp-recent-searches__head">
        <p className="bp-recent-searches__label">Recent searches</p>
        <button type="button" className="bp-recent-searches__clear" onClick={onClear}>
          Clear
        </button>
      </div>
      <ul className="bp-recent-searches__list">
        {items.map((q) => (
          <li key={q}>
            <Link
              href={`${path}?q=${encodeURIComponent(q)}`}
              className="bp-recent-searches__chip"
            >
              {q}
            </Link>
          </li>
        ))}
      </ul>
      <p className="bp-recent-searches__hint">
        Saved only on this browser—not an account.
      </p>
    </div>
  );
}
