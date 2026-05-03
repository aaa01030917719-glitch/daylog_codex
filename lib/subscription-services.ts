export const SUBSCRIPTION_STATUS_VALUES = [
  "REVIEW",
  "ACTIVE",
  "CANCEL_SCHEDULED",
  "ENDED",
] as const;

export const SUBSCRIPTION_BILLING_CYCLE_VALUES = [
  "MONTHLY",
  "YEARLY",
  "QUARTERLY",
  "HALF_YEARLY",
  "ONE_TIME",
] as const;

export const SUBSCRIPTION_LOG_ACTION_VALUES = [
  "CREATED",
  "UPDATED",
  "STATUS_CHANGED",
  "ENDED",
  "DELETED",
] as const;

export const SUBSCRIPTION_SORT_VALUES = [
  "NEXT_BILLING_ASC",
  "COST_DESC",
  "CREATED_DESC",
  "UPDATED_DESC",
] as const;

export const SUBSCRIPTION_ALERT_LEVEL_VALUES = [
  "overdue",
  "urgent",
  "warning",
  "normal",
] as const;

export type SubscriptionServiceStatusValue =
  (typeof SUBSCRIPTION_STATUS_VALUES)[number];
export type SubscriptionBillingCycleValue =
  (typeof SUBSCRIPTION_BILLING_CYCLE_VALUES)[number];
export type SubscriptionServiceLogActionValue =
  (typeof SUBSCRIPTION_LOG_ACTION_VALUES)[number];
export type SubscriptionSortValue = (typeof SUBSCRIPTION_SORT_VALUES)[number];
export type SubscriptionAlertLevel =
  (typeof SUBSCRIPTION_ALERT_LEVEL_VALUES)[number];

export interface SubscriptionServiceLogSummary {
  id: string;
  actionType: SubscriptionServiceLogActionValue;
  actorId: string;
  actorName: string;
  changedFields: Record<string, unknown> | null;
  createdAt: string;
}

export interface SubscriptionServiceSummary {
  id: string;
  serviceName: string;
  websiteUrl: string | null;
  category: string | null;
  planName: string | null;
  billingAmount: number;
  currency: string;
  billingCycle: SubscriptionBillingCycleValue;
  firstPaidAt: string | null;
  nextBillingAt: string;
  monthlyCostNormalized: number;
  annualCostNormalized: number;
  managerUserId: string | null;
  managerName: string | null;
  teamName: string | null;
  purpose: string | null;
  status: SubscriptionServiceStatusValue;
  cancellationMethod: string | null;
  memo: string | null;
  endedAt: string | null;
  deletedAt: string | null;
  createdById: string;
  createdByName: string | null;
  updatedById: string;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string;
  alertLevel: SubscriptionAlertLevel;
}

export interface SubscriptionServiceDetail extends SubscriptionServiceSummary {
  logs: SubscriptionServiceLogSummary[];
}

export interface SubscriptionFacetOption {
  value: string;
  label: string;
}

export interface SubscriptionListMeta {
  categories: SubscriptionFacetOption[];
  managers: SubscriptionFacetOption[];
  summary: {
    totalCount: number;
    activeCount: number;
    monthlyCostTotal: number;
    annualCostTotal: number;
    urgentCount: number;
  };
}

export interface SubscriptionListResponse {
  services: SubscriptionServiceSummary[];
  meta: SubscriptionListMeta;
}

export const SUBSCRIPTION_STATUS_LABELS: Record<
  SubscriptionServiceStatusValue,
  string
> = {
  REVIEW: "검토 중",
  ACTIVE: "사용 중",
  CANCEL_SCHEDULED: "해지 예정",
  ENDED: "종료",
};

export const SUBSCRIPTION_BILLING_CYCLE_LABELS: Record<
  SubscriptionBillingCycleValue,
  string
> = {
  MONTHLY: "월간",
  YEARLY: "연간",
  QUARTERLY: "분기",
  HALF_YEARLY: "반기",
  ONE_TIME: "일회성",
};

export const SUBSCRIPTION_LOG_ACTION_LABELS: Record<
  SubscriptionServiceLogActionValue,
  string
> = {
  CREATED: "등록",
  UPDATED: "수정",
  STATUS_CHANGED: "상태 변경",
  ENDED: "종료 처리",
  DELETED: "삭제",
};

export const SUBSCRIPTION_SORT_LABELS: Record<SubscriptionSortValue, string> = {
  NEXT_BILLING_ASC: "다음 결제일 빠른 순",
  COST_DESC: "비용 높은 순",
  CREATED_DESC: "최근 등록순",
  UPDATED_DESC: "최근 수정순",
};

export const SUBSCRIPTION_ALERT_LEVEL_LABELS: Record<
  SubscriptionAlertLevel,
  string
> = {
  overdue: "확인 필요",
  urgent: "3일 이내",
  warning: "7일 이내",
  normal: "여유 있음",
};

