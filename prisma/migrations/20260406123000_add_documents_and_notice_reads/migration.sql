ALTER TABLE "WorkspaceMember"
ADD COLUMN IF NOT EXISTS "annualLeave" INTEGER NOT NULL DEFAULT 12;

ALTER TABLE "Notice"
ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT '공지',
ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS "target" TEXT[] NOT NULL DEFAULT ARRAY['전체'],
ADD COLUMN IF NOT EXISTS "requireReadConfirm" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'NotificationType'
      AND e.enumlabel = 'NOTICE_POSTED'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'NOTICE_POSTED';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "NoticeRead" (
  "id" TEXT NOT NULL,
  "noticeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NoticeRead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NoticeRead_noticeId_userId_key"
ON "NoticeRead"("noticeId", "userId");

CREATE INDEX IF NOT EXISTS "NoticeRead_userId_readAt_idx"
ON "NoticeRead"("userId", "readAt");

ALTER TABLE "NoticeRead"
ADD CONSTRAINT "NoticeRead_noticeId_fkey"
FOREIGN KEY ("noticeId") REFERENCES "Notice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NoticeRead"
ADD CONSTRAINT "NoticeRead_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "Document" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "halfDayPeriod" TEXT,
  "reason" TEXT NOT NULL DEFAULT '',
  "amount" INTEGER,
  "costType" TEXT,
  "attachmentName" TEXT,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "workspaceId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "approvalId" TEXT,
  "ccUserId" TEXT,

  CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Document_approvalId_key"
ON "Document"("approvalId");

CREATE INDEX IF NOT EXISTS "Document_workspaceId_createdAt_idx"
ON "Document"("workspaceId", "createdAt");

CREATE INDEX IF NOT EXISTS "Document_authorId_createdAt_idx"
ON "Document"("authorId", "createdAt");

CREATE INDEX IF NOT EXISTS "Document_status_createdAt_idx"
ON "Document"("status", "createdAt");

ALTER TABLE "Document"
ADD CONSTRAINT "Document_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Document"
ADD CONSTRAINT "Document_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Document"
ADD CONSTRAINT "Document_approvalId_fkey"
FOREIGN KEY ("approvalId") REFERENCES "Approval"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Document"
ADD CONSTRAINT "Document_ccUserId_fkey"
FOREIGN KEY ("ccUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
