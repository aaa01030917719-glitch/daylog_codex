CREATE TABLE IF NOT EXISTS "ErrorReport" (
  "id" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "currentPath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT,

  CONSTRAINT "ErrorReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ErrorReport_createdAt_idx"
ON "ErrorReport" ("createdAt");

CREATE INDEX IF NOT EXISTS "ErrorReport_userId_createdAt_idx"
ON "ErrorReport" ("userId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ErrorReport_userId_fkey'
  ) THEN
    ALTER TABLE "ErrorReport"
    ADD CONSTRAINT "ErrorReport_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END
$$;
