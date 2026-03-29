import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";
import { ko } from "date-fns/locale";
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
  const userRole = session?.user?.role;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // 출근 상태 (OWNER 제외)
  const todayAttendance = userId && userRole !== "OWNER"
    ? await prisma.attendance.findUnique({
        where: { userId_date: { userId, date: today } },
        select: { checkIn: true, checkOut: true, status: true },
      })
    : null;

  // 통계 카운트
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
          where: { workspaceId, startAt: { gte: monthStart, lte: monthEnd } },
        })
      : Promise.resolve(0),
  ]);

  // StatCards 하단 항목 데이터
  const [inProgressTasks, weekDoneTasks] = await Promise.all([
    userId
      ? prisma.task.findMany({
          where: { assigneeId: userId, status: "IN_PROGRESS" },
          select: { id: true, title: true, dueDate: true },
          orderBy: { dueDate: "asc" },
          take: 5,
        })
      : Promise.resolve([]),
    userId
      ? prisma.task.findMany({
          where: {
            assigneeId: userId,
            status: "DONE",
            updatedAt: { gte: weekStart, lte: weekEnd },
          },
          select: { id: true, title: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
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
        where: { workspaceId, startAt: { gte: monthStart, lte: monthEnd } },
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

  // OWNER 전용: 활성 프로젝트
  const activeProjects = workspaceId && userRole === "OWNER"
    ? await prisma.project.findMany({
        where: { workspaceId, status: "ACTIVE" },
        select: {
          id: true,
          name: true,
          color: true,
          _count: { select: { tasks: true } },
          tasks: { where: { status: "DONE" }, select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
    : [];

  const initialAttendance = todayAttendance?.checkIn
    ? {
        checkIn: todayAttendance.checkIn.toISOString(),
        checkOut: todayAttendance.checkOut ? todayAttendance.checkOut.toISOString() : null,
        status: todayAttendance.status,
      }
    : null;

  // StatCards 항목 매핑
  const inProgressItems = inProgressTasks.map((t) => ({
    id: t.id,
    title: t.title,
    subtitle: t.dueDate ? format(new Date(t.dueDate), "M/d", { locale: ko }) : undefined,
  }));
  const weekDoneItems = weekDoneTasks.map((t) => ({
    id: t.id,
    title: t.title,
    subtitle: format(new Date(t.updatedAt), "M/d", { locale: ko }),
  }));
  const monthEventItems = rawEvents.slice(0, 5).map((e) => ({
    id: e.id,
    title: e.title,
    subtitle: format(new Date(e.startAt), "M/d", { locale: ko }),
  }));

  // 인사말 랜덤 문구 (날짜 기준 하루 고정)
  const phrases = [
    "오늘도 작은 한 걸음이 큰 변화를 만들어요 🌱",
    "집중하면 못 할 일이 없어요. 오늘도 파이팅! 💪",
    "좋은 하루의 시작은 좋은 마음가짐에서 시작해요 ☀️",
    "오늘 하루도 팀과 함께라면 든든해요 🤝",
    "작은 완료가 쌓여 큰 성과가 돼요. 오늘도 하나씩! ✅",
    "어제보다 오늘이 조금 더 나아지고 있어요 📈",
    "오늘 해야 할 일, 오늘 다 해버려요! 🚀",
  ];
  const todayPhrase = phrases[new Date().getDate() % phrases.length];

  // OWNER 레이아웃
  if (userRole === "OWNER") {
    const upcomingEvents = rawEvents.slice(0, 5);
    const noticePosts = boardPosts.filter((p) => p.type === "NOTICE");
    const ceoPosts = boardPosts.filter((p) => p.type === "CEO_MESSAGE");
    const ideaPosts = boardPosts.filter((p) => p.type === "IDEA");

    return (
      <div className="space-y-6">
        {/* 인사말 */}
        <div>
          <h1 className="font-serif text-2xl font-bold" style={{ color: "#0D0D0D" }}>
            안녕하세요, {session?.user?.name ?? "사용자"}님 👋
          </h1>
          <p className="mt-[10px] text-sm" style={{ color: "#555", fontSize: "16px" }}>
            {todayPhrase}
          </p>
        </div>

        {/* 1. 등록된 일정 */}
        <section className="rounded-xl bg-white overflow-hidden" style={{ border: "1px solid #E8E0C8" }}>
          <div className="px-5 py-3" style={{ background: "#F5EED5" }}>
            <h3 className="font-serif text-sm font-semibold" style={{ color: "#0D0D0D" }}>📅 등록된 일정</h3>
          </div>
          <div className="px-5 py-3 divide-y" style={{ borderColor: "#F0EBE0" }}>
            {upcomingEvents.length === 0 ? (
              <p className="text-xs py-3" style={{ color: "#999" }}>등록된 항목이 없어요</p>
            ) : (
              upcomingEvents.map((e) => (
                <div key={e.id} className="flex items-center gap-3 py-2.5">
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: e.color ?? "#60A5FA", flexShrink: 0 }} />
                  <span className="flex-1 text-sm truncate" style={{ color: "#0D0D0D" }}>{e.title}</span>
                  <span className="text-xs flex-shrink-0" style={{ color: "#999" }}>
                    {format(new Date(e.startAt), "M/d (E)", { locale: ko })}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 2. 프로젝트 */}
        <section className="rounded-xl bg-white overflow-hidden" style={{ border: "1px solid #E8E0C8" }}>
          <div className="px-5 py-3" style={{ background: "#F5EED5" }}>
            <h3 className="font-serif text-sm font-semibold" style={{ color: "#0D0D0D" }}>📁 프로젝트</h3>
          </div>
          <div className="px-5 py-3 divide-y" style={{ borderColor: "#F0EBE0" }}>
            {activeProjects.length === 0 ? (
              <p className="text-xs py-3" style={{ color: "#999" }}>진행중인 프로젝트가 없어요</p>
            ) : (
              activeProjects.map((p) => {
                const done = p.tasks.length;
                const total = p._count.tasks;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={p.id} className="py-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                      <span className="text-sm font-medium flex-1 truncate" style={{ color: "#0D0D0D" }}>{p.name}</span>
                      <span className="text-xs flex-shrink-0" style={{ color: "#999" }}>{done}/{total}개</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#F5EED5" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#F56B23" }} />
                      </div>
                      <span className="text-xs flex-shrink-0" style={{ color: "#999" }}>{pct}%</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* 3. 팀 공지 */}
        <TeamBoard posts={noticePosts} filterType="NOTICE" />

        {/* 4. 직원 전달사항 */}
        <TeamBoard posts={ceoPosts} filterType="CEO_MESSAGE" />

        {/* 5. 아이디어 보드 */}
        <TeamBoard posts={ideaPosts} filterType="IDEA" />

        {/* 6. 달력 */}
        <MiniCalendar events={events} />
      </div>
    );
  }

  // 직원/관리자 레이아웃
  return (
    <div className="space-y-6">
      {/* 인사말 */}
      <div>
        <h1 className="font-serif text-2xl font-bold" style={{ color: "#0D0D0D" }}>
          안녕하세요, {session?.user?.name ?? "사용자"}님 👋
        </h1>
        <p className="mt-[10px] text-sm" style={{ color: "#555", fontSize: "16px" }}>
          {todayPhrase}
        </p>
      </div>

      {/* 출근 배너 */}
      <CheckInBanner initialAttendance={initialAttendance} />

      {/* 1행: 통계 카드 3개 */}
      <StatCards
        inProgress={inProgressCount}
        weekDone={weekDoneCount}
        monthEvents={monthEventCount}
        inProgressItems={inProgressItems}
        weekDoneItems={weekDoneItems}
        monthEventItems={monthEventItems}
      />

      {/* 2행: 내 프로젝트 (전체 너비) */}
      <MyTasks tasks={tasks} />

      {/* 3행: 아이디어 올리기 / 직원 전달사항 */}
      <QuickAdd userRole={userRole} />

      {/* 4행: 달력 / 오늘 일정 */}
      <MiniCalendar events={events} />

      {/* 팀 보드 */}
      <TeamBoard posts={boardPosts} />
    </div>
  );
}
