-- Task confirmation request support.
-- Run manually in Supabase SQL Editor before deploying the related API changes.

alter table "Task"
  add column if not exists "isApprovalRequested" boolean not null default false,
  add column if not exists "approvedBy" text,
  add column if not exists "approvedAt" timestamp(3),
  add column if not exists "rejectedReason" text;

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'NotificationType'
      and e.enumlabel = 'TASK_APPROVAL_REQUEST'
  ) then
    alter type "NotificationType" add value 'TASK_APPROVAL_REQUEST';
  end if;
end $$;
