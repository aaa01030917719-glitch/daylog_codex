import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCalendarFeed, resolveCalendarWorkspaceId } from "@/lib/calendar/server";

function parseDateParam(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const workspaceId = await resolveCalendarWorkspaceId({
    userId: session.user.id,
    sessionWorkspaceId: session.user.workspaceId,
  });

  if (!workspaceId) {
    return NextResponse.json({ items: [] });
  }

  const searchParams = req.nextUrl.searchParams;
  const start = parseDateParam(searchParams.get("startDate"));
  const end = parseDateParam(searchParams.get("endDate"));

  if (!start || !end) {
    return NextResponse.json(
      { error: "조회 시작일과 종료일을 함께 전달해 주세요." },
      { status: 400 }
    );
  }

  const items = await getCalendarFeed({
    workspaceId,
    userId: session.user.id,
    userRole: session.user.role ?? "MEMBER",
    start,
    end,
  });

  return NextResponse.json({ items });
}
