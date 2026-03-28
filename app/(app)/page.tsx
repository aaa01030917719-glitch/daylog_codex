import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { CheckInBanner } from "@/components/attendance/CheckInBanner";
import { StatCards } from "@/components/dashboard/StatCards";
import { MyTasks } from "@/components/dashboard/MyTasks";
import { MiniCalendar } from "@/components/dashboard/MiniCalendar";
import { QuickAdd } from "@/components/dashboard/QuickAdd";
import { TeamBoard, type BoardPostData } from "@/components/dashboard/TeamBoard";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const workspaceId = session?.user?.workspaceId;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // 출근 상태
  const todayAttendance = userId
    ? await prisma.attendance.findUnique({
        where: { userId_date: { userId, date: today } },
        select: { checkIn: true, status: true },
      })
    : null;

  // 통계 데이터
  const [inProgressCount, weekDoneCount, monthEventCount] = await Promise.all([
    userId
      ? prisma.task.count({ where: { assigneeId: userId, status: "IN_PROGRESS" } })
      : Promise.resolve(0),
    userId
      ? prisma.task.count({
          where: {
            assigneeId: userId,
            status: "DONE",
            updatedAt: { gte: weekStart, lte: weekEnd },
          },
        })
      : Promise.resolve(0),
    workspaceId
      ? prisma.event.count({
          where: {
            workspaceId,
            startAt: { gte: monthStart, lte: monthEnd },
          },
        })
      : Promise.resolve(0),
  ]);

  // 내 태스크 (최근 10개)
  const rawTasks = userId
    ? await prisma.task.findMany({
        where: { assigneeId: userId, status: { not: "DONE" } },
        include: { assignee: { select: { name: true } } },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        take: 10,
      })
    : [];

  const tasks = rawTasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status as "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE",
    priority: t.priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
    assigneeName: t.assignee?.name ?? null,
    dueDate: t.dueDate,
  }));

  // 이번달 일정
  const rawEvents = workspaceId
    ? await prisma.event.findMany({
        where: {
          workspaceId,
          startAt: { gte: monthStart, lte: monthEnd },
        },
        orderBy: { startAt: "asc" },
        take: 50,
      })
    : [];

  const events = rawEvents.map((e) => ({
    id: e.id,
    title: e.title,
    startAt: e.startAt,
    endAt: e.endAt,
    color: e.color,
    allDay: e.allDay,
  }));

  // 팀 보드 포스트
  const rawPosts = workspaceId
    ? await prisma.boardPost.findMany({
        where: { workspaceId },
        include: {
          author: { select: { name: true } },
          likes: { select: { userId: true } },
          reads: { select: { userId: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      })
    : [];

  const boardPosts: BoardPostData[] = rawPosts.map((p) => ({
    id: p.id,
    type: p.type as "NOTICE" | "IDEA" | "CEO_MESSAGE",
    title: p.title,
    content: p.content,
    tags: p.tags,
    status: p.status as "REVIEW" | "ADOPTED" | "HOLD" | null,
    authorName: p.author.name ?? "알 수 없음",
    createdAt: p.createdAt,
    likeCount: p.likes.length,
    readCount: p.reads.length,
    isLiked: userId ? p.likes.some((l) => l.userId === userId) : false,
    isRead: userId ? p.reads.some((r) => r.userId === userId) : false,
  }));

  const initialAttendance = todayAttendance?.checkIn
    ? { checkIn: todayAttendance.checkIn.toISOString(), status: todayAttendance.status }
    : null;

  return (
    <div className="space-y-6">
      {/* 인사말 */}
      <div>
        <h1 className="font-serif text-2xl font-bold" style={{ color: "#0D0D0D" }}>
          안녕하세요, {session?.user?.name ?? "사용자"}님 👋
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#999" }}>오늘도 좋은 하루 되세요.</p>
      </div>

      {/* 출근 배너 */}
      <CheckInBanner initialAttendance={initialAttendance} />

      {/* 통계 카드 */}
      <StatCards
        inProgress={inProgressCount}
        weekDone={weekDoneCount}
        monthEvents={monthEventCount}
      />

      {/* 빠른 등록 */}
      <QuickAdd />

      {/* 내 태스크 */}
      <MyTasks tasks={tasks} />

      {/* 미니 캘린더 + 오늘 일정 */}
      <MiniCalendar events={events} />

      {/* 팀 보드 */}
      <TeamBoard posts={boardPosts} />
    </div>
  );
}
