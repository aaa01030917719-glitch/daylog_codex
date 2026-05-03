import { ApprovalStatus, ApprovalType, AttendanceStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  ATTENDANCE_EDIT_REQUEST_TITLE_PREFIX,
  parseAttendanceDecisionNote,
} from "@/components/attendance/attendance-utils";

function isAdmin(role?: string | null) {
  return role === "ADMIN" || role === "OWNER";
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseDescription(description: string | null) {
  if (!description) {
    return null;
  }

  try {
    const parsed = JSON.parse(description) as {
      kind?: string;
      date?: string;
      originalCheckIn?: string | null;
      originalCheckOut?: string | null;
      requestedCheckIn?: string | null;
      requestedCheckOut?: string | null;
      reason?: string;
    };

    if (parsed.kind !== "ATTENDANCE_EDIT" || !parsed.date) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function parseDateOnly(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildResponse(
  request: {
    id: string;
    title: string;
    status: ApprovalStatus;
    createdAt: Date;
    decidedAt: Date | null;
    decisionNote: string | null;
    description: string | null;
    requesterId: string;
    requester: { name: string | null };
  },
  fallbackOriginal?: {
    checkIn: Date | null;
    checkOut: Date | null;
  } | null
) {
  const parsed = parseDescription(request.description);
  const note = parseAttendanceDecisionNote(request.decisionNote);

  return {
    id: request.id,
    title: request.title,
    status: request.status,
    isWithdrawn: note.isWithdrawn,
    createdAt: request.createdAt.toISOString(),
    decidedAt: request.decidedAt?.toISOString() ?? null,
    decisionNote: note.text,
    requesterId: request.requesterId,
    requesterName: request.requester.name ?? "이름 없음",
    requestDate: parsed?.date ?? "",
    originalCheckIn:
      parsed?.originalCheckIn ?? fallbackOriginal?.checkIn?.toISOString() ?? null,
    originalCheckOut:
      parsed?.originalCheckOut ?? fallbackOriginal?.checkOut?.toISOString() ?? null,
    requestedCheckIn: parsed?.requestedCheckIn ?? null,
    requestedCheckOut: parsed?.requestedCheckOut ?? null,
    reason: parsed?.reason ?? "",
  };
}

async function resolveAttendanceStatus(params: {
  workspaceId: string;
  checkIn: Date | null;
  workMinutes: number | null;
  previousStatus: AttendanceStatus | null;
}) {
  const { workspaceId, checkIn, workMinutes, previousStatus } = params;

  if (
    previousStatus === AttendanceStatus.HOLIDAY ||
    previousStatus === AttendanceStatus.EARLY_LEAVE
  ) {
    return previousStatus;
  }

  if (!checkIn) {
    return previousStatus ?? AttendanceStatus.ABSENT;
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { workStartTime: true, workHoursPerDay: true },
  });

  if (workspace?.workStartTime) {
    const [hoursText, minutesText] = workspace.workStartTime.split(":");
    const startHours = Number.parseInt(hoursText, 10);
    const startMinutes = Number.parseInt(minutesText, 10);
    const lateThreshold = startHours * 60 + startMinutes + 10;
    const currentMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();

    if (currentMinutes > lateThreshold) {
      return AttendanceStatus.LATE;
    }
  }

  if (workMinutes != null && workspace && workMinutes > workspace.workHoursPerDay * 60 + 30) {
    return AttendanceStatus.OVERTIME;
  }

  return AttendanceStatus.NORMAL;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "승인 권한이 없습니다." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const status =
      body.status === "APPROVED"
        ? ApprovalStatus.APPROVED
        : body.status === "REJECTED"
          ? ApprovalStatus.REJECTED
          : null;
    const decisionNote = normalizeText(body.decisionNote);

    if (!status) {
      return NextResponse.json({ error: "처리 상태를 확인해 주세요." }, { status: 400 });
    }

    const approval = await prisma.approval.findUnique({
      where: { id: params.id },
      include: {
        requester: { select: { name: true } },
      },
    });

    if (
      !approval ||
      approval.type !== ApprovalType.PROJECT_REVIEW ||
      !approval.title.startsWith(ATTENDANCE_EDIT_REQUEST_TITLE_PREFIX)
    ) {
      return NextResponse.json(
        { error: "근무시간 수정 요청을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      return NextResponse.json({ error: "이미 처리된 요청입니다." }, { status: 409 });
    }

    const parsed = parseDescription(approval.description);
    if (!parsed?.date) {
      return NextResponse.json({ error: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
    }

    let attendance = null;
    let originalAttendance: { checkIn: Date | null; checkOut: Date | null } | null = null;

    if (status === ApprovalStatus.APPROVED) {
      const date = parseDateOnly(parsed.date);
      if (!date) {
        return NextResponse.json({ error: "요청 날짜를 확인할 수 없습니다." }, { status: 400 });
      }

      const existing = await prisma.attendance.findUnique({
        where: { userId_date: { userId: approval.requesterId, date } },
      });

      originalAttendance = {
        checkIn: existing?.checkIn ?? null,
        checkOut: existing?.checkOut ?? null,
      };

      const checkIn = parsed.requestedCheckIn
        ? new Date(parsed.requestedCheckIn)
        : existing?.checkIn ?? null;
      const checkOut = parsed.requestedCheckOut
        ? new Date(parsed.requestedCheckOut)
        : existing?.checkOut ?? null;
      const workMinutes =
        checkIn && checkOut
          ? Math.max(0, Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000))
          : null;
      const attendanceStatus = await resolveAttendanceStatus({
        workspaceId: session.user.workspaceId ?? "",
        checkIn,
        workMinutes,
        previousStatus: existing?.status ?? null,
      });

      attendance = await prisma.attendance.upsert({
        where: { userId_date: { userId: approval.requesterId, date } },
        create: {
          userId: approval.requesterId,
          workspaceId: session.user.workspaceId ?? "",
          date,
          checkIn,
          checkOut,
          workMinutes,
          status: attendanceStatus,
          memo: existing?.memo ?? "근무시간 수정 요청 승인",
        },
        update: {
          checkIn,
          checkOut,
          workMinutes,
          status: attendanceStatus,
          memo: existing?.memo ?? "근무시간 수정 요청 승인",
        },
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      });
    }

    const updated = await prisma.approval.update({
      where: { id: approval.id },
      data: {
        status,
        decisionNote: decisionNote || null,
        deciderId: session.user.id,
        decidedAt: new Date(),
      },
      include: {
        requester: { select: { name: true } },
      },
    });

    await prisma.notification.create({
      data: {
        userId: approval.requesterId,
        type: "APPROVAL_RESULT",
        title: `근무시간 수정 요청이 ${status === ApprovalStatus.APPROVED ? "승인" : "반려"}되었습니다.`,
        body: updated.title,
        link: "/attendance",
      },
    });

    return NextResponse.json({
      request: buildResponse(updated, originalAttendance),
      attendance: attendance
        ? {
            ...attendance,
            date: attendance.date.toISOString(),
            checkIn: attendance.checkIn?.toISOString() ?? null,
            checkOut: attendance.checkOut?.toISOString() ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error("[ATTENDANCE_EDIT_REQUEST_DECIDE]", error);
    return NextResponse.json(
      { error: "근무시간 수정 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
