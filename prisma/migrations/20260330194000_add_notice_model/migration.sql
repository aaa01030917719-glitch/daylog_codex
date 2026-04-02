CREATE TYPE "NoticeBadge" AS ENUM ('SCHEDULE', 'FACILITY', 'NOTICE', 'WORK', 'OTHER');

CREATE TABLE "Notice" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "badge" "NoticeBadge" NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "authorId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,

  CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notice_workspaceId_createdAt_idx" ON "Notice"("workspaceId", "createdAt");
CREATE INDEX "Notice_workspaceId_endDate_idx" ON "Notice"("workspaceId", "endDate");

ALTER TABLE "Notice"
ADD CONSTRAINT "Notice_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notice"
ADD CONSTRAINT "Notice_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
