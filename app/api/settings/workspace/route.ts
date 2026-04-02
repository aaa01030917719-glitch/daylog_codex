import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceSettings } from "@/app/(app)/settings/data";

type WorkspaceColumnRow = { column_name: string };
type TableExistsRow = { exists: boolean };

const OPTIONAL_WORKSPACE_COLUMNS = [
  "description",
  "industry",
  "teamSize",
  "themeColor",
  "lateGraceMinutes",
  "checkoutConfirmPopup",
  "showAttendanceMemo",
  "excludeOwnerAttendance",
  "notifyCheckoutMissed",
  "notifyNextDayMissing",
  "checkoutAlertTime",
  "missingAlertTime",
  ...Array.from({ length: 7 }, (_, index) => `weekdayCheckIn_${index}`),
  ...Array.from({ length: 7 }, (_, index) => `weekdayCheckOut_${index}`),
  ...Array.from({ length: 7 }, (_, index) => `weekdayOff_${index}`),
  "notif_confirm_request",
  "notif_deadline_d1",
  "notif_budget_over",
  "notif_confirm_result",
  "notif_mention",
  "notif_notice_new",
  "notif_idea_like",
  "notif_notice_read",
] as const;

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableText(value: unknown) {
  const text = normalizeText(value);
  return text.length > 0 ? text : null;
}

function normalizeTime(value: unknown, fallback: string) {
  const text = normalizeText(value);
  return /^\d{2}:\d{2}$/.test(text) ? text : fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

async function getOwnerMember() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  return prisma.workspaceMember.findFirst({
    where: {
      userId: session.user.id,
      role: "OWNER",
    },
    select: {
      workspaceId: true,
    },
  });
}

