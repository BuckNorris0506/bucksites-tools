"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  function closeAndRestoreFocus() {
    setOpen(false);
    window.setTimeout(() => {
      document.getElementById(lookupInputId)?.focus();
    }, 0);
  }

  function openHelp() {
    setOpen(true);
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      window.setTimeout(() => closeRef.current?.focus(), 0);
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

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
    <>
      <button
        type="button"
        id={HOME_NUMBER_HELP_ID}
        className="bp-home__number-door"
        aria-haspopup="dialog"
        onClick={openHelp}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 0 1 5 .5c0 1.5-2.5 1.5-2.5 3M12 16v1" />
        </svg>
        {HOME_SECOND_DOOR}
      </button>

      <dialog
        ref={dialogRef}
        className="bp-home-dialog"
        aria-labelledby={headingId}
        onCancel={(e) => {
          e.preventDefault();
          closeAndRestoreFocus();
        }}
      >
        <div className="bp-home-dialog__top">
          <span className="bp-home-dialog__label">Find your number</span>
          <button
            ref={closeRef}
            type="button"
            className="bp-home-dialog__close"
            onClick={closeAndRestoreFocus}
            aria-label="Close number help"
          >
            Close <span aria-hidden="true">×</span>
          </button>
        </div>
        <h2 id={headingId} tabIndex={-1}>
          Start with the label.
        </h2>
        <p>Look for the appliance’s model number or the part number on your old filter.</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="rounded-lg border border-[#cad6db] bg-[#f4f7fb] p-4 text-left"
            onClick={() => setPanel("appliance")}
            aria-pressed={panel === "appliance"}
          >
            <h3 className="text-lg font-semibold text-bp-text">On the appliance</h3>
            <p className="mt-2 text-base text-bp-muted">{NUMBER_HELP_GENERIC_LOCATION}</p>
          </button>
          <button
            type="button"
            className="rounded-lg border border-[#cad6db] bg-[#f4f7fb] p-4 text-left"
            onClick={() => setPanel("filter")}
            aria-pressed={panel === "filter"}
          >
            <h3 className="text-lg font-semibold text-bp-text">On the old filter</h3>
            <p className="mt-2 text-base text-bp-muted">{NUMBER_HELP_OLD_FILTER_LINES[0]}</p>
          </button>
        </div>

        {panel === "appliance" ? (
          <div className="mt-4 space-y-3 text-base leading-relaxed text-bp-text/90">
            <p>{NUMBER_HELP_APPLIANCE_INTRO}</p>
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

        <div className="bp-home-dialog__footer">
          <button type="button" className="bp-home-dialog__secondary" onClick={closeAndRestoreFocus}>
            Back to lookup
          </button>
        </div>
      </dialog>
    </>
  );
}
