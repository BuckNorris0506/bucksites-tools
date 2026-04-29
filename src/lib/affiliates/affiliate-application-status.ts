export const AFFILIATE_APPLICATION_STATUSES = {
  NOT_STARTED: "NOT_STARTED",
  DRAFTING: "DRAFTING",
  SUBMITTED: "SUBMITTED",
  IN_REVIEW: "IN_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  REAPPLY_REQUIRED: "REAPPLY_REQUIRED",
  PAUSED_OR_INACTIVE: "PAUSED_OR_INACTIVE",
} as const;

export type AffiliateApplicationStatus =
  (typeof AFFILIATE_APPLICATION_STATUSES)[keyof typeof AFFILIATE_APPLICATION_STATUSES];

export type AffiliateApplicationRecord = {
  id: string;
  network: string;
  retailer: string | null;
  programUrl: string | null;
  status: AffiliateApplicationStatus;
  submittedAt: string | null;
  lastStatusAt: string | null;
  decisionAt: string | null;
  rejectionReason: string | null;
  nextAction: string | null;
  nextActionDueAt: string | null;
  notes: string | null;
  tagVerified: boolean | null;
  tagVerifiedAt: string | null;
  tagValue: string | null;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isAffiliateApplicationStatus(value: unknown): value is AffiliateApplicationStatus {
  return (
    typeof value === "string" &&
    Object.values(AFFILIATE_APPLICATION_STATUSES).includes(
      value as AffiliateApplicationStatus,
    )
  );
}

function isIsoDateString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!value.includes("T")) return false;
  return !Number.isNaN(Date.parse(value));
}

function isNullableIsoDateString(value: unknown): value is string | null {
  return value === null || isIsoDateString(value);
}

function isNullableBoolean(value: unknown): value is boolean | null {
  return value === null || typeof value === "boolean";
}

function isNullableNonEmptyString(value: unknown): value is string | null {
  return value === null || isNonEmptyString(value);
}

export function isValidAffiliateApplicationRecord(
  input: unknown,
): input is AffiliateApplicationRecord {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const value = input as Record<string, unknown>;

  if (!isNonEmptyString(value.id)) return false;
  if (!isNonEmptyString(value.network)) return false;
  if (!isNullableString(value.retailer)) return false;
  if (!isNullableString(value.programUrl)) return false;
  if (!isAffiliateApplicationStatus(value.status)) return false;
  if (!isNullableIsoDateString(value.submittedAt)) return false;
  if (!isNullableIsoDateString(value.lastStatusAt)) return false;
  if (!isNullableIsoDateString(value.decisionAt)) return false;
  if (!isNullableString(value.rejectionReason)) return false;
  if (!isNullableString(value.nextAction)) return false;
  if (!isNullableIsoDateString(value.nextActionDueAt)) return false;
  if (!isNullableString(value.notes)) return false;
  if (!isNullableBoolean(value.tagVerified)) return false;
  if (!isNullableIsoDateString(value.tagVerifiedAt)) return false;
  if (!isNullableNonEmptyString(value.tagValue)) return false;

  return true;
}
