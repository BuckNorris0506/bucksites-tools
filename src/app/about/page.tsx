import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import {
  ABOUT_CONTACT,
  ABOUT_FOUNDER,
  ABOUT_HERO,
  ABOUT_HOW_WE_DECIDE,
  ABOUT_HUMANS_AUTOMATION,
  ABOUT_MONEY,
  ABOUT_NOT,
  ABOUT_ORIGIN,
  ABOUT_PAGE_META_DESCRIPTION,
  ABOUT_TRUST_LINKS,
  ABOUT_WHAT_WE_DO,
} from "@/lib/about/about-content-v1";
import { buildAboutPageJsonLdGraphV1 } from "@/lib/about/about-json-ld-v1";
import "@/app/about/about.css";

export const metadata: Metadata = {
  title: "About",
  description: ABOUT_PAGE_META_DESCRIPTION,
};

function FounderIdentity({
  label,
  lines,
}: {
  label: string;
  lines: readonly string[];
}) {
  return (
    <aside className="bp-about__founder-rail" aria-label={label}>
      <p className="bp-about__founder-label">{label}</p>
      <p className="bp-about__founder-name">{lines[0]}</p>
      {lines.slice(1).map((line) => (
        <p key={line} className="bp-about__founder-meta">
          {line}
        </p>
      ))}
    </aside>
  );
}

function InPageLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="bp-about__inpage-link">
      {children}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M12 5v14M5 12l7 7 7-7" />
      </svg>
    </Link>
  );
}

