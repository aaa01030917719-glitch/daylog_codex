import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildSubscriptionDiff,
  buildSubscriptionRecordSnapshot,
  createSubscriptionLog,
  requireSubscriptionContext,
  serializeSubscriptionService,
  subscriptionListSelect,
} from "../../_helpers";

export async function POST(
  _req: Request,
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

    const endedAt = existing.endedAt ?? new Date();
    const nextSnapshot = {
      ...buildSubscriptionRecordSnapshot(existing),
      status: "ENDED",
      endedAt,
    };

    const updated = await prisma.subscriptionService.update({
      where: { id: existing.id },
      data: {
        status: "ENDED",
        endedAt,
        updatedById: context.userId,
      },
      select: subscriptionListSelect,
    });

    await createSubscriptionLog({
      serviceId: updated.id,
      workspaceId: context.workspaceId,
      actorId: context.userId,
      actionType: "ENDED",
      changedFields: buildSubscriptionDiff(
        buildSubscriptionRecordSnapshot(existing),
        nextSnapshot
      ),
    });

    return NextResponse.json({ service: serializeSubscriptionService(updated) });
  } catch (error) {
    console.error("[SUBSCRIPTION_END]", error);
    return NextResponse.json(
      { error: "종료 처리에 실패했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
