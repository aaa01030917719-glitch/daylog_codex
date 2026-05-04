-- CreateEnum
CREATE TYPE "SubscriptionServiceStatus" AS ENUM ('REVIEW', 'ACTIVE', 'CANCEL_SCHEDULED', 'ENDED');

-- CreateEnum
CREATE TYPE "SubscriptionBillingCycle" AS ENUM ('MONTHLY', 'YEARLY', 'QUARTERLY', 'HALF_YEARLY', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "SubscriptionServiceLogAction" AS ENUM ('CREATED', 'UPDATED', 'STATUS_CHANGED', 'ENDED', 'DELETED');

-- CreateTable
CREATE TABLE "SubscriptionService" (
    "id" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "category" TEXT,
    "planName" TEXT,
    "billingAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "billingCycle" "SubscriptionBillingCycle" NOT NULL,
    "firstPaidAt" TIMESTAMP(3),
    "nextBillingAt" TIMESTAMP(3) NOT NULL,
    "monthlyCostNormalized" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "annualCostNormalized" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "managerUserId" TEXT,
    "teamName" TEXT,
    "purpose" TEXT,
    "status" "SubscriptionServiceStatus" NOT NULL DEFAULT 'REVIEW',
    "cancellationMethod" TEXT,
    "memo" TEXT,
    "endedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "SubscriptionService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionServiceLog" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actionType" "SubscriptionServiceLogAction" NOT NULL,
    "actorId" TEXT NOT NULL,
    "changedFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionServiceLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionService_workspaceId_status_nextBillingAt_idx" ON "SubscriptionService"("workspaceId", "status", "nextBillingAt");

-- CreateIndex
CREATE INDEX "SubscriptionService_workspaceId_billingCycle_createdAt_idx" ON "SubscriptionService"("workspaceId", "billingCycle", "createdAt");

-- CreateIndex
CREATE INDEX "SubscriptionService_workspaceId_managerUserId_updatedAt_idx" ON "SubscriptionService"("workspaceId", "managerUserId", "updatedAt");

-- CreateIndex
CREATE INDEX "SubscriptionService_workspaceId_deletedAt_updatedAt_idx" ON "SubscriptionService"("workspaceId", "deletedAt", "updatedAt");

-- CreateIndex
CREATE INDEX "SubscriptionServiceLog_serviceId_createdAt_idx" ON "SubscriptionServiceLog"("serviceId", "createdAt");

-- CreateIndex
CREATE INDEX "SubscriptionServiceLog_workspaceId_createdAt_idx" ON "SubscriptionServiceLog"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "SubscriptionServiceLog_actorId_createdAt_idx" ON "SubscriptionServiceLog"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "SubscriptionService" ADD CONSTRAINT "SubscriptionService_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionService" ADD CONSTRAINT "SubscriptionService_managerUserId_fkey" FOREIGN KEY ("managerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionService" ADD CONSTRAINT "SubscriptionService_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionService" ADD CONSTRAINT "SubscriptionService_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionServiceLog" ADD CONSTRAINT "SubscriptionServiceLog_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "SubscriptionService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionServiceLog" ADD CONSTRAINT "SubscriptionServiceLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionServiceLog" ADD CONSTRAINT "SubscriptionServiceLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