async function getWorkspaceColumnSet() {
  const rows = await prisma.$queryRaw<WorkspaceColumnRow[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Workspace'
  `;

  return new Set(rows.map((row) => row.column_name));
}

async function tableExists(tableName: string) {
  const rows = await prisma.$queryRaw<TableExistsRow[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
    ) AS exists
  `;

  return rows[0]?.exists ?? false;
}

async function updateOptionalWorkspaceColumns(
  workspaceId: string,
  payload: Record<string, unknown>,
  columns: Set<string>
) {
  const entries = Object.entries(payload).filter(([key]) => columns.has(key));
  if (entries.length === 0) {
    return;
  }

  const assignments = entries.map(([key], index) => `"${key}" = $${index + 2}`);
  await prisma.$executeRawUnsafe(
    `UPDATE "Workspace" SET ${assignments.join(", ")} WHERE id = $1`,
    workspaceId,
    ...entries.map(([, value]) => value)
  );
}

export async function PATCH(req: NextRequest) {
  const ownerMember = await getOwnerMember();
  if (!ownerMember) {
    return NextResponse.json({ error: "OWNER만 설정을 변경할 수 있습니다." }, { status: 403 });
  }

  const body = await req.json();
  const currentSettings = await getWorkspaceSettings(ownerMember.workspaceId);
  const workspaceColumns = await getWorkspaceColumnSet();

  const workspaceData: Record<string, unknown> = {};
  if ("name" in body) {
    const name = normalizeText(body.name);
    if (!name) {
      return NextResponse.json({ error: "워크스페이스 이름을 입력해 주세요." }, { status: 400 });
    }
    workspaceData.name = name;
  }

  if ("checkInTime" in body) {
    workspaceData.workStartTime = normalizeTime(body.checkInTime, currentSettings.checkInTime);
  }

  if ("checkOutTime" in body) {
    workspaceData.workEndTime = normalizeTime(body.checkOutTime, currentSettings.checkOutTime);
  }

  if ("workHoursPerDay" in body) {
    workspaceData.workHoursPerDay = normalizeNumber(body.workHoursPerDay, currentSettings.workHoursPerDay);
  }

  if (Object.keys(workspaceData).length > 0) {
    await prisma.workspace.update({
      where: { id: ownerMember.workspaceId },
      data: workspaceData,
    });
  }

  const optionalPayload: Record<string, unknown> = {
    description: normalizeNullableText(body.description),
    industry: normalizeNullableText(body.industry),
    teamSize: normalizeNullableText(body.teamSize),
    themeColor: normalizeNullableText(body.themeColor),
    lateGraceMinutes: normalizeNumber(body.lateGraceMinutes, currentSettings.lateGraceMinutes),
    checkoutConfirmPopup: normalizeBoolean(body.checkoutConfirmPopup, currentSettings.checkoutConfirmPopup),
    showAttendanceMemo: normalizeBoolean(body.showAttendanceMemo, currentSettings.showAttendanceMemo),
    excludeOwnerAttendance: normalizeBoolean(body.excludeOwnerAttendance, currentSettings.excludeOwnerAttendance),
    notifyCheckoutMissed: normalizeBoolean(body.notifyCheckoutMissed, currentSettings.notifyCheckoutMissed),
    notifyNextDayMissing: normalizeBoolean(body.notifyNextDayMissing, currentSettings.notifyNextDayMissing),
    checkoutAlertTime: normalizeTime(body.checkoutAlertTime, currentSettings.checkoutAlertTime),
    missingAlertTime: normalizeTime(body.missingAlertTime, currentSettings.missingAlertTime),
  };

  for (let index = 0; index < 7; index += 1) {
    optionalPayload[`weekdayCheckIn_${index}`] = normalizeTime(
      body[`weekdayCheckIn_${index}`],
      currentSettings.weekdaySettings[index]?.checkInTime ?? currentSettings.checkInTime
    );
    optionalPayload[`weekdayCheckOut_${index}`] = normalizeTime(
      body[`weekdayCheckOut_${index}`],
      currentSettings.weekdaySettings[index]?.checkOutTime ?? currentSettings.checkOutTime
    );
    optionalPayload[`weekdayOff_${index}`] = normalizeBoolean(
      body[`weekdayOff_${index}`],
      currentSettings.weekdaySettings[index]?.isOff ?? index >= 5
    );
  }

  for (const column of OPTIONAL_WORKSPACE_COLUMNS) {
    if (!(column in optionalPayload) && column in body) {
      optionalPayload[column] = body[column];
    }
  }

  await updateOptionalWorkspaceColumns(ownerMember.workspaceId, optionalPayload, workspaceColumns);

  const settings = await getWorkspaceSettings(ownerMember.workspaceId);
  return NextResponse.json({ settings });
}

export async function DELETE(req: NextRequest) {
  const ownerMember = await getOwnerMember();
  if (!ownerMember) {
    return NextResponse.json({ error: "OWNER만 위험 작업을 실행할 수 있습니다." }, { status: 403 });
  }

  const action = req.nextUrl.searchParams.get("action");
  if (!action) {
    return NextResponse.json({ error: "실행할 작업을 지정해 주세요." }, { status: 400 });
  }

  if (action === "attendance-reset") {
    const result = await prisma.attendance.deleteMany({
      where: { workspaceId: ownerMember.workspaceId },
    });

    return NextResponse.json({ success: true, deletedCount: result.count });
  }

  if (action === "revoke-invites") {
    if (await tableExists("InviteToken")) {
      await prisma.inviteToken.updateMany({
        where: { workspaceId: ownerMember.workspaceId },
        data: { expiresAt: new Date() },
      });
    }

    const nextInviteCode = randomUUID().replace(/-/g, "");
    await prisma.workspace.update({
      where: { id: ownerMember.workspaceId },
      data: {
        inviteCode: nextInviteCode,
      },
    });

    return NextResponse.json({ success: true, inviteCode: nextInviteCode });
  }

  return NextResponse.json({ error: "지원하지 않는 위험 작업입니다." }, { status: 400 });
}
