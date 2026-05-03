import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildSubscriptionDiff,
  buildSubscriptionRecordSnapshot,
  createSubscriptionLog,
  requireSubscriptionContext,
  serializeSubscriptionService,
  subscriptionListSelect,
} from "../../_helpers";
import { isSubscriptionStatusValue } from "@/lib/subscription-services";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const context = await requireSubscriptionContext({ requireManage: true });
  if (!context.ok) {
    return context.response;
  }

  try {
    const body = (await req.json()) as { status?: unknown };
    if (!isSubscriptionStatusValue(body.status)) {
      return NextResponse.json(
        { error: "변경할 상태를 선택해주세요." },
        { status: 400 }
      );
    }

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

    const endedAt = body.status === "ENDED" ? existing.endedAt ?? new Date() : null;
    const nextSnapshot = {
      ...buildSubscriptionRecordSnapshot(existing),
      status: body.status,
      endedAt,
    };

    const updated = await prisma.subscriptionService.update({
      where: { id: existing.id },
      data: {
        status: body.status,
        endedAt,
        updatedById: context.userId,
      },
      select: subscriptionListSelect,
    });

    await createSubscriptionLog({
      serviceId: updated.id,
      workspaceId: context.workspaceId,
      actorId: context.userId,
      actionType: "STATUS_CHANGED",
      changedFields: buildSubscriptionDiff(
        buildSubscriptionRecordSnapshot(existing),
        nextSnapshot
      ),
    });

    return NextResponse.json({ service: serializeSubscriptionService(updated) });
  } catch (error) {
    console.error("[SUBSCRIPTION_STATUS_PATCH]", error);
    return NextResponse.json(
      { error: "상태를 변경하지 못했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
