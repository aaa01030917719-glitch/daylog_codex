-- Phase 7: Approvals + Notifications + Push Subscriptions
-- Run this in Supabase SQL Editor if tables do not exist yet.

CREATE TABLE IF NOT EXISTS "Approval" (
  "id"           TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "type"         TEXT        NOT NULL,
  "title"        TEXT        NOT NULL,
  "description"  TEXT,
  "status"       TEXT        NOT NULL DEFAULT 'PENDING',
  "decidedAt"    TIMESTAMP(3),
  "decisionNote" TEXT,
  "leaveType"    TEXT,
  "leaveStart"   TIMESTAMP(3),
  "leaveEnd"     TIMESTAMP(3),
  "requesterId"  TEXT        NOT NULL,
  "deciderId"    TEXT,
  "taskId"       TEXT,
  "eventId"      TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Approval_pkey"          PRIMARY KEY ("id"),
  CONSTRAINT "Approval_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "Approval_deciderId_fkey"   FOREIGN KEY ("deciderId")   REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "Notification" (
  "id"        TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "type"      TEXT        NOT NULL,
  "title"     TEXT        NOT NULL,
  "body"      TEXT        NOT NULL,
  "isRead"    BOOLEAN     NOT NULL DEFAULT false,
  "link"      TEXT,
  "userId"    TEXT        NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey"    PRIMARY KEY ("id"),
  CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "PushSubscription" (
  "id"        TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "endpoint"  TEXT        NOT NULL,
  "auth"      TEXT        NOT NULL,
  "p256dh"    TEXT        NOT NULL,
  "userId"    TEXT        NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PushSubscription_pkey"         PRIMARY KEY ("id"),
  CONSTRAINT "PushSubscription_endpoint_key" UNIQUE ("endpoint"),
  CONSTRAINT "PushSubscription_userId_fkey"  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
