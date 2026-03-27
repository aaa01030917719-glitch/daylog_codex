-- ============================================================
-- daylog — Full Schema
-- prisma/schema.prisma 기준으로 자동 생성
-- Supabase SQL Editor에서 전체 실행 (IF NOT EXISTS 안전)
-- ============================================================

-- ── Enum 타입
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AttendanceStatus" AS ENUM ('NORMAL', 'LATE', 'EARLY_LEAVE', 'OVERTIME', 'ABSENT', 'HOLIDAY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ApprovalType" AS ENUM ('LEAVE_REQUEST', 'IMPORTANT_EVENT', 'DEADLINE_CHANGE', 'BUDGET_TASK', 'PROJECT_REVIEW');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "LeaveType" AS ENUM ('FULL_DAY', 'HALF_AM', 'HALF_PM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('MENTION', 'TASK_DUE', 'APPROVAL_REQUEST', 'APPROVAL_RESULT', 'ATTENDANCE_REMINDER', 'OVERTIME_ALERT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "BoardPostType" AS ENUM ('NOTICE', 'IDEA', 'CEO_MESSAGE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "BoardPostStatus" AS ENUM ('REVIEW', 'ADOPTED', 'HOLD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── User
CREATE TABLE IF NOT EXISTS "User" (
  "id"            TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "name"          TEXT,
  "email"         TEXT        NOT NULL,
  "password"      TEXT,
  "image"         TEXT,
  "phone"         TEXT,
  "emailVerified" TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey"        PRIMARY KEY ("id"),
  CONSTRAINT "User_email_key"   UNIQUE ("email")
);

-- ── Workspace
CREATE TABLE IF NOT EXISTS "Workspace" (
  "id"              TEXT    NOT NULL DEFAULT gen_random_uuid()::text,
  "name"            TEXT    NOT NULL,
  "slug"            TEXT    NOT NULL,
  "inviteCode"      TEXT    NOT NULL DEFAULT gen_random_uuid()::text,
  "logoUrl"         TEXT,
  "workStartTime"   TEXT    NOT NULL DEFAULT '09:00',
  "workEndTime"     TEXT    NOT NULL DEFAULT '18:00',
  "workHoursPerDay" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Workspace_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "Workspace_slug_key"       UNIQUE ("slug"),
  CONSTRAINT "Workspace_inviteCode_key" UNIQUE ("inviteCode")
);

-- ── WorkspaceMember
CREATE TABLE IF NOT EXISTS "WorkspaceMember" (
  "id"          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "role"        "Role"      NOT NULL DEFAULT 'MEMBER',
  "joinedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId"      TEXT        NOT NULL,
  "workspaceId" TEXT        NOT NULL,
  CONSTRAINT "WorkspaceMember_pkey"              PRIMARY KEY ("id"),
  CONSTRAINT "WorkspaceMember_userId_workspaceId_key" UNIQUE ("userId", "workspaceId"),
  CONSTRAINT "WorkspaceMember_userId_fkey"       FOREIGN KEY ("userId")      REFERENCES "User"("id")      ON DELETE CASCADE,
  CONSTRAINT "WorkspaceMember_workspaceId_fkey"  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE
);

-- ── Account (NextAuth)
CREATE TABLE IF NOT EXISTS "Account" (
  "id"                TEXT    NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"            TEXT    NOT NULL,
  "type"              TEXT    NOT NULL,
  "provider"          TEXT    NOT NULL,
  "providerAccountId" TEXT    NOT NULL,
  "refresh_token"     TEXT,
  "access_token"      TEXT,
  "expires_at"        INTEGER,
  "token_type"        TEXT,
  "scope"             TEXT,
  "id_token"          TEXT,
  "session_state"     TEXT,
  CONSTRAINT "Account_pkey"                          PRIMARY KEY ("id"),
  CONSTRAINT "Account_provider_providerAccountId_key" UNIQUE ("provider", "providerAccountId"),
  CONSTRAINT "Account_userId_fkey"                   FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- ── Session (NextAuth)
CREATE TABLE IF NOT EXISTS "Session" (
  "id"           TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "sessionToken" TEXT        NOT NULL,
  "userId"       TEXT        NOT NULL,
  "expires"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey"             PRIMARY KEY ("id"),
  CONSTRAINT "Session_sessionToken_key" UNIQUE ("sessionToken"),
  CONSTRAINT "Session_userId_fkey"      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- ── VerificationToken (NextAuth)
CREATE TABLE IF NOT EXISTS "VerificationToken" (
  "identifier" TEXT        NOT NULL,
  "token"      TEXT        NOT NULL,
  "expires"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VerificationToken_token_key"              UNIQUE ("token"),
  CONSTRAINT "VerificationToken_identifier_token_key"   UNIQUE ("identifier", "token")
);

-- ── Project
CREATE TABLE IF NOT EXISTS "Project" (
  "id"          TEXT            NOT NULL DEFAULT gen_random_uuid()::text,
  "name"        TEXT            NOT NULL,
  "description" TEXT,
  "color"       TEXT            NOT NULL DEFAULT '#F56B23',
  "status"      "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
  "budget"      DOUBLE PRECISION,
  "createdAt"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "workspaceId" TEXT            NOT NULL,
  CONSTRAINT "Project_pkey"         PRIMARY KEY ("id"),
  CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
);

-- ── Tag
CREATE TABLE IF NOT EXISTS "Tag" (
  "id"    TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name"  TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#F56B23',
  CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- ── Task
CREATE TABLE IF NOT EXISTS "Task" (
  "id"               TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "title"            TEXT         NOT NULL,
  "description"      TEXT,
  "status"           "TaskStatus" NOT NULL DEFAULT 'TODO',
  "priority"         "Priority"   NOT NULL DEFAULT 'MEDIUM',
  "requiresApproval" BOOLEAN      NOT NULL DEFAULT false,
  "budget"           DOUBLE PRECISION,
  "dueDate"          TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "projectId"        TEXT         NOT NULL,
  "assigneeId"       TEXT,
  "creatorId"        TEXT         NOT NULL,
  CONSTRAINT "Task_pkey"          PRIMARY KEY ("id"),
  CONSTRAINT "Task_projectId_fkey"   FOREIGN KEY ("projectId")  REFERENCES "Project"("id"),
  CONSTRAINT "Task_assigneeId_fkey"  FOREIGN KEY ("assigneeId") REFERENCES "User"("id"),
  CONSTRAINT "Task_creatorId_fkey"   FOREIGN KEY ("creatorId")  REFERENCES "User"("id")
);

-- ── Task ↔ Tag (many-to-many)
CREATE TABLE IF NOT EXISTS "_TagToTask" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  CONSTRAINT "_TagToTask_AB_unique" UNIQUE ("A", "B"),
  CONSTRAINT "_TagToTask_A_fkey" FOREIGN KEY ("A") REFERENCES "Tag"("id")  ON DELETE CASCADE,
  CONSTRAINT "_TagToTask_B_fkey" FOREIGN KEY ("B") REFERENCES "Task"("id") ON DELETE CASCADE
);

-- ── Event
CREATE TABLE IF NOT EXISTS "Event" (
  "id"               TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "title"            TEXT        NOT NULL,
  "description"      TEXT,
  "startAt"          TIMESTAMP(3) NOT NULL,
  "endAt"            TIMESTAMP(3) NOT NULL,
  "allDay"           BOOLEAN     NOT NULL DEFAULT false,
  "color"            TEXT        NOT NULL DEFAULT '#F56B23',
  "isImportant"      BOOLEAN     NOT NULL DEFAULT false,
  "requiresApproval" BOOLEAN     NOT NULL DEFAULT false,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "workspaceId"      TEXT        NOT NULL,
  "creatorId"        TEXT        NOT NULL,
  CONSTRAINT "Event_pkey"            PRIMARY KEY ("id"),
  CONSTRAINT "Event_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id"),
  CONSTRAINT "Event_creatorId_fkey"   FOREIGN KEY ("creatorId")   REFERENCES "User"("id")
);

-- ── Page
CREATE TABLE IF NOT EXISTS "Page" (
  "id"          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "title"       TEXT        NOT NULL DEFAULT '제목 없음',
  "content"     JSONB,
  "emoji"       TEXT,
  "isPublic"    BOOLEAN     NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "parentId"    TEXT,
  "workspaceId" TEXT        NOT NULL,
  "authorId"    TEXT        NOT NULL,
  CONSTRAINT "Page_pkey"            PRIMARY KEY ("id"),
  CONSTRAINT "Page_parentId_fkey"   FOREIGN KEY ("parentId")    REFERENCES "Page"("id")      ON DELETE SET NULL,
  CONSTRAINT "Page_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id"),
  CONSTRAINT "Page_authorId_fkey"   FOREIGN KEY ("authorId")    REFERENCES "User"("id")
);

-- ── Comment
CREATE TABLE IF NOT EXISTS "Comment" (
  "id"        TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "content"   TEXT        NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "authorId"  TEXT        NOT NULL,
  "taskId"    TEXT,
  "pageId"    TEXT,
  CONSTRAINT "Comment_pkey"          PRIMARY KEY ("id"),
  CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id"),
  CONSTRAINT "Comment_taskId_fkey"   FOREIGN KEY ("taskId")   REFERENCES "Task"("id"),
  CONSTRAINT "Comment_pageId_fkey"   FOREIGN KEY ("pageId")   REFERENCES "Page"("id")
);

-- ── Mention
CREATE TABLE IF NOT EXISTS "Mention" (
  "id"        TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "isRead"    BOOLEAN     NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId"    TEXT        NOT NULL,
  "commentId" TEXT        NOT NULL,
  CONSTRAINT "Mention_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "Mention_userId_fkey"    FOREIGN KEY ("userId")    REFERENCES "User"("id"),
  CONSTRAINT "Mention_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id")
);

-- ── Attendance
CREATE TABLE IF NOT EXISTS "Attendance" (
  "id"          TEXT               NOT NULL DEFAULT gen_random_uuid()::text,
  "date"        TIMESTAMP(3)       NOT NULL,
  "checkIn"     TIMESTAMP(3),
  "checkOut"    TIMESTAMP(3),
  "workMinutes" INTEGER,
  "status"      "AttendanceStatus" NOT NULL DEFAULT 'NORMAL',
  "memo"        TEXT,
  "createdAt"   TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId"      TEXT               NOT NULL,
  "workspaceId" TEXT               NOT NULL,
  CONSTRAINT "Attendance_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "Attendance_userId_date_key" UNIQUE ("userId", "date"),
  CONSTRAINT "Attendance_userId_fkey"    FOREIGN KEY ("userId") REFERENCES "User"("id")
);

-- ── Approval
CREATE TABLE IF NOT EXISTS "Approval" (
  "id"           TEXT             NOT NULL DEFAULT gen_random_uuid()::text,
  "type"         "ApprovalType"   NOT NULL,
  "title"        TEXT             NOT NULL,
  "description"  TEXT,
  "status"       "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "decidedAt"    TIMESTAMP(3),
  "decisionNote" TEXT,
  "createdAt"    TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "requesterId"  TEXT             NOT NULL,
  "deciderId"    TEXT,
  "taskId"       TEXT,
  "eventId"      TEXT,
  "leaveType"    "LeaveType",
  "leaveStart"   TIMESTAMP(3),
  "leaveEnd"     TIMESTAMP(3),
  CONSTRAINT "Approval_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "Approval_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id"),
  CONSTRAINT "Approval_deciderId_fkey"   FOREIGN KEY ("deciderId")   REFERENCES "User"("id"),
  CONSTRAINT "Approval_taskId_fkey"      FOREIGN KEY ("taskId")      REFERENCES "Task"("id"),
  CONSTRAINT "Approval_eventId_fkey"     FOREIGN KEY ("eventId")     REFERENCES "Event"("id")
);

-- ── Notification
CREATE TABLE IF NOT EXISTS "Notification" (
  "id"        TEXT               NOT NULL DEFAULT gen_random_uuid()::text,
  "type"      "NotificationType" NOT NULL,
  "title"     TEXT               NOT NULL,
  "body"      TEXT               NOT NULL,
  "isRead"    BOOLEAN            NOT NULL DEFAULT false,
  "link"      TEXT,
  "createdAt" TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId"    TEXT               NOT NULL,
  CONSTRAINT "Notification_pkey"        PRIMARY KEY ("id"),
  CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
);

-- ── BoardPost
CREATE TABLE IF NOT EXISTS "BoardPost" (
  "id"          TEXT              NOT NULL DEFAULT gen_random_uuid()::text,
  "type"        "BoardPostType"   NOT NULL,
  "title"       TEXT,
  "content"     TEXT              NOT NULL,
  "tags"        TEXT[]            NOT NULL DEFAULT '{}',
  "status"      "BoardPostStatus",
  "workspaceId" TEXT              NOT NULL,
  "authorId"    TEXT              NOT NULL,
  "createdAt"   TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BoardPost_pkey"            PRIMARY KEY ("id"),
  CONSTRAINT "BoardPost_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id"),
  CONSTRAINT "BoardPost_authorId_fkey"   FOREIGN KEY ("authorId")    REFERENCES "User"("id")
);

