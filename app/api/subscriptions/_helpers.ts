import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  buildSubscriptionChangedFields,
  calculateSubscriptionNormalizedCosts,
  findSensitiveSubscriptionInput,
  getSubscriptionAlertLevel,
  isSubscriptionBillingCycleValue,
  isSubscriptionSortValue,
  isSubscriptionStatusValue,
  normalizeNullableSubscriptionText,
  normalizeSubscriptionCurrency,
  normalizeSubscriptionText,
  type SubscriptionAlertLevel,
  type SubscriptionListMeta,
  type SubscriptionServiceDetail,
  type SubscriptionServiceLogSummary,
  type SubscriptionServiceStatusValue,
  type SubscriptionServiceSummary,
  type SubscriptionSortValue,
} from "@/lib/subscription-services";

export const SUBSCRIPTION_MUTABLE_FIELDS = [
  "serviceName",
  "websiteUrl",
  "category",
  "planName",
  "billingAmount",
  "currency",
  "billingCycle",
  "firstPaidAt",
  "nextBillingAt",
  "monthlyCostNormalized",
  "annualCostNormalized",
  "managerUserId",
  "teamName",
  "purpose",
  "status",
  "cancellationMethod",
  "memo",
  "endedAt",
] as const;

type SubscriptionContextResult =
  | { ok: true; userId: string; workspaceId: string; role: "OWNER" | "ADMIN" | "MEMBER" }
  | { ok: false; response: NextResponse };

