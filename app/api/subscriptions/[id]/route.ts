import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildSubscriptionDiff,
  buildSubscriptionRecordSnapshot,
  createSubscriptionLog,
  ensureSubscriptionManagerBelongsToWorkspace,
  findWorkspaceSubscription,
  normalizeSubscriptionPayload,
  requireSubscriptionContext,
  serializeSubscriptionDetail,
  serializeSubscriptionService,
  subscriptionListSelect,
} from "../_helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const context = await requireSubscriptionContext();
  if (!context.ok) {
    return context.response;
  }

  const service = await findWorkspaceSubscription(context.workspaceId, params.id);
  if (!service) {
    return NextResponse.json(
      { error: "구독 서비스를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({ service: serializeSubscriptionDetail(service) });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const context = await requireSubscriptionContext({ requireManage: true });
  if (!context.ok) {
    return context.response;
  }

  try {
    const existing = await prisma.subscriptionService.findFirst({
      where: {
        id: params.id,
        workspaceId: context.workspaceId,
        deletedAt: null,
      },
      select: {
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
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "구독 서비스를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const body = (await req.json()) as Record<string, unknown>;
    const normalized = await normalizeSubscriptionPayload({
      body,
      fallback: existing,
    });

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
        ? normalized.data.endedAt ?? existing.endedAt ?? new Date()
        : null;

    const nextSnapshot = {
      ...normalized.data,
      endedAt,
    };
    const changedFields = buildSubscriptionDiff(
      buildSubscriptionRecordSnapshot(existing),
      nextSnapshot
    );

    const updated = await prisma.subscriptionService.update({
      where: { id: existing.id },
      data: {
        ...normalized.data,
        endedAt,
        updatedById: context.userId,
      },
      select: subscriptionListSelect,
    });

    if (Object.keys(changedFields).length > 0) {
      const statusOnlyChange = Object.keys(changedFields).every((fieldName) =>
        ["status", "endedAt"].includes(fieldName)
      );

      await createSubscriptionLog({
        serviceId: updated.id,
        workspaceId: context.workspaceId,
        actorId: context.userId,
        actionType: statusOnlyChange ? "STATUS_CHANGED" : "UPDATED",
        changedFields,
      });
    }

    return NextResponse.json({ service: serializeSubscriptionService(updated) });
  } catch (error) {
    console.error("[SUBSCRIPTION_PATCH]", error);
    return NextResponse.json(
      { error: "구독 서비스를 수정하지 못했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const context = await requireSubscriptionContext({ requireManage: true });
  if (!context.ok) {
    return context.response;
  }

  if (context.role !== "OWNER") {
    return NextResponse.json(
      { error: "삭제는 오너만 처리할 수 있습니다." },
      { status: 403 }
    );
  }

  try {
    const existing = await prisma.subscriptionService.findFirst({
      where: {
        id: params.id,
        workspaceId: context.workspaceId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        deletedAt: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "구독 서비스를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.subscriptionService.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
        updatedById: context.userId,
      },
    });

    await createSubscriptionLog({
      serviceId: existing.id,
      workspaceId: context.workspaceId,
      actorId: context.userId,
      actionType: "DELETED",
      changedFields: {
        deletedAt: { from: null, to: new Date().toISOString() },
      },
    });

    return NextResponse.json({ success: true, id: existing.id });
  } catch (error) {
    console.error("[SUBSCRIPTION_DELETE]", error);
    return NextResponse.json(
      { error: "구독 서비스를 삭제하지 못했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