const SENSITIVE_TEXT_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "password", pattern: /\bpassword\b/i },
  { label: "passwd", pattern: /\bpasswd\b/i },
  { label: "api key", pattern: /\bapi[\s_-]*key\b/i },
  { label: "secret", pattern: /\bsecret\b/i },
  { label: "token", pattern: /\btoken\b/i },
  { label: "card number", pattern: /\bcard[\s_-]*number\b/i },
  { label: "cvc", pattern: /\bcvc\b/i },
  { label: "계좌번호", pattern: /계좌번호/i },
  { label: "비밀번호", pattern: /비밀번호/i },
  { label: "카드번호", pattern: /카드번호/i },
  { label: "보안코드", pattern: /보안코드/i },
];

export function isSubscriptionStatusValue(
  value: unknown
): value is SubscriptionServiceStatusValue {
  return (
    typeof value === "string" &&
    SUBSCRIPTION_STATUS_VALUES.includes(
      value as SubscriptionServiceStatusValue
    )
  );
}

export function isSubscriptionBillingCycleValue(
  value: unknown
): value is SubscriptionBillingCycleValue {
  return (
    typeof value === "string" &&
    SUBSCRIPTION_BILLING_CYCLE_VALUES.includes(
      value as SubscriptionBillingCycleValue
    )
  );
}

export function isSubscriptionSortValue(
  value: unknown
): value is SubscriptionSortValue {
  return (
    typeof value === "string" &&
    SUBSCRIPTION_SORT_VALUES.includes(value as SubscriptionSortValue)
  );
}

export function normalizeSubscriptionText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeNullableSubscriptionText(value: unknown) {
  const text = normalizeSubscriptionText(value);
  return text.length > 0 ? text : null;
}

export function normalizeSubscriptionCurrency(value: unknown) {
  return normalizeSubscriptionText(value).toUpperCase();
}

export function roundSubscriptionCost(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateSubscriptionNormalizedCosts(
  billingAmount: number,
  billingCycle: SubscriptionBillingCycleValue
) {
  if (!Number.isFinite(billingAmount) || billingAmount <= 0) {
    return { monthlyCostNormalized: 0, annualCostNormalized: 0 };
  }

  if (billingCycle === "MONTHLY") {
    return {
      monthlyCostNormalized: roundSubscriptionCost(billingAmount),
      annualCostNormalized: roundSubscriptionCost(billingAmount * 12),
    };
  }

  if (billingCycle === "YEARLY") {
    return {
      monthlyCostNormalized: roundSubscriptionCost(billingAmount / 12),
      annualCostNormalized: roundSubscriptionCost(billingAmount),
    };
  }

  if (billingCycle === "QUARTERLY") {
    return {
      monthlyCostNormalized: roundSubscriptionCost(billingAmount / 3),
      annualCostNormalized: roundSubscriptionCost(billingAmount * 4),
    };
  }

  if (billingCycle === "HALF_YEARLY") {
    return {
      monthlyCostNormalized: roundSubscriptionCost(billingAmount / 6),
      annualCostNormalized: roundSubscriptionCost(billingAmount * 2),
    };
  }

  return {
    monthlyCostNormalized: 0,
    annualCostNormalized: 0,
  };
}

export function getSubscriptionAlertLevel(
  nextBillingAt: string | Date,
  status?: SubscriptionServiceStatusValue | null,
  now: Date = new Date()
): SubscriptionAlertLevel {
  if (status === "ENDED") {
    return "normal";
  }

  const date = new Date(nextBillingAt);
  if (Number.isNaN(date.getTime())) {
    return "normal";
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((target.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) {
    return "overdue";
  }

  if (diffDays <= 3) {
    return "urgent";
  }

  if (diffDays <= 7) {
    return "warning";
  }

  return "normal";
}

export function getSubscriptionAlertClassName(level: SubscriptionAlertLevel) {
  if (level === "overdue") {
    return "status-badge status-badge--danger";
  }

  if (level === "urgent") {
    return "status-badge status-badge--warning";
  }

  if (level === "warning") {
    return "status-badge status-badge--accent";
  }

  return "status-badge status-badge--neutral";
}

export function findSensitiveSubscriptionInput(
  fields: Record<string, string | null | undefined>
) {
  for (const value of Object.values(fields)) {
    if (!value) {
      continue;
    }

    for (const candidate of SENSITIVE_TEXT_PATTERNS) {
      if (candidate.pattern.test(value)) {
        return candidate.label;
      }
    }
  }

  return null;
}

function normalizeDiffValue(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "number") {
    return roundSubscriptionCost(value);
  }

  return value ?? null;
}

export function buildSubscriptionChangedFields(
  previousValue: Record<string, unknown>,
  nextValue: Record<string, unknown>,
  fieldNames: string[]
) {
  const changedFields: Record<string, { from: unknown; to: unknown }> = {};

  for (const fieldName of fieldNames) {
    const before = normalizeDiffValue(previousValue[fieldName]);
    const after = normalizeDiffValue(nextValue[fieldName]);

    if (JSON.stringify(before) === JSON.stringify(after)) {
      continue;
    }

    changedFields[fieldName] = {
      from: before,
      to: after,
    };
  }

  return changedFields;
}

export function formatDateInputValue(value: string | Date | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
