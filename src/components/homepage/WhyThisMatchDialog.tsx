"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  FEATURED_FIT_FILTER_SOURCE_TITLE,
  FEATURED_FIT_FILTER_SOURCE_URL,
  FEATURED_FIT_HREF,
  FEATURED_FIT_SEARCH_HREF,
  FEATURED_FIT_SOURCE_TITLE,
  FEATURED_FIT_SOURCE_URL,
  FEATURED_FIT_WHY_BODY,
  FEATURED_FIT_WHY_LIMIT_BODY,
  FEATURED_FIT_WHY_LIMIT_TITLE,
  FEATURED_FIT_WHY_TITLE,
} from "@/lib/homepage/featured-fit-example";

export function WhyThisMatchDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      window.setTimeout(() => titleRef.current?.focus(), 0);
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="bp-home-dialog"
      aria-labelledby="why-match-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <div className="bp-home-dialog__top">
        <span className="bp-home-dialog__label">A real model example</span>
        <button
          type="button"
          className="bp-home-dialog__close"
          onClick={onClose}
          aria-label="Close match explanation"
        >
          Close <span aria-hidden="true">×</span>
        </button>
      </div>
      <h2 id="why-match-title" ref={titleRef} tabIndex={-1}>
        {FEATURED_FIT_WHY_TITLE}
      </h2>
      <p>{FEATURED_FIT_WHY_BODY}</p>
      <div className="bp-home-dialog__note">
        <strong>{FEATURED_FIT_WHY_LIMIT_TITLE}</strong>
        {FEATURED_FIT_WHY_LIMIT_BODY}
      </div>
      <ul className="bp-home-dialog__links">
        <li>
          <Link href={FEATURED_FIT_SEARCH_HREF}>Open the real BuckParts lookup ↗</Link>
        </li>
        <li>
          <Link href={FEATURED_FIT_HREF}>View this model’s fit page ↗</Link>
        </li>
        <li>
          <a href={FEATURED_FIT_SOURCE_URL} rel="nofollow noopener noreferrer" target="_blank">
            {FEATURED_FIT_SOURCE_TITLE} ↗
          </a>
        </li>
        <li>
          <a href={FEATURED_FIT_FILTER_SOURCE_URL} rel="nofollow noopener noreferrer" target="_blank">
            {FEATURED_FIT_FILTER_SOURCE_TITLE} ↗
          </a>
        </li>
      </ul>
      <div className="bp-home-dialog__footer">
        <button type="button" className="bp-home-dialog__secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </dialog>
  );
}
