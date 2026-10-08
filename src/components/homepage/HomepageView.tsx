"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
} from "react";

import { addRecentSearch, RECENT_SEARCH_MIN_LENGTH } from "@/lib/client/recent-searches";
import { HOMEPAGE_ASTRA_COPY_V1 as copy } from "@/lib/copy/homepage-astra-v1";
import { SITE_DISPLAY_NAME } from "@/lib/site-brand";

import "./homepage.css";

function BuckMark() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14 8L10 16L16 20L20 14L24 20L28 14L32 20L38 16L34 8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <path d="M16 24L24 40L32 24L24 18L16 24Z" fill="currentColor" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 .5c0 1.5-2.5 1.5-2.5 3M12 16v1" />
    </svg>
  );
}

export function HomepageView() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const closeHelp = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  const openHelp = useCallback((opener: HTMLElement) => {
    openerRef.current = opener;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    document.body.classList.add("dialog-open");
    dialog.querySelector("h2")?.focus();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    function onClose() {
      document.body.classList.remove("dialog-open");
      const opener = openerRef.current;
      if (opener?.isConnected) {
        opener.focus({ preventScroll: true });
      }
    }
    dialog.addEventListener("close", onClose);
    return () => {
      dialog.removeEventListener("close", onClose);
      document.body.classList.remove("dialog-open");
    };
  }, []);

  function onHelpClick(event: MouseEvent<HTMLButtonElement>) {
    openHelp(event.currentTarget);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < RECENT_SEARCH_MIN_LENGTH) {
      setError(copy.emptyError);
      inputRef.current?.focus();
      return;
    }
    setError(null);
    addRecentSearch(trimmed);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function onQueryChange(value: string) {
    setQuery(value);
    if (error) setError(null);
  }

  return (
    <div className="bp-home">
      <a className="skip-link" href="#main">
        {copy.skip}
      </a>
      <header className="site-header">
        <div className="wrap header-inner">
          <Link href="/" className="brand" aria-label={`${SITE_DISPLAY_NAME} homepage`}>
            <BuckMark />
            <span className="wordmark">{SITE_DISPLAY_NAME}</span>
          </Link>
          <nav className="primary-nav" aria-label="Main navigation">
            <a href="#how-it-works">{copy.navHow}</a>
            <button className="nav-help" type="button" onClick={onHelpClick}>
              <HelpIcon />
              {copy.navHelp}
            </button>
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        <section className="hero" aria-labelledby="hero-heading">
          <div className="hero-inner">
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1 id="hero-heading">
              {copy.h1Lead} <span>{copy.h1Rest}</span>
            </h1>
            <p className="hero-intro">{copy.intro}</p>

            <div className="lookup-card">
              <form onSubmit={onSubmit} noValidate>
                <label htmlFor="lookup-q">{copy.inputLabel}</label>
                <div className="search-row">
                  <div className="input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <circle cx="10.7" cy="10.7" r="6.7" />
                      <path d="m16 16 4.5 4.5" />
                    </svg>
                    <input
                      ref={inputRef}
                      id="lookup-q"
                      name="q"
                      type="search"
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      placeholder={copy.placeholder}
                      value={query}
                      onChange={(e) => onQueryChange(e.target.value)}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? "input-hint query-error" : "input-hint"}
                    />
                  </div>
                  <button type="submit" className="search-submit">
                    {copy.submit}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="M4 12h15m-6-6 6 6-6 6" />
                    </svg>
                  </button>
                </div>
                <p id="input-hint" className="input-hint">
                  {copy.exampleLead} <code>{copy.exampleCode}</code>.
                </p>
                <p id="query-error" className="query-error" role="alert" hidden={!error}>
                  {error}
                </p>
              </form>
              <div className="lookup-bottom">
                <button type="button" className="number-help" onClick={onHelpClick}>
                  <HelpIcon />
                  {copy.numberHelp}
                </button>
                <p className="lookup-next">{copy.nextStep}</p>
              </div>
            </div>

            <div className="trust-line">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h5" />
              </svg>
              <p>
                <strong>{copy.trustLead}</strong> {copy.trustRest}
              </p>
            </div>
          </div>
        </section>

        <section className="how-section wrap" id="how-it-works" aria-labelledby="how-title">
          <div className="section-top">
            <h2 id="how-title">{copy.howTitle}</h2>
            <p className="section-kicker">{copy.howKicker}</p>
          </div>
          <ol className="steps">
            <li className="step">
              <span className="step-no" aria-hidden="true">
                01
              </span>
              <h3>{copy.step1Title}</h3>
              <p>{copy.step1Body}</p>
            </li>
            <li className="step">
              <span className="step-no" aria-hidden="true">
                02
              </span>
              <h3>{copy.step2Title}</h3>
              <p>{copy.step2Body}</p>
            </li>
            <li className="step">
              <span className="step-no" aria-hidden="true">
                03
              </span>
              <h3>{copy.step3Title}</h3>
              <p>{copy.step3Body}</p>
            </li>
          </ol>
        </section>

        <section className="philosophy" aria-labelledby="philosophy-title">
          <div className="wrap philosophy-grid">
            <div>
              <p className="eyebrow">{copy.philosophyEyebrow}</p>
              <h2 id="philosophy-title">{copy.philosophyTitle}</h2>
            </div>
            <div>
              <p>{copy.philosophyBody}</p>
              <Link href="/truth-policy">
                {copy.philosophyLink} <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="evidence-section wrap" aria-labelledby="evidence-title">
          <div className="evidence-grid">
            <div>
              <h2 id="evidence-title">{copy.evidenceTitle}</h2>
              <p className="section-intro">{copy.evidenceIntro}</p>
            </div>
            <div className="evidence-list">
              <details open>
                <summary>{copy.evidenceFitEstablished}</summary>
                <p>{copy.evidenceFitEstablishedBody}</p>
              </details>
              <details>
                <summary>{copy.evidenceFitNotConfirmed}</summary>
                <p>{copy.evidenceFitNotConfirmedBody}</p>
              </details>
              <details>
                <summary>{copy.evidenceCompatible}</summary>
                <p>{copy.evidenceCompatibleBody}</p>
              </details>
            </div>
          </div>
        </section>

        <section className="coverage" aria-labelledby="coverage-title">
          <div className="wrap coverage-inner">
            <div>
              <h2 id="coverage-title">{copy.coverageTitle}</h2>
              <p>{copy.coverageBody}</p>
            </div>
            <Link className="text-action" href="/catalog">
              {copy.coverageLink} <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-main">
            <p className="footer-copy">{copy.footerCopy}</p>
            <nav className="footer-links" aria-label="About and policies">
              <Link href="/about">About</Link>
              <Link href="/truth-policy">Truth policy</Link>
              <Link href="/disclosure">Affiliate disclosure</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/wrong-part-prevention">Wrong-part prevention</Link>
              <Link href="/terms">Terms</Link>
            </nav>
          </div>
        </div>
      </footer>

      <dialog
        ref={dialogRef}
        id="number-help"
        aria-labelledby={titleId}
        className="bp-dialog"
      >
        <div className="dialog-topline">
          <span className="dialog-eyebrow">{copy.helpEyebrow}</span>
          <button
            type="button"
            className="close-dialog"
            onClick={closeHelp}
            aria-label="Close number-finding help"
          >
            {copy.helpClose} <span aria-hidden="true">×</span>
          </button>
        </div>
        <h2 id={titleId} tabIndex={-1}>
          {copy.helpTitle}
        </h2>
        <p className="dialog-intro">{copy.helpIntro}</p>
        <div
          className="label-example"
          role="group"
          aria-label="Illustrative label: model ABC12345. This is not a real appliance."
        >
          <span>{copy.helpExampleCaption}</span>
          <strong>
            {copy.helpExampleModelWord} <b>{copy.helpExampleModel}</b>
          </strong>
          <span>{copy.helpExampleSerial}</span>
        </div>
        <div className="help-locations">
          <h3>{copy.helpOnAppliance}</h3>
          <p>{copy.helpOnApplianceBody}</p>
          <h3>{copy.helpOnFilter}</h3>
          <p>{copy.helpOnFilterBody}</p>
        </div>
        <p className="help-caution">{copy.helpCaution}</p>
        <div className="dialog-bottom">
          <Link href="/help">
            {copy.helpMore} <span aria-hidden="true">↗</span>
          </Link>
          <button type="button" className="dialog-secondary" onClick={closeHelp}>
            {copy.helpBack}
          </button>
        </div>
      </dialog>
    </div>
  );
}
