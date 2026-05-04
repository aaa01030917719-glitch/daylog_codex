-- CreateEnum
CREATE TYPE "CommentTargetType" AS ENUM ('document', 'project', 'notice', 'delivery');

-- CreateTable
CREATE TABLE "DetailComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,
    "targetType" "CommentTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,

    CONSTRAINT "DetailComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DetailComment_targetType_targetId_createdAt_idx" ON "DetailComment"("targetType", "targetId", "createdAt");

-- CreateIndex
CREATE INDEX "DetailComment_authorId_createdAt_idx" ON "DetailComment"("authorId", "createdAt");

-- AddForeignKey
ALTER TABLE "DetailComment" ADD CONSTRAINT "DetailComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
