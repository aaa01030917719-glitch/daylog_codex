CREATE TABLE IF NOT EXISTS "TaskAttachment" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "size" INTEGER NOT NULL DEFAULT 0,
  "mimeType" TEXT,
  "storagePath" TEXT,
  "url" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploaderId" TEXT NOT NULL,
  CONSTRAINT "TaskAttachment_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE,
  CONSTRAINT "TaskAttachment_uploaderId_fkey"
    FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "TaskAttachment_taskId_createdAt_idx"
  ON "TaskAttachment"("taskId", "createdAt");

CREATE INDEX IF NOT EXISTS "TaskAttachment_uploaderId_idx"
  ON "TaskAttachment"("uploaderId");
