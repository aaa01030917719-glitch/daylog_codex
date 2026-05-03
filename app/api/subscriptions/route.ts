import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { type SubscriptionListMeta } from "@/lib/subscription-services";
import {
  buildSubscriptionFacets,
  buildSubscriptionDiff,
  buildSubscriptionRecordSnapshot,
  createSubscriptionLog,
  ensureSubscriptionManagerBelongsToWorkspace,
  normalizeSubscriptionPayload,
  readSubscriptionSearchParams,
  requireSubscriptionContext,
  serializeSubscriptionService,
  subscriptionListSelect,
} from "./_helpers";

export async function GET(req: NextRequest) {
  const context = await requireSubscriptionContext();
  if (!context.ok) {
    return context.response;
  }

  const allServices = await prisma.subscriptionService.findMany({
    where: {
      workspaceId: context.workspaceId,
      deletedAt: null,
    },
    select: subscriptionListSelect,
  });

  const filters = readSubscriptionSearchParams(req.nextUrl.searchParams);
  const serializedAll = allServices.map(serializeSubscriptionService);

  const filteredServices = serializedAll.filter((service) => {
    const matchesSearch =
      !filters.search ||
      service.serviceName.toLowerCase().includes(filters.search.toLowerCase()) ||
      (service.managerName ?? "").toLowerCase().includes(filters.search.toLowerCase()) ||
      (service.purpose ?? "").toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = !filters.status || service.status === filters.status;
    const matchesCategory = !filters.category || service.category === filters.category;
    const matchesBillingCycle =
      !filters.billingCycle || service.billingCycle === filters.billingCycle;
    const matchesManager =
      !filters.managerUserId || service.managerUserId === filters.managerUserId;
    const matchesAlertLevel =
      !filters.alertLevel || service.alertLevel === filters.alertLevel;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesCategory &&
      matchesBillingCycle &&
      matchesManager &&
      matchesAlertLevel
    );
  });

  const metaBase = buildSubscriptionFacets(serializedAll);
  const filteredSummary = buildSubscriptionFacets(filteredServices).summary;
  const meta: SubscriptionListMeta = {
    ...metaBase,
    summary: filteredSummary,
  };

  const services = [...filteredServices].sort((left, right) => {
    if (filters.sort === "COST_DESC") {
      return right.annualCostNormalized - left.annualCostNormalized;
    }

    if (filters.sort === "CREATED_DESC") {
      return (
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime()
      );
    }

    if (filters.sort === "UPDATED_DESC") {
      return (
        new Date(right.updatedAt).getTime() -
        new Date(left.updatedAt).getTime()
      );
    }

    return (
      new Date(left.nextBillingAt).getTime() -
      new Date(right.nextBillingAt).getTime()
    );
  });

  return NextResponse.json({ services, meta });
}

export async function POST(req: NextRequest) {
  const context = await requireSubscriptionContext({ requireManage: true });
  if (!context.ok) {
    return context.response;
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const normalized = await normalizeSubscriptionPayload({ body });

    if (!normalized.ok) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const managerBelongs = await ensureSubscriptionManagerBelongsToWorkspace(
      context.workspaceId,
      normalized.data.managerUserId
    );

    if (!managerBelongs) {
      return NextResponse.json(
        { error: "담당자는 현재 워크스페이스 멤버만 지정할 수 있습니다." },
        { status: 400 }
      );
    }

    const endedAt =
      normalized.data.status === "ENDED"
        ? normalized.data.endedAt ?? new Date()
        : null;

    const created = await prisma.subscriptionService.create({
      data: {
        ...normalized.data,
        endedAt,
        workspaceId: context.workspaceId,
        createdById: context.userId,
        updatedById: context.userId,
      },
      select: subscriptionListSelect,
    });

    await createSubscriptionLog({
      serviceId: created.id,
      workspaceId: context.workspaceId,
      actorId: context.userId,
      actionType: "CREATED",
      changedFields: buildSubscriptionDiff(
        {},
        buildSubscriptionRecordSnapshot({
          ...created,
          status: created.status,
          billingCycle: created.billingCycle,
        })
      ),
    });

    return NextResponse.json(
      { service: serializeSubscriptionService(created) },
      { status: 201 }
    );
  } catch (error) {
    console.error("[SUBSCRIPTION_CREATE]", error);
    return NextResponse.json(
      { error: "구독 서비스를 저장하지 못했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