-- ── BoardLike
CREATE TABLE IF NOT EXISTS "BoardLike" (
  "id"        TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "postId"    TEXT        NOT NULL,
  "userId"    TEXT        NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BoardLike_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "BoardLike_postId_userId_key" UNIQUE ("postId", "userId"),
  CONSTRAINT "BoardLike_postId_fkey"    FOREIGN KEY ("postId") REFERENCES "BoardPost"("id") ON DELETE CASCADE,
  CONSTRAINT "BoardLike_userId_fkey"    FOREIGN KEY ("userId") REFERENCES "User"("id")      ON DELETE CASCADE
);

-- ── BoardRead
CREATE TABLE IF NOT EXISTS "BoardRead" (
  "id"        TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "postId"    TEXT        NOT NULL,
  "userId"    TEXT        NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BoardRead_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "BoardRead_postId_userId_key" UNIQUE ("postId", "userId"),
  CONSTRAINT "BoardRead_postId_fkey"    FOREIGN KEY ("postId") REFERENCES "BoardPost"("id") ON DELETE CASCADE,
  CONSTRAINT "BoardRead_userId_fkey"    FOREIGN KEY ("userId") REFERENCES "User"("id")      ON DELETE CASCADE
);

-- ── PushSubscription
CREATE TABLE IF NOT EXISTS "PushSubscription" (
  "id"        TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "endpoint"  TEXT        NOT NULL,
  "auth"      TEXT        NOT NULL,
  "p256dh"    TEXT        NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId"    TEXT        NOT NULL,
  CONSTRAINT "PushSubscription_pkey"         PRIMARY KEY ("id"),
  CONSTRAINT "PushSubscription_endpoint_key" UNIQUE ("endpoint"),
  CONSTRAINT "PushSubscription_userId_fkey"  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
