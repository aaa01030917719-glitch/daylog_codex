import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type {
  InviteLinkRow,
  NotificationLevel,
  NotificationRule,
  WeekdaySetting,
  WorkspaceMemberRow,
  WorkspaceSettings,
} from "./types";
import { NOTIFICATION_ITEMS, WEEKDAYS } from "./types";

type WorkspaceColumnRow = { column_name: string };
type TableExistsRow = { exists: boolean };
type GenericRow = Record<string, unknown>;

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
  ...NOTIFICATION_ITEMS.map((item) => `notif_${item.key}`),
] as const;

function readString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" ? value : fallback;
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

async function getOptionalWorkspaceValues(workspaceId: string, columns: Set<string>) {
  const availableColumns = OPTIONAL_WORKSPACE_COLUMNS.filter((column) => columns.has(column));
  if (availableColumns.length === 0) {
    return {} as GenericRow;
  }

  const query = `SELECT ${availableColumns.map((column) => `"${column}"`).join(", ")} FROM "Workspace" WHERE id = $1 LIMIT 1`;
  const rows = await prisma.$queryRawUnsafe<GenericRow[]>(query, workspaceId);
  return rows[0] ?? {};
}

function buildWeekdaySettings(values: GenericRow, defaultCheckIn: string, defaultCheckOut: string): WeekdaySetting[] {
  return WEEKDAYS.map((label, dayIndex) => ({
    dayIndex,
    label,
    checkInTime: readString(values[`weekdayCheckIn_${dayIndex}`]) ?? defaultCheckIn,
    checkOutTime: readString(values[`weekdayCheckOut_${dayIndex}`]) ?? defaultCheckOut,
    isOff: readBoolean(values[`weekdayOff_${dayIndex}`], dayIndex >= 5),
  }));
}

function buildNotificationRules(values: GenericRow): NotificationRule[] {
  return NOTIFICATION_ITEMS.map((item) => ({
    key: item.key,
    level: (readString(values[`notif_${item.key}`]) ?? item.defaultLevel) as NotificationLevel,
  }));
}

export async function requireOwner() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const member = await prisma.workspaceMember.findFirst({
    where: {
      userId: session.user.id,
      role: "OWNER",
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          createdAt: true,
          inviteCode: true,
          workStartTime: true,
          workEndTime: true,
          workHoursPerDay: true,
        },
      },
    },
  });

  if (!member) {
    redirect("/");
  }

  return {
    session,
    member,
    workspace: member.workspace,
  };
}

export async function requireWorkspaceMember() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const member = await prisma.workspaceMember.findFirst({
    where: {
      userId: session.user.id,
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          createdAt: true,
          inviteCode: true,
          workStartTime: true,
          workEndTime: true,
          workHoursPerDay: true,
        },
      },
    },
  });

  if (!member) {
    redirect("/");
  }

  return {
    session,
    member,
    workspace: member.workspace,
  };
}

export async function getWorkspaceSettings(workspaceId: string): Promise<WorkspaceSettings> {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      inviteCode: true,
      createdAt: true,
      workStartTime: true,
      workEndTime: true,
      workHoursPerDay: true,
    },
  });

  const columns = await getWorkspaceColumnSet();
  const optionalValues = await getOptionalWorkspaceValues(workspaceId, columns);

  return {
    id: workspace.id,
    name: workspace.name,
    description: readString(optionalValues.description),
    industry: readString(optionalValues.industry),
    teamSize: readString(optionalValues.teamSize),
    themeColor: readString(optionalValues.themeColor) ?? "#4F7CFF",
    logoUrl: workspace.logoUrl,
    inviteCode: workspace.inviteCode,
    createdAt: workspace.createdAt.toISOString(),
    checkInTime: workspace.workStartTime ?? "09:00",
    checkOutTime: workspace.workEndTime ?? "18:00",
    lateGraceMinutes: readNumber(optionalValues.lateGraceMinutes, 10),
    workHoursPerDay: workspace.workHoursPerDay ?? 8,
    weekdaySettings: buildWeekdaySettings(optionalValues, workspace.workStartTime ?? "09:00", workspace.workEndTime ?? "18:00"),
    checkoutConfirmPopup: readBoolean(optionalValues.checkoutConfirmPopup, true),
    showAttendanceMemo: readBoolean(optionalValues.showAttendanceMemo, false),
    excludeOwnerAttendance: readBoolean(optionalValues.excludeOwnerAttendance, true),
    notifyCheckoutMissed: readBoolean(optionalValues.notifyCheckoutMissed, true),
    notifyNextDayMissing: readBoolean(optionalValues.notifyNextDayMissing, true),
    checkoutAlertTime: readString(optionalValues.checkoutAlertTime) ?? "18:10",
    missingAlertTime: readString(optionalValues.missingAlertTime) ?? "09:00",
    notificationRules: buildNotificationRules(optionalValues),
  };
}

export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberRow[]> {
  const rows = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    userId: row.user.id,
    name: row.user.name ?? "이름 없음",
    email: row.user.email,
    image: row.user.image ?? null,
    role: row.role,
    department: null,
    joinedAt: row.joinedAt.toISOString(),
    personalColor: row.personalColor ?? null,
  }));
}

export async function getInviteLinks(workspaceId: string): Promise<InviteLinkRow[]> {
  const hasInviteTokenTable = await tableExists("InviteToken");
  if (!hasInviteTokenTable) {
    return [];
  }

  try {
    const links = await prisma.inviteToken.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    return links.map((link) => ({
      id: link.id,
      token: link.token,
      role: link.role as "ADMIN" | "MEMBER",
      expiresAt: link.expiresAt?.toISOString() ?? null,
      usedCount: link.usedCount,
      memo: link.memo ?? null,
      expired: link.expiresAt ? new Date(link.expiresAt).getTime() < Date.now() : false,
    }));
  } catch {
    return [];
  }
}
