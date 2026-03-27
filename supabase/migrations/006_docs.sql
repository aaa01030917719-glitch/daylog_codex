-- Phase 6: Documents / Wiki
-- Run this in Supabase SQL Editor if tables do not exist yet.

CREATE TABLE IF NOT EXISTS "Page" (
  "id"          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "title"       TEXT        NOT NULL DEFAULT '제목 없음',
  "content"     JSONB,
  "emoji"       TEXT        DEFAULT '📄',
  "isPublic"    BOOLEAN     NOT NULL DEFAULT false,
  "parentId"    TEXT,
  "workspaceId" TEXT        NOT NULL,
  "authorId"    TEXT        NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Page_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Page_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE,
  CONSTRAINT "Page_authorId_fkey"    FOREIGN KEY ("authorId")    REFERENCES "User"("id")      ON DELETE CASCADE,
  CONSTRAINT "Page_parentId_fkey"    FOREIGN KEY ("parentId")    REFERENCES "Page"("id")      ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "Comment" (
  "id"        TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "content"   TEXT        NOT NULL,
  "authorId"  TEXT        NOT NULL,
  "taskId"    TEXT,
  "pageId"    TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Comment_pkey"     PRIMARY KEY ("id"),
  CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id")    ON DELETE CASCADE,
  CONSTRAINT "Comment_pageId_fkey"   FOREIGN KEY ("pageId")   REFERENCES "Page"("id")   ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Mention" (
  "id"        TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "isRead"    BOOLEAN     NOT NULL DEFAULT false,
  "userId"    TEXT        NOT NULL,
  "commentId" TEXT        NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Mention_pkey"      PRIMARY KEY ("id"),
  CONSTRAINT "Mention_userId_fkey"    FOREIGN KEY ("userId")    REFERENCES "User"("id")    ON DELETE CASCADE,
  CONSTRAINT "Mention_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE
);
