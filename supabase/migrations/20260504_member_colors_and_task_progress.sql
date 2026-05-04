-- Workspace member personal colors and task progress support.
-- Run manually in Supabase SQL Editor before deploying the related UI/API changes.

alter table "WorkspaceMember"
  add column if not exists "personalColor" text;

create unique index if not exists "WorkspaceMember_workspaceId_personalColor_key"
  on "WorkspaceMember"("workspaceId", "personalColor");

alter table "Task"
  add column if not exists "progress" integer default 0;

alter table "Task"
  alter column "progress" set default 0;

update "Task"
set "progress" = 0
where "progress" is null;
