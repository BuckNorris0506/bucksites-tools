"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  HOME_FIND_MY_NUMBER,
  HOME_HELP_SUPPORTING,
  HOME_NUMBER_HELP_ID,
  HOME_SECOND_DOOR,
  OPEN_NUMBER_HELP_EVENT,
} from "@/lib/homepage/homepage-copy";
import {
  NUMBER_HELP_AP_GAP,
  NUMBER_HELP_APPLIANCE_INTRO,
  NUMBER_HELP_APPLIANCE_PLACES,
  NUMBER_HELP_GENERIC_LOCATION,
  NUMBER_HELP_GENERIC_MANUAL,
  NUMBER_HELP_OLD_FILTER_LINES,
  NUMBER_HELP_VARIATION_NOTE,
  NUMBER_HELP_WORN_TAG,
  NUMBER_HELP_WRITE_DOWN,
} from "@/lib/homepage/number-help-copy";

export function NumberHelpDisclosure({
  lookupInputId,
}: {
  lookupInputId: string;
}) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"appliance" | "filter">("appliance");
  const closeRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();

  function closeAndRestoreFocus() {
    setOpen(false);
    window.setTimeout(() => {
      document.getElementById(lookupInputId)?.focus();
    }, 0);
  }

  function openHelp() {
    setOpen(true);
    window.requestAnimationFrame(() => {
      closeRef.current?.focus();
    });
  }

  useEffect(() => {
    function onOpen() {
      openHelp();
    }
    function onHash() {
      if (window.location.hash === `#${HOME_NUMBER_HELP_ID}`) {
        openHelp();
      }
    }
    window.addEventListener(OPEN_NUMBER_HELP_EVENT, onOpen);
    window.addEventListener("hashchange", onHash);
    onHash();
    return () => {
      window.removeEventListener(OPEN_NUMBER_HELP_EVENT, onOpen);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  return (
    <div id={HOME_NUMBER_HELP_ID}>
      <button
        type="button"
        className="bp-home__text-action"
        aria-expanded={open}
        aria-controls={`${HOME_NUMBER_HELP_ID}-panel`}
        onClick={() => (open ? closeAndRestoreFocus() : openHelp())}
      >
        {HOME_SECOND_DOOR}
      </button>
      <p className="bp-home__meta mt-1">{HOME_HELP_SUPPORTING}</p>

      {open ? (
        <div
          id={`${HOME_NUMBER_HELP_ID}-panel`}
          role="region"
          aria-labelledby={headingId}
          className="mt-4 border border-bp-border bg-white p-4"
          style={{ borderRadius: 8 }}
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id={headingId} className="text-lg font-semibold text-bp-text">
              {HOME_FIND_MY_NUMBER}
            </h2>
            <button
              ref={closeRef}
              type="button"
              className="bp-home__text-action min-h-11 px-1 py-0"
              onClick={closeAndRestoreFocus}
            >
              Close
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Where to look">
            <button
              type="button"
              role="tab"
              aria-selected={panel === "appliance"}
              className="inline-flex min-h-11 items-center rounded-lg border border-bp-border px-3 text-base font-semibold text-bp-text"
              style={
                panel === "appliance"
                  ? { background: "#172554", color: "#fff", borderColor: "#172554" }
                  : undefined
              }
              onClick={() => setPanel("appliance")}
            >
              On the appliance
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={panel === "filter"}
              className="inline-flex min-h-11 items-center rounded-lg border border-bp-border px-3 text-base font-semibold text-bp-text"
              style={
                panel === "filter"
                  ? { background: "#172554", color: "#fff", borderColor: "#172554" }
                  : undefined
              }
              onClick={() => setPanel("filter")}
            >
              On the old filter
            </button>
          </div>

          {panel === "appliance" ? (
            <div className="mt-4 space-y-3 text-base leading-relaxed text-bp-text/90">
              <p>{NUMBER_HELP_APPLIANCE_INTRO}</p>
              <p>{NUMBER_HELP_GENERIC_LOCATION}</p>
              <ul className="list-disc space-y-2 pl-5">
                {NUMBER_HELP_APPLIANCE_PLACES.map((place) => (
                  <li key={place.title}>
                    <span className="font-semibold">{place.title}. </span>
                    {place.body}
                  </li>
                ))}
              </ul>
              <ul className="list-disc space-y-1 pl-5">
                {NUMBER_HELP_WRITE_DOWN.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p>{NUMBER_HELP_WORN_TAG}</p>
              <p>{NUMBER_HELP_GENERIC_MANUAL}</p>
              <p className="text-bp-muted">{NUMBER_HELP_VARIATION_NOTE}</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3 text-base leading-relaxed text-bp-text/90">
              <ul className="list-disc space-y-2 pl-5">
                {NUMBER_HELP_OLD_FILTER_LINES.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p>{NUMBER_HELP_AP_GAP}</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
