import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const statements = [
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BoardPostType') THEN
      CREATE TYPE "BoardPostType" AS ENUM ('NOTICE', 'IDEA', 'CEO_MESSAGE');
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BoardPostStatus') THEN
      CREATE TYPE "BoardPostStatus" AS ENUM ('REVIEW', 'ADOPTED', 'HOLD');
    END IF;
  END $$`,
  `CREATE TABLE IF NOT EXISTS "BoardPost" (
    "id"          TEXT NOT NULL,
    "type"        "BoardPostType" NOT NULL,
    "title"       TEXT,
    "content"     TEXT NOT NULL,
    "tags"        TEXT[] NOT NULL DEFAULT '{}',
    "status"      "BoardPostStatus",
    "workspaceId" TEXT NOT NULL,
    "authorId"    TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BoardPost_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BoardPost_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT,
    CONSTRAINT "BoardPost_authorId_fkey"    FOREIGN KEY ("authorId")    REFERENCES "User"("id")      ON DELETE RESTRICT
  )`,
  `CREATE TABLE IF NOT EXISTS "BoardLike" (
    "id"        TEXT NOT NULL,
    "postId"    TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BoardLike_pkey"          PRIMARY KEY ("id"),
    CONSTRAINT "BoardLike_postId_userId" UNIQUE ("postId", "userId"),
    CONSTRAINT "BoardLike_postId_fkey"   FOREIGN KEY ("postId") REFERENCES "BoardPost"("id") ON DELETE CASCADE,
    CONSTRAINT "BoardLike_userId_fkey"   FOREIGN KEY ("userId") REFERENCES "User"("id")      ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "BoardRead" (
    "id"        TEXT NOT NULL,
    "postId"    TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BoardRead_pkey"          PRIMARY KEY ("id"),
    CONSTRAINT "BoardRead_postId_userId" UNIQUE ("postId", "userId"),
    CONSTRAINT "BoardRead_postId_fkey"   FOREIGN KEY ("postId") REFERENCES "BoardPost"("id") ON DELETE CASCADE,
    CONSTRAINT "BoardRead_userId_fkey"   FOREIGN KEY ("userId") REFERENCES "User"("id")      ON DELETE CASCADE
  )`,
];

await client.connect();
console.log('Connected');
for (const sql of statements) {
  await client.query(sql);
  console.log('OK:', sql.trim().slice(0, 70));
}
console.log('Migration completed');
await client.end();
