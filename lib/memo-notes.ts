import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

type MemoRow = {
  id: string;
  title: string | null;
  content: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  authorId: string;
  workspaceId: string;
};

export interface MemoNoteRecord {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

let ensurePromise: Promise<void> | null = null;

export function serializeMemoRow(row: MemoRow): MemoNoteRecord {
  return {
    id: row.id,
    title: row.title?.trim() || "제목 없음",
    content: row.content,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function ensureMemoTable() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "MemoNote" (
          "id" TEXT NOT NULL,
          "title" TEXT,
          "content" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "authorId" TEXT NOT NULL,
          "workspaceId" TEXT NOT NULL,
          CONSTRAINT "MemoNote_pkey" PRIMARY KEY ("id")
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "MemoNote_authorId_createdAt_idx"
        ON "MemoNote" ("authorId", "createdAt")
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "MemoNote_workspaceId_authorId_idx"
        ON "MemoNote" ("workspaceId", "authorId")
      `);
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'MemoNote_authorId_fkey'
          ) THEN
            ALTER TABLE "MemoNote"
            ADD CONSTRAINT "MemoNote_authorId_fkey"
            FOREIGN KEY ("authorId")
            REFERENCES "User"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE;
          END IF;
        END
        $$;
      `);
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'MemoNote_workspaceId_fkey'
          ) THEN
            ALTER TABLE "MemoNote"
            ADD CONSTRAINT "MemoNote_workspaceId_fkey"
            FOREIGN KEY ("workspaceId")
            REFERENCES "Workspace"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE;
          END IF;
        END
        $$;
      `);
    })();
  }

  await ensurePromise;
}

export async function listMemoNotes(workspaceId: string, authorId: string) {
  await ensureMemoTable();

  const rows = await prisma.$queryRawUnsafe<MemoRow[]>(
    `
      SELECT "id", "title", "content", "createdAt", "updatedAt", "authorId", "workspaceId"
      FROM "MemoNote"
      WHERE "workspaceId" = $1 AND "authorId" = $2
      ORDER BY "createdAt" DESC
    `,
    workspaceId,
    authorId
  );

  return rows.map(serializeMemoRow);
}

export async function createMemoNote(params: {
  workspaceId: string;
  authorId: string;
  title: string;
  content: string;
}) {
  await ensureMemoTable();

  const rows = await prisma.$queryRawUnsafe<MemoRow[]>(
    `
      INSERT INTO "MemoNote" (
        "id",
        "title",
        "content",
        "authorId",
        "workspaceId",
        "createdAt",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING "id", "title", "content", "createdAt", "updatedAt", "authorId", "workspaceId"
    `,
    randomUUID(),
    params.title,
    params.content,
    params.authorId,
    params.workspaceId
  );

  return rows[0] ? serializeMemoRow(rows[0]) : null;
}

export async function findMemoNoteForAuthor(params: {
  memoId: string;
  workspaceId: string;
  authorId: string;
}) {
  await ensureMemoTable();

  const rows = await prisma.$queryRawUnsafe<MemoRow[]>(
    `
      SELECT "id", "title", "content", "createdAt", "updatedAt", "authorId", "workspaceId"
      FROM "MemoNote"
      WHERE "id" = $1 AND "workspaceId" = $2 AND "authorId" = $3
      LIMIT 1
    `,
    params.memoId,
    params.workspaceId,
    params.authorId
  );

  return rows[0] ?? null;
}

export async function updateMemoNote(params: {
  memoId: string;
  workspaceId: string;
  authorId: string;
  title: string;
  content: string;
}) {
  await ensureMemoTable();

  const rows = await prisma.$queryRawUnsafe<MemoRow[]>(
    `
      UPDATE "MemoNote"
      SET
        "title" = $4,
        "content" = $5,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = $1 AND "workspaceId" = $2 AND "authorId" = $3
      RETURNING "id", "title", "content", "createdAt", "updatedAt", "authorId", "workspaceId"
    `,
    params.memoId,
    params.workspaceId,
    params.authorId,
    params.title,
    params.content
  );

  return rows[0] ? serializeMemoRow(rows[0]) : null;
}

export async function deleteMemoNote(params: {
  memoId: string;
  workspaceId: string;
  authorId: string;
}) {
  await ensureMemoTable();

  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `
      DELETE FROM "MemoNote"
      WHERE "id" = $1 AND "workspaceId" = $2 AND "authorId" = $3
      RETURNING "id"
    `,
    params.memoId,
    params.workspaceId,
    params.authorId
  );

  return rows[0]?.id ?? null;
}
