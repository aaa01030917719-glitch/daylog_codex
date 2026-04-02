-- ================================================================
-- Daylog workspace settings columns
-- Apply manually in Supabase SQL Editor, then run `npx prisma generate`
-- ================================================================

ALTER TABLE "Workspace"
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "industry" TEXT,
  ADD COLUMN IF NOT EXISTS "teamSize" TEXT,
  ADD COLUMN IF NOT EXISTS "themeColor" TEXT,
  ADD COLUMN IF NOT EXISTS "lateGraceMinutes" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "checkoutConfirmPopup" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "showAttendanceMemo" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "excludeOwnerAttendance" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyCheckoutMissed" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyNextDayMissing" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "checkoutAlertTime" TEXT NOT NULL DEFAULT '18:10',
  ADD COLUMN IF NOT EXISTS "missingAlertTime" TEXT NOT NULL DEFAULT '09:00';

DO $$
BEGIN
  FOR i IN 0..6 LOOP
    EXECUTE format('ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "weekdayCheckIn_%s" TEXT', i);
    EXECUTE format('ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "weekdayCheckOut_%s" TEXT', i);
    EXECUTE format(
      'ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "weekdayOff_%s" BOOLEAN NOT NULL DEFAULT %s',
      i,
      CASE WHEN i >= 5 THEN 'true' ELSE 'false' END
    );
  END LOOP;
END $$;

ALTER TABLE "Workspace"
  ADD COLUMN IF NOT EXISTS "notif_confirm_request" TEXT NOT NULL DEFAULT 'push',
  ADD COLUMN IF NOT EXISTS "notif_deadline_d1" TEXT NOT NULL DEFAULT 'push',
  ADD COLUMN IF NOT EXISTS "notif_budget_over" TEXT NOT NULL DEFAULT 'push',
  ADD COLUMN IF NOT EXISTS "notif_confirm_result" TEXT NOT NULL DEFAULT 'badge',
  ADD COLUMN IF NOT EXISTS "notif_mention" TEXT NOT NULL DEFAULT 'badge',
  ADD COLUMN IF NOT EXISTS "notif_notice_new" TEXT NOT NULL DEFAULT 'badge',
  ADD COLUMN IF NOT EXISTS "notif_idea_like" TEXT NOT NULL DEFAULT 'off',
  ADD COLUMN IF NOT EXISTS "notif_notice_read" TEXT NOT NULL DEFAULT 'off';

CREATE TABLE IF NOT EXISTS "InviteToken" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "memo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "workspaceId" TEXT NOT NULL,
  CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InviteToken_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "InviteToken_token_key" ON "InviteToken"("token");
CREATE INDEX IF NOT EXISTS "InviteToken_workspaceId_createdAt_idx" ON "InviteToken"("workspaceId", "createdAt");