function parseDate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return { value: null as Date | null, invalid: false };
  }

  if (typeof value !== "string") {
    return { value: null as Date | null, invalid: true };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { value: null as Date | null, invalid: false };
  }

  const parsed = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00` : trimmed
  );

  if (Number.isNaN(parsed.getTime())) {
    return { value: null as Date | null, invalid: true };
  }

  return { value: parsed, invalid: false };
}

function parseBillingAmount(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeWebsiteUrl(value: unknown) {
  const text = normalizeNullableSubscriptionText(value);
  if (!text) {
    return { value: null as string | null, invalid: false };
  }

  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { value: null as string | null, invalid: true };
    }
    return { value: url.toString(), invalid: false };
  } catch {
    return { value: null as string | null, invalid: true };
  }
}

export async function requireSubscriptionContext(options?: {
  allowReadOnly?: boolean;
  requireManage?: boolean;
}): Promise<SubscriptionContextResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }),
    };
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId: session.user.id,
    },
    select: {
      workspaceId: true,
      role: true,
    },
  });

  if (!membership?.workspaceId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "워크스페이스 정보를 찾을 수 없습니다." },
        { status: 403 }
      ),
    };
  }

  const canManage = membership.role === "OWNER" || membership.role === "ADMIN";
  if (options?.requireManage && !canManage) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "관리 권한이 있는 구성원만 처리할 수 있습니다." },
        { status: 403 }
      ),
    };
  }

  if (!options?.allowReadOnly && !canManage) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "구독 서비스 관리는 관리자 이상만 접근할 수 있습니다." },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    userId: session.user.id,
    workspaceId: membership.workspaceId,
    role: membership.role,
  };
}

export async function ensureSubscriptionManagerBelongsToWorkspace(
  workspaceId: string,
  managerUserId: string | null
) {
  if (!managerUserId) {
    return true;
  }

  const member = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: managerUserId,
    },
    select: { id: true },
  });

  return Boolean(member);
}

export async function findWorkspaceSubscription(
  workspaceId: string,
  id: string
) {
  return prisma.subscriptionService.findFirst({
    where: {
      id,
      workspaceId,
      deletedAt: null,
    },
    select: subscriptionDetailSelect,
  });
}

export const subscriptionListSelect = {
  id: true,
  serviceName: true,
  websiteUrl: true,
  category: true,
  planName: true,
  billingAmount: true,
  currency: true,
  billingCycle: true,
  firstPaidAt: true,
  nextBillingAt: true,
  monthlyCostNormalized: true,
  annualCostNormalized: true,
  managerUserId: true,
  teamName: true,
  purpose: true,
  status: true,
  cancellationMethod: true,
  memo: true,
  endedAt: true,
  deletedAt: true,
  createdById: true,
  updatedById: true,
  createdAt: true,
  updatedAt: true,
  managerUser: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
    },
  },
  updatedBy: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export const subscriptionDetailSelect = {
  ...subscriptionListSelect,
  logs: {
    orderBy: { createdAt: "desc" as const },
    take: 20,
    select: {
      id: true,
      actionType: true,
      actorId: true,
      changedFields: true,
      createdAt: true,
      actor: {
        select: {
          name: true,
        },
      },
    },
  },
} as const;

export function serializeSubscriptionLog(log: {
  id: string;
  actionType: string;
  actorId: string;
  changedFields: unknown;
  createdAt: Date;
  actor: { name: string | null };
}): SubscriptionServiceLogSummary {
  return {
    id: log.id,
    actionType: log.actionType as SubscriptionServiceLogSummary["actionType"],
    actorId: log.actorId,
    actorName: log.actor.name ?? "이름 없음",
    changedFields:
      log.changedFields && typeof log.changedFields === "object"
        ? (log.changedFields as Record<string, unknown>)
        : null,
    createdAt: log.createdAt.toISOString(),
  };
}

export function serializeSubscriptionService(service: {
  id: string;
  serviceName: string;
  websiteUrl: string | null;
  category: string | null;
  planName: string | null;
  billingAmount: number;
  currency: string;
  billingCycle: string;
  firstPaidAt: Date | null;
  nextBillingAt: Date;
  monthlyCostNormalized: number;
  annualCostNormalized: number;
  managerUserId: string | null;
  teamName: string | null;
  purpose: string | null;
  status: string;
  cancellationMethod: string | null;
  memo: string | null;
  endedAt: Date | null;
  deletedAt: Date | null;
  createdById: string;
  updatedById: string;
  createdAt: Date;
  updatedAt: Date;
  managerUser: { id: string; name: string | null; email: string } | null;
  createdBy: { id: string; name: string | null };
  updatedBy: { id: string; name: string | null };
}): SubscriptionServiceSummary {
  return {
    id: service.id,
    serviceName: service.serviceName,
    websiteUrl: service.websiteUrl,
    category: service.category,
    planName: service.planName,
    billingAmount: service.billingAmount,
    currency: service.currency,
    billingCycle: service.billingCycle as SubscriptionServiceSummary["billingCycle"],
    firstPaidAt: service.firstPaidAt?.toISOString() ?? null,
    nextBillingAt: service.nextBillingAt.toISOString(),
    monthlyCostNormalized: service.monthlyCostNormalized,
    annualCostNormalized: service.annualCostNormalized,
    managerUserId: service.managerUserId,
    managerName: service.managerUser?.name ?? null,
    teamName: service.teamName,
    purpose: service.purpose,
    status: service.status as SubscriptionServiceStatusValue,
    cancellationMethod: service.cancellationMethod,
    memo: service.memo,
    endedAt: service.endedAt?.toISOString() ?? null,
    deletedAt: service.deletedAt?.toISOString() ?? null,
    createdById: service.createdById,
    createdByName: service.createdBy.name ?? null,
    updatedById: service.updatedById,
    updatedByName: service.updatedBy.name ?? null,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
    alertLevel: getSubscriptionAlertLevel(service.nextBillingAt, service.status as SubscriptionServiceStatusValue),
  };
}

export function serializeSubscriptionDetail(service: {
  logs: Array<{
    id: string;
    actionType: string;
    actorId: string;
    changedFields: unknown;
    createdAt: Date;
    actor: { name: string | null };
  }>;
} & Parameters<typeof serializeSubscriptionService>[0]): SubscriptionServiceDetail {
  return {
    ...serializeSubscriptionService(service),
    logs: service.logs.map(serializeSubscriptionLog),
  };
}

export function buildSubscriptionFacets(
  services: SubscriptionServiceSummary[]
): SubscriptionListMeta {
  const categories = new Map<string, string>();
  const managers = new Map<string, string>();

  for (const service of services) {
    if (service.category) {
      categories.set(service.category, service.category);
    }

    if (service.managerUserId) {
      managers.set(service.managerUserId, service.managerName ?? "담당자 없음");
    }
  }

  const urgentCount = services.filter(
    (service) => service.alertLevel === "overdue" || service.alertLevel === "urgent"
  ).length;
  const activeServices = services.filter((service) => service.status === "ACTIVE");

  return {
    categories: Array.from(categories.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label, "ko")),
    managers: Array.from(managers.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label, "ko")),
    summary: {
      totalCount: services.length,
      activeCount: activeServices.length,
      monthlyCostTotal: Math.round(
        services.reduce((sum, service) => sum + service.monthlyCostNormalized, 0) * 100
      ) / 100,
      annualCostTotal: Math.round(
        services.reduce((sum, service) => sum + service.annualCostNormalized, 0) * 100
      ) / 100,
      urgentCount,
    },
  };
}

export function sortSubscriptionServices(
  services: SubscriptionServiceSummary[],
  sort: SubscriptionSortValue
) {
  const next = [...services];

  next.sort((left, right) => {
    if (sort === "COST_DESC") {
      return right.annualCostNormalized - left.annualCostNormalized;
    }

    if (sort === "CREATED_DESC") {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    }

    if (sort === "UPDATED_DESC") {
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    }

    const dateDiff =
      new Date(left.nextBillingAt).getTime() - new Date(right.nextBillingAt).getTime();
    if (dateDiff !== 0) {
      return dateDiff;
    }

    const alertPriority: Record<SubscriptionAlertLevel, number> = {
      overdue: 0,
      urgent: 1,
      warning: 2,
      normal: 3,
    };

    return alertPriority[left.alertLevel] - alertPriority[right.alertLevel];
  });

  return next;
}

export function readSubscriptionSearchParams(searchParams: URLSearchParams) {
  const sort = isSubscriptionSortValue(searchParams.get("sort"))
    ? (searchParams.get("sort") as SubscriptionSortValue)
    : "NEXT_BILLING_ASC";
  const status = isSubscriptionStatusValue(searchParams.get("status"))
    ? (searchParams.get("status") as SubscriptionServiceStatusValue)
    : null;
  const billingCycle = isSubscriptionBillingCycleValue(searchParams.get("billingCycle"))
    ? searchParams.get("billingCycle")
    : null;
  const alertLevel =
    searchParams.get("alertLevel") &&
    ["overdue", "urgent", "warning", "normal"].includes(
      searchParams.get("alertLevel") as string
    )
      ? (searchParams.get("alertLevel") as SubscriptionAlertLevel)
      : null;

  return {
    search: normalizeSubscriptionText(searchParams.get("search")),
    status,
    category: normalizeSubscriptionText(searchParams.get("category")) || null,
    billingCycle: billingCycle as SubscriptionServiceSummary["billingCycle"] | null,
    managerUserId:
      normalizeSubscriptionText(searchParams.get("managerUserId")) || null,
    alertLevel,
    sort,
  };
}

export async function normalizeSubscriptionPayload(params: {
  body: Record<string, unknown>;
  fallback?: {
    serviceName: string;
    websiteUrl: string | null;
    category: string | null;
    planName: string | null;
    billingAmount: number;
    currency: string;
    billingCycle: SubscriptionServiceSummary["billingCycle"];
    firstPaidAt: Date | null;
    nextBillingAt: Date;
    managerUserId: string | null;
    teamName: string | null;
    purpose: string | null;
    status: SubscriptionServiceStatusValue;
    cancellationMethod: string | null;
    memo: string | null;
    endedAt: Date | null;
  };
}) {
  const source = params.body;
  const fallback = params.fallback;

  const serviceName = normalizeSubscriptionText(
    source.serviceName ?? fallback?.serviceName
  );
  const websiteUrlResult = normalizeWebsiteUrl(
    source.websiteUrl ?? fallback?.websiteUrl ?? null
  );
  const category = normalizeNullableSubscriptionText(
    source.category ?? fallback?.category ?? null
  );
  const planName = normalizeNullableSubscriptionText(
    source.planName ?? fallback?.planName ?? null
  );
  const billingAmount = parseBillingAmount(
    source.billingAmount ?? fallback?.billingAmount
  );
  const currency = normalizeSubscriptionCurrency(
    source.currency ?? fallback?.currency
  );
  const billingCycle = source.billingCycle ?? fallback?.billingCycle;
  const firstPaidAtResult = parseDate(
    source.firstPaidAt ??
      (fallback?.firstPaidAt ? fallback.firstPaidAt.toISOString() : null)
  );
  const nextBillingAtResult = parseDate(
    source.nextBillingAt ??
      (fallback?.nextBillingAt ? fallback.nextBillingAt.toISOString() : null)
  );
  const managerUserId =
    normalizeSubscriptionText(source.managerUserId ?? fallback?.managerUserId ?? "") ||
    null;
  const teamName = normalizeNullableSubscriptionText(
    source.teamName ?? fallback?.teamName ?? null
  );
  const purpose = normalizeNullableSubscriptionText(
    source.purpose ?? fallback?.purpose ?? null
  );
  const status = source.status ?? fallback?.status;
  const cancellationMethod = normalizeNullableSubscriptionText(
    source.cancellationMethod ?? fallback?.cancellationMethod ?? null
  );
  const memo = normalizeNullableSubscriptionText(
    source.memo ?? fallback?.memo ?? null
  );
  const endedAtResult = parseDate(
    source.endedAt ??
      (fallback?.endedAt ? fallback.endedAt.toISOString() : null)
  );

  if (!serviceName) {
    return { ok: false as const, error: "서비스명을 입력해주세요." };
  }

  if (websiteUrlResult.invalid) {
    return { ok: false as const, error: "웹사이트 주소 형식을 다시 확인해주세요." };
  }

  if (billingAmount === null || billingAmount <= 0) {
    return { ok: false as const, error: "결제 금액을 입력해주세요." };
  }

  if (!currency) {
    return { ok: false as const, error: "통화를 입력해주세요." };
  }

  if (!isSubscriptionBillingCycleValue(billingCycle)) {
    return { ok: false as const, error: "결제 주기를 선택해주세요." };
  }

  if (firstPaidAtResult.invalid) {
    return { ok: false as const, error: "첫 결제일 형식을 다시 확인해주세요." };
  }

  if (nextBillingAtResult.invalid || !nextBillingAtResult.value) {
    return { ok: false as const, error: "다음 결제일을 선택해주세요." };
  }

  if (!isSubscriptionStatusValue(status)) {
    return { ok: false as const, error: "상태를 선택해주세요." };
  }

  if (endedAtResult.invalid) {
    return { ok: false as const, error: "종료일 형식을 다시 확인해주세요." };
  }

  const sensitiveKeyword = findSensitiveSubscriptionInput({
    purpose,
    cancellationMethod,
    memo,
  });

  if (sensitiveKeyword) {
    return {
      ok: false as const,
      error:
        "민감한 인증정보나 결제수단 정보는 저장할 수 없습니다. 메모와 종료 방법을 다시 확인해주세요.",
    };
  }

  const normalizedCosts = calculateSubscriptionNormalizedCosts(
    billingAmount,
    billingCycle
  );

  return {
    ok: true as const,
    data: {
      serviceName,
      websiteUrl: websiteUrlResult.value,
      category,
      planName,
      billingAmount,
      currency,
      billingCycle,
      firstPaidAt: firstPaidAtResult.value,
      nextBillingAt: nextBillingAtResult.value,
      monthlyCostNormalized: normalizedCosts.monthlyCostNormalized,
      annualCostNormalized: normalizedCosts.annualCostNormalized,
      managerUserId,
      teamName,
      purpose,
      status,
      cancellationMethod,
      memo,
      endedAt: endedAtResult.value,
    },
  };
}

export function buildSubscriptionRecordSnapshot(record: {
  serviceName: string;
  websiteUrl: string | null;
  category: string | null;
  planName: string | null;
  billingAmount: number;
  currency: string;
  billingCycle: string;
  firstPaidAt: Date | null;
  nextBillingAt: Date;
  monthlyCostNormalized: number;
  annualCostNormalized: number;
  managerUserId: string | null;
  teamName: string | null;
  purpose: string | null;
  status: string;
  cancellationMethod: string | null;
  memo: string | null;
  endedAt: Date | null;
}) {
  return {
    serviceName: record.serviceName,
    websiteUrl: record.websiteUrl,
    category: record.category,
    planName: record.planName,
    billingAmount: record.billingAmount,
    currency: record.currency,
    billingCycle: record.billingCycle,
    firstPaidAt: record.firstPaidAt,
    nextBillingAt: record.nextBillingAt,
    monthlyCostNormalized: record.monthlyCostNormalized,
    annualCostNormalized: record.annualCostNormalized,
    managerUserId: record.managerUserId,
    teamName: record.teamName,
    purpose: record.purpose,
    status: record.status,
    cancellationMethod: record.cancellationMethod,
    memo: record.memo,
    endedAt: record.endedAt,
  };
}

export async function createSubscriptionLog(params: {
  serviceId: string;
  workspaceId: string;
  actorId: string;
  actionType: SubscriptionServiceLogSummary["actionType"];
  changedFields: Record<string, unknown> | null;
}) {
  await prisma.subscriptionServiceLog.create({
    data: {
      serviceId: params.serviceId,
      workspaceId: params.workspaceId,
      actorId: params.actorId,
      actionType: params.actionType,
      changedFields: params.changedFields
        ? (params.changedFields as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });
}

export function buildSubscriptionDiff(
  beforeValue: Record<string, unknown>,
  afterValue: Record<string, unknown>
) {
  return buildSubscriptionChangedFields(
    beforeValue,
    afterValue,
    [...SUBSCRIPTION_MUTABLE_FIELDS]
  );
}
