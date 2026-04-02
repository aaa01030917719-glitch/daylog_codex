CREATE TYPE "BoardPostVisibility" AS ENUM ('SHARED', 'PRIVATE');

ALTER TABLE "BoardPost"
ADD COLUMN "visibility" "BoardPostVisibility" NOT NULL DEFAULT 'SHARED';

UPDATE "BoardPost"
SET "visibility" = 'SHARED'
WHERE "type" = 'IDEA';