export default function AboutPage() {
  const jsonLd = buildAboutPageJsonLdGraphV1();

  return (
    <>
      <article className="bp-about-shell">
        <div className="bp-about__inner">
          <header id={ABOUT_HERO.id} className="bp-about__hero">
            <div className="bp-about__hero-grid">
              <div>
                <p className="bp-about__eyebrow">{ABOUT_HERO.eyebrow}</p>
                <h1 className="bp-about__h1">{ABOUT_HERO.heading}</h1>
                {ABOUT_HERO.paragraphs.map((p) => (
                  <p key={p} className="bp-about__lead">
                    {p}
                  </p>
                ))}
                <div className="bp-about__hero-links">
                  <InPageLink href={ABOUT_HERO.primaryAction.href}>
                    {ABOUT_HERO.primaryAction.label}
                  </InPageLink>
                  <InPageLink href={ABOUT_HERO.secondaryAction.href}>
                    {ABOUT_HERO.secondaryAction.label}
                  </InPageLink>
                </div>
              </div>
              <FounderIdentity label={ABOUT_HERO.identityLabel} lines={ABOUT_HERO.identity} />
            </div>
          </header>

          <section id={ABOUT_ORIGIN.id} className="bp-about__section" aria-labelledby="about-origin-title">
            <h2 id="about-origin-title" className="bp-about__section-title">
              {ABOUT_ORIGIN.heading}
            </h2>
            <p className="bp-about__byline">{ABOUT_ORIGIN.byline}</p>
            <div className="bp-about__prose">
              {ABOUT_ORIGIN.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>

          <section id={ABOUT_WHAT_WE_DO.id} className="bp-about__section" aria-labelledby="about-what-title">
            <h2 id="about-what-title" className="bp-about__section-title">
              {ABOUT_WHAT_WE_DO.heading}
            </h2>
            <p className="bp-about__intro">{ABOUT_WHAT_WE_DO.intro}</p>
            <div className="bp-about__flow" aria-label="How BuckParts reasons about a lookup">
              {ABOUT_WHAT_WE_DO.flow.map((step) => (
                <span key={step} className="bp-about__flow-step">
                  {step}
                </span>
              ))}
            </div>
            <dl className="bp-about__distinctions">
              {ABOUT_WHAT_WE_DO.distinctions.map((d) => (
                <div key={d.label} className="bp-about__distinction">
                  <dt>{d.label}</dt>
                  <dd>{d.text}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section
            id={ABOUT_HOW_WE_DECIDE.id}
            className="bp-about__section"
            aria-labelledby="about-decide-title"
          >
            <h2 id="about-decide-title" className="bp-about__section-title">
              {ABOUT_HOW_WE_DECIDE.heading}
            </h2>
            <p className="bp-about__intro">{ABOUT_HOW_WE_DECIDE.intro}</p>
            <div className="bp-about__standards">
              {ABOUT_HOW_WE_DECIDE.standards.map((s) => (
                <div key={s.label} className="bp-about__standard">
                  <p className="bp-about__standard-label">{s.label}</p>
                  <p className="bp-about__standard-text">{s.text}</p>
                </div>
              ))}
            </div>
            <div className="bp-about__inline-policies">
              {ABOUT_HOW_WE_DECIDE.policyLinks.map((link) => (
                <Link key={link.href} href={link.href} className="bp-about__text-link">
                  {link.label}
                </Link>
              ))}
            </div>
          </section>

          <section
            id={ABOUT_HUMANS_AUTOMATION.id}
            className="bp-about__section"
            aria-labelledby="about-automation-title"
          >
            <h2 id="about-automation-title" className="bp-about__section-title">
              {ABOUT_HUMANS_AUTOMATION.heading}
            </h2>
            <div className="bp-about__prose">
              {ABOUT_HUMANS_AUTOMATION.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>

          <section id={ABOUT_MONEY.id} className="bp-about__section" aria-labelledby="about-money-title">
            <h2 id="about-money-title" className="bp-about__section-title">
              {ABOUT_MONEY.heading}
            </h2>
            <div className="bp-about__prose">
              {ABOUT_MONEY.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            <div className="bp-about__inline-policies">
              {ABOUT_MONEY.policyLinks.map((link) => (
                <Link key={link.href} href={link.href} className="bp-about__text-link">
                  {link.label}
                </Link>
              ))}
            </div>
          </section>

          <section id={ABOUT_NOT.id} className="bp-about__section" aria-labelledby="about-not-title">
            <h2 id="about-not-title" className="bp-about__section-title">
              {ABOUT_NOT.heading}
            </h2>
            <ul className="bp-about__list">
              {ABOUT_NOT.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section id={ABOUT_FOUNDER.id} className="bp-about__section" aria-labelledby="about-founder-title">
            <h2 id="about-founder-title" className="bp-about__section-title">
              {ABOUT_FOUNDER.heading}
            </h2>
            <p className="bp-about__founder-name">{ABOUT_FOUNDER.identity[0]}</p>
            {ABOUT_FOUNDER.identity.slice(1).map((line) => (
              <p key={line} className="bp-about__founder-meta">
                {line}
              </p>
            ))}
            <div className="bp-about__commitment">
              <p className="bp-about__commitment-label">{ABOUT_FOUNDER.commitmentLabel}</p>
              <p>{ABOUT_FOUNDER.commitment}</p>
            </div>
            <p className="bp-about__attribution">
              {ABOUT_FOUNDER.attribution[0]}
              <br />
              {ABOUT_FOUNDER.attribution[1]}
            </p>
            <p className="bp-about__attribution">
              {ABOUT_FOUNDER.contactLabel}:{" "}
              <a className="bp-about__mailto" href={`mailto:${ABOUT_FOUNDER.email}`}>
                {ABOUT_FOUNDER.email}
              </a>
            </p>
          </section>

          <section id={ABOUT_CONTACT.id} className="bp-about__section" aria-labelledby="about-contact-title">
            <h2 id="about-contact-title" className="bp-about__section-title">
              {ABOUT_CONTACT.heading}
            </h2>
            <p className="bp-about__intro">{ABOUT_CONTACT.intro}</p>
            <div className="bp-about__contact-grid">
              {ABOUT_CONTACT.contacts.map((c) => (
                <div key={c.email} className="bp-about__contact-block">
                  <p className="bp-about__contact-role">{c.role}</p>
                  <p className="bp-about__contact-desc">
                    <a className="bp-about__mailto" href={`mailto:${c.email}`}>
                      {c.email}
                    </a>
                  </p>
                  <p className="bp-about__contact-desc">{c.description}</p>
                </div>
              ))}
            </div>
            <p className="bp-about__commitment-label" style={{ marginTop: "1.75rem" }}>
              {ABOUT_CONTACT.reportLabel}
            </p>
            <ul className="bp-about__list">
              {ABOUT_CONTACT.reports.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section
            id={ABOUT_TRUST_LINKS.id}
            className="bp-about__section"
            aria-labelledby="about-trust-title"
          >
            <h2 id="about-trust-title" className="bp-about__section-title">
              {ABOUT_TRUST_LINKS.heading}
            </h2>
            <p className="bp-about__intro">{ABOUT_TRUST_LINKS.intro}</p>
            <div className="bp-about__policy-rows">
              {ABOUT_TRUST_LINKS.links.map((link) => (
                <Link key={link.href} href={link.href} className="bp-about__policy-row">
                  <p className="bp-about__policy-title">{link.label}</p>
                  <p className="bp-about__policy-desc">{link.description}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </article>
      <JsonLdScript data={jsonLd} />
    </>
  );
}
