/**
 * Approved About page copy — sourced from BuckParts-About-final/about-content.json
 * and FINAL-PAGE-COPY.md (design package 2026-09-23). Do not paraphrase.
 */

export const ABOUT_FOUNDER_EMAIL = "jared@buckparts.com";
export const ABOUT_GENERAL_EMAIL = "admin@buckparts.com";

export const ABOUT_ORG_DESCRIPTION =
  "Independent replacement-part and replacement-filter intelligence for homeowners, helping identify replacements, establish fit, and find buying paths only when evidence supports them.";

export const ABOUT_PAGE_META_DESCRIPTION =
  "About BuckParts: independent replacement-part intelligence for homeowners. Fit before buying—identity, compatibility, and buying paths are kept separate.";

export const ABOUT_HERO = {
  id: "about",
  eyebrow: "About BuckParts",
  heading: "Replacement parts should not require guessing.",
  paragraphs: [
    "BuckParts.com helps homeowners identify the right replacement part or filter, understand whether it fits, and find a buying path only when the evidence supports one.",
    "BuckParts is independently run. Fit comes before buying.",
  ] as const,
  identityLabel: "Accountable founder",
  identity: ["Jared Buckman", "Founder of BuckParts", "AP Statistics teacher", "Kansas City area"] as const,
  primaryAction: { label: "How we check fit", href: "#how-we-decide" },
  secondaryAction: { label: "Contact", href: "#contact" },
};

export const ABOUT_ORIGIN = {
  id: "origin",
  heading: "Why I built BuckParts",
  byline: "Jared Buckman · Founder of BuckParts",
  paragraphs: [
    "I started BuckParts after ordering a replacement part online that turned out not to fit. The seller had sent exactly what I ordered. The problem was that I had ordered the wrong part for my appliance.",
    "I hadn’t made a careless mistake; I had followed the information I could find and still ended up with the wrong fit.",
    "That experience stuck with me. I wanted a better way to answer the question that actually matters before buying: Will this part fit my exact appliance?",
    "BuckParts grew out of that problem. The goal is simple: help homeowners identify the right replacement, understand why it fits, and avoid buying the wrong part in the first place.",
  ] as const,
};

export const ABOUT_WHAT_WE_DO = {
  id: "what-we-do",
  heading: "What BuckParts actually does",
  intro:
    "Independent replacement-part and replacement-filter intelligence for homeowners: identify the replacement, establish the fit, and show the basis for the answer before a buying decision.",
  flow: [
    "Model / part number",
    "Identify the part",
    "Establish fit",
    "Show evidence",
    "Buying path, if verified",
  ] as const,
  distinctions: [
    {
      label: "Identity is not compatibility.",
      text: "Identifying a part does not, by itself, establish that it fits your appliance.",
    },
    {
      label: "Compatibility is not buying availability.",
      text: "A supported fit does not mean a verified buying path is available.",
    },
    {
      label: "Buying availability is not proof of fit.",
      text: "A retailer listing does not establish compatibility with your exact appliance.",
    },
  ] as const,
};

export const ABOUT_HOW_WE_DECIDE = {
  id: "how-we-decide",
  heading: "How we decide what to say",
  intro: "The answer should follow the evidence—not the other way around.",
  standards: [
    {
      label: "Use exact identifiers.",
      text: "Model and part numbers matter, including meaningful ending letters or digits.",
    },
    {
      label: "Use source evidence.",
      text: "Manufacturer and other source evidence must support the relationship being stated.",
    },
    {
      label: "Handle alternate numbers carefully.",
      text: "Aliases and supersessions need evidence. Similar-looking parts are not automatically compatible.",
    },
    {
      label: "Keep uncertainty visible.",
      text: "A missing answer is better than an invented answer. If fit cannot be established, what is still unknown should remain clear.",
    },
    {
      label: "Check the buying path separately.",
      text: "Retailer-link verification is separate from fit verification.",
    },
  ] as const,
  policyLinks: [
    { label: "Truth Policy", href: "/truth-policy" },
    { label: "Wrong-part prevention", href: "/wrong-part-prevention" },
  ] as const,
};

export const ABOUT_HUMANS_AUTOMATION = {
  id: "humans-automation",
  heading: "Humans + automation",
  paragraphs: [
    "BuckParts uses software and automation to organize evidence, maintain structured compatibility data, identify inconsistencies, and help keep the catalog current.",
    "Automation helps BuckParts organize and check evidence. It does not get permission to invent compatibility.",
  ] as const,
};

export const ABOUT_MONEY = {
  id: "money",
  heading: "How BuckParts makes money",
  paragraphs: [
    "BuckParts may earn a commission from some verified retailer links.",
    "Retailers handle checkout, pricing, inventory, fulfillment, and returns.",
    "Affiliate economics do not determine compatibility. A part should not receive a buying path merely because BuckParts could earn money from the link.",
  ] as const,
  policyLinks: [{ label: "Affiliate Disclosure", href: "/disclosure" }] as const,
};

export const ABOUT_NOT = {
  id: "not",
  heading: "What BuckParts is not",
  items: [
    "Not the manufacturer.",
    "Not a retailer or storefront.",
    "Not a substitute for the exact identifier on your appliance or part.",
    "Not willing to turn uncertainty into certainty just to produce an answer.",
  ] as const,
};

export const ABOUT_FOUNDER = {
  id: "founder",
  heading: "The person behind BuckParts",
  identity: ["Jared Buckman", "Founder of BuckParts", "AP Statistics teacher", "Kansas City area"] as const,
  commitmentLabel: "My commitment",
  commitment:
    "If BuckParts cannot establish the answer, I would rather tell you what is still unknown than send you toward the wrong part.",
  attribution: ["Jared Buckman", "Founder, BuckParts"] as const,
  contactLabel: "Jared’s direct public contact",
  email: ABOUT_FOUNDER_EMAIL,
};

export const ABOUT_CONTACT = {
  id: "contact",
  heading: "Contact / corrections",
  intro: "Found a problem or have a question? Choose the right contact below.",
  contacts: [
    {
      role: "Founder / accountability",
      email: ABOUT_FOUNDER_EMAIL,
      description: "Contact Jared directly about BuckParts and its standards.",
    },
    {
      role: "General questions / corrections / support",
      email: ABOUT_GENERAL_EMAIL,
      description: "For BuckParts site questions, corrections, support, and general feedback.",
    },
  ] as const,
  reportLabel: "Please report",
  reports: [
    "Wrong fit information",
    "Outdated source or evidence",
    "A broken or misleading retailer path",
    "General site feedback",
  ] as const,
};

export const ABOUT_TRUST_LINKS = {
  id: "trust-links",
  heading: "Read the standards behind the answers",
  intro: "These policies are part of how BuckParts works—not just fine print.",
  links: [
    {
      label: "Truth Policy",
      description: "How BuckParts handles evidence and uncertainty.",
      href: "/truth-policy",
    },
    {
      label: "Wrong-part prevention",
      description: "How BuckParts approaches the risk of a wrong-fit purchase.",
      href: "/wrong-part-prevention",
    },
    {
      label: "Affiliate Disclosure",
      description: "How commissions and retailer links are handled.",
      href: "/disclosure",
    },
    {
      label: "Privacy",
      description: "How site information and privacy are handled.",
      href: "/privacy",
    },
  ] as const,
};
