import { AP_HOMEOWNER_COWAY_MAX2_HEPA_COPY } from "@/lib/copy/ap-homeowner-coway-max2-hepa-v1";
import { AP_HOMEOWNER_LEVOIT_RF_RAR040_COPY } from "@/lib/copy/ap-homeowner-levoit-rf-rar040-v1";
import { AP_HOMEOWNER_MEDIFY_MA50_RF_COPY } from "@/lib/copy/ap-homeowner-medify-ma50-rf-v1";

export type ApHomeownerFilterPageCopy = {
  eyebrow: string;
  h1: string;
  notSeller: string;
  answerLabel: string;
  /** When set, shown in the answer card and trust bullet instead of the catalog OEM token. */
  answerDisplayCode?: string;
  partNumberPackagingHint: string;
  genuineLine: string;
  primaryCtaLabel: string;
  primaryCtaSrPrefix: string;
  ctaIntro: string;
  ctaOpensLine: string;
  suppress: string;
  modelCheckTitle: string;
  modelCheckBody: string;
  modelCheckWrongModelBody: string;
  differentModel: string;
  compatTitle: string;
  compatBody: string;
  trustTitle: string;
  trustOfficialListingClause: string;
  trustOfficialListingLastCheckLabel: string;
};

const COPY_BY_SLUG: Readonly<Record<string, ApHomeownerFilterPageCopy>> = {
  "coway-max2-hepa": AP_HOMEOWNER_COWAY_MAX2_HEPA_COPY,
  "medify-ma50-rf": AP_HOMEOWNER_MEDIFY_MA50_RF_COPY,
  "levoit-rf-rar040": AP_HOMEOWNER_LEVOIT_RF_RAR040_COPY,
};

export function getApHomeownerFilterPageCopy(slug: string): ApHomeownerFilterPageCopy | null {
  return COPY_BY_SLUG[slug.trim().toLowerCase()] ?? null;
}
