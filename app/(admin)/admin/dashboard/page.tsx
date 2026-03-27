import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ApprovalStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { ApprovalActionsPanel } from "@/app/components/dashboard/ApprovalActionsPanel";
import { InviteCodePanel } from "@/app/components/dashboard/InviteCodePanel";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const APPROVAL_TYPE_LABELS: Record<string, string> = {
  LEAVE_REQUEST: "휴가·반차",
  IMPORTANT_EVENT: "중요일정",
  DEADLINE_CHANGE: "마감변경",
  BUDGET_TASK: "예산",
  PROJECT_REVIEW: "완성본검토",
};

const ATTENDANCE_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  NORMAL: { label: "정상", color: "#2A8C50", bg: "#E8F7EE" },
  LATE: { label: "지각", color: "#D4A200", bg: "#FFF8E6" },
  EARLY_LEAVE: { label: "조퇴", color: "#3B5BDB", bg: "#EEF3FC" },
  ABSENT: { label: "결근", color: "#D93025", bg: "#FDECEA" },
  OVERTIME: { label: "초과근무", color: "#F56B23", bg: "#FEF0E8" },
  HOLIDAY: { label: "휴가", color: "#777", bg: "#F0F0F0" },
};

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "OWNER") redirect("/");

  const workspaceId = session.user.workspaceId ?? "";

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + (6 - weekEnd.getDay()));
  weekEnd.setHours(23, 59, 59, 999);

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true, inviteCode: true },
  });

  const [
    totalUsers,
    pendingApprovals,
    todayAttendanceCount,
    weekDoneTasks,
    allPendingApprovals,
    todayAttendanceRecords,
    activeProjects,
    importantEvents,
    decisionHistory,
  ] = await Promise.all([
    prisma.workspaceMember.count({ where: { workspaceId } }),
    prisma.approval.count({
      where: {
        status: "PENDING",
        requester: { members: { some: { workspaceId } } },
      },
    }),
    prisma.attendance.count({
      where: {
        workspaceId,
        date: { gte: todayStart, lte: todayEnd },
      },
    }),
    prisma.task.count({
      where: {
        status: "DONE",
        project: { workspaceId },
        updatedAt: { gte: weekStart, lte: weekEnd },
      },
    }),
    prisma.approval.findMany({
      where: {
        status: "PENDING",
        requester: { members: { some: { workspaceId } } },
      },
      include: {
        requester: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.attendance.findMany({
      where: {
        workspaceId,
        date: { gte: todayStart, lte: todayEnd },
      },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { checkIn: "asc" },
    }),
    prisma.project.findMany({
      where: { workspaceId, status: "ACTIVE" },
      include: {
        _count: { select: { tasks: true } },
        tasks: { where: { status: "DONE" }, select: { id: true } },
      },
    }),
    prisma.event.findMany({
      where: {
        workspaceId,
        isImportant: true,
        startAt: { gte: weekStart, lte: weekEnd },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.approval.findMany({
      where: {
        status: { in: [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED] },
        requester: { members: { some: { workspaceId } } },
      },
      include: {
        requester: { select: { name: true } },
        decider: { select: { name: true } },
      },
      orderBy: { decidedAt: "desc" },
      take: 30,
    }),
  ]);

  const stats = [
    { label: "전체 사용자", value: totalUsers, unit: "명" },
    { label: "대기중 승인", value: pendingApprovals, unit: "건" },
    { label: "오늘 출근", value: todayAttendanceCount, unit: "명" },
    { label: "이번 주 완료 태스크", value: weekDoneTasks, unit: "개" },
  ];

  return (
    <div>
      {/* Urgent banner */}
      {pendingApprovals > 0 && (
        <div
          style={{
            background: "#FFF0F0",
            border: "1px solid #FCA5A5",
            borderRadius: "0.75rem",
            padding: "0.75rem 1.25rem",
            marginBottom: "1.25rem",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#DC2626" }}>
            🔴 확인 필요 — 처리 대기 중인 요청이 {pendingApprovals}건 있어요!
          </span>
        </div>
      )}

      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "Noto Serif KR, serif", fontSize: "1.5rem", fontWeight: 700, color: "#0D0D0D" }}>
          대표 대시보드
        </h1>
        <p style={{ marginTop: "0.25rem", fontSize: "0.875rem", color: "#999" }}>
          안녕하세요, {session.user.name}님.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.875rem", marginBottom: "1.5rem" }}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "#fff",
              border: "1px solid #E8E0C8",
              borderRadius: "0.75rem",
              padding: "1.25rem",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            <p style={{ fontSize: "0.8125rem", color: "#999", marginBottom: "0.5rem" }}>{stat.label}</p>
            <p style={{ fontSize: "2rem", fontWeight: 700, color: "#0D0D0D", lineHeight: 1 }}>
              {stat.value}
              <span style={{ fontSize: "0.875rem", fontWeight: 400, color: "#999", marginLeft: "0.25rem" }}>{stat.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Approval list */}
      <section style={{ background: "#fff", border: "1px solid #E8E0C8", borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <h2 style={{ fontFamily: "Noto Serif KR, serif", fontSize: "1.125rem", fontWeight: 600, color: "#0D0D0D", marginBottom: "1rem" }}>
          컨펌 대기 목록
        </h2>

        {allPendingApprovals.length === 0 ? (
          <p style={{ fontSize: "0.875rem", color: "#999", textAlign: "center", padding: "1.5rem 0" }}>
            처리 대기 중인 요청이 없습니다.
          </p>
        ) : (
          <ApprovalActionsPanel initialApprovals={allPendingApprovals} />
        )}
      </section>

      {/* Today attendance */}
      <section style={{ background: "#fff", border: "1px solid #E8E0C8", borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <h2 style={{ fontFamily: "Noto Serif KR, serif", fontSize: "1.125rem", fontWeight: 600, color: "#0D0D0D", marginBottom: "1rem" }}>
          팀 출근 현황
        </h2>
        {todayAttendanceRecords.length === 0 ? (
          <p style={{ fontSize: "0.875rem", color: "#999" }}>오늘 출근 기록이 없습니다.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F5EED5" }}>
                {["이름", "출근", "퇴근", "상태"].map((h) => (
                  <th key={h} style={{ padding: "0.625rem 0.875rem", textAlign: "left", fontSize: "0.8125rem", fontWeight: 600, color: "#555", borderBottom: "1px solid #E8E0C8" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {todayAttendanceRecords.map((a) => {
                const s = ATTENDANCE_STATUS_LABELS[a.status];
                const isLate = a.status === "LATE";
                const isAbsent = a.status === "ABSENT";
                return (
                  <tr
                    key={a.id}
                    style={{
                      borderBottom: "1px solid #E8E0C8",
                      background: isLate ? "#FFFDE7" : isAbsent ? "#FFF5F5" : "#fff",
                    }}
                  >
                    <td style={{ padding: "0.625rem 0.875rem", fontSize: "0.875rem", fontWeight: 500, color: "#0D0D0D" }}>
                      {a.user.name}
                    </td>
                    <td style={{ padding: "0.625rem 0.875rem", fontSize: "0.875rem", color: "#2D2D2D" }}>
                      {a.checkIn ? format(new Date(a.checkIn), "HH:mm") : "-"}
                    </td>
                    <td style={{ padding: "0.625rem 0.875rem", fontSize: "0.875rem", color: "#2D2D2D" }}>
                      {a.checkOut ? format(new Date(a.checkOut), "HH:mm") : "-"}
                    </td>
                    <td style={{ padding: "0.625rem 0.875rem" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "0.125rem 0.5rem", borderRadius: "9999px", background: s?.bg, color: s?.color }}>
                        {s?.label ?? a.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Project progress */}
      <section style={{ background: "#fff", border: "1px solid #E8E0C8", borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <h2 style={{ fontFamily: "Noto Serif KR, serif", fontSize: "1.125rem", fontWeight: 600, color: "#0D0D0D", marginBottom: "1rem" }}>
          프로젝트 진행률
        </h2>
        {activeProjects.length === 0 ? (
          <p style={{ fontSize: "0.875rem", color: "#999" }}>진행 중인 프로젝트가 없습니다.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.875rem" }}>
            {activeProjects.map((p) => {
              const total = p._count.tasks;
              const done = p.tasks.length;
              const pct = total === 0 ? 0 : Math.round((done / total) * 100);
              return (
                <div key={p.id} style={{ border: "1px solid #E8E0C8", borderRadius: "0.5rem", padding: "0.875rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.625rem" }}>
                    <div style={{ width: "0.625rem", height: "0.625rem", borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                    <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0D0D0D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name}
                    </p>
                  </div>
                  <div style={{ background: "#E8E0C8", borderRadius: "9999px", height: "0.5rem", marginBottom: "0.375rem", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "#F56B23", borderRadius: "9999px", transition: "width 0.3s" }} />
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "#999" }}>
                    {done}/{total} 완료 ({pct}%)
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Important events this week */}
      <section style={{ background: "#fff", border: "1px solid #E8E0C8", borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <h2 style={{ fontFamily: "Noto Serif KR, serif", fontSize: "1.125rem", fontWeight: 600, color: "#0D0D0D", marginBottom: "1rem" }}>
          이번 주 주요 일정
        </h2>
        {importantEvents.length === 0 ? (
          <p style={{ fontSize: "0.875rem", color: "#999" }}>이번 주 중요 일정이 없습니다.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {importantEvents.map((e) => (
              <div
                key={e.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem",
                  background: "#FAF7EE",
                  borderRadius: "0.5rem",
                  borderLeft: `3px solid ${e.color}`,
                }}
              >
                <div>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0D0D0D" }}>★ {e.title}</p>
                  <p style={{ fontSize: "0.75rem", color: "#999" }}>
                    {format(new Date(e.startAt), "M/d (E) HH:mm", { locale: ko })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Workspace invite code */}
      {workspace && (
        <InviteCodePanel inviteCode={workspace.inviteCode} workspaceName={workspace.name} />
      )}

      {/* Decision history */}
      <section style={{ background: "#fff", border: "1px solid #E8E0C8", borderRadius: "0.75rem", padding: "1.25rem", marginTop: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <h2 style={{ fontFamily: "Noto Serif KR, serif", fontSize: "1.125rem", fontWeight: 600, color: "#0D0D0D", marginBottom: "1rem" }}>
          컨펌 히스토리
        </h2>
        {decisionHistory.length === 0 ? (
          <p style={{ fontSize: "0.875rem", color: "#999" }}>처리된 요청이 없습니다.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F5EED5" }}>
                  {["유형", "제목", "요청자", "결정", "처리일"].map((h) => (
                    <th key={h} style={{ padding: "0.625rem 0.875rem", textAlign: "left", fontSize: "0.8125rem", fontWeight: 600, color: "#555", borderBottom: "1px solid #E8E0C8", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {decisionHistory.map((a, idx) => (
                  <tr
                    key={a.id}
                    style={{ background: idx % 2 === 0 ? "#fff" : "#FAF7EE", borderBottom: "1px solid #E8E0C8" }}
                  >
                    <td style={{ padding: "0.625rem 0.875rem", fontSize: "0.75rem" }}>
                      <span style={{ background: "#FEF0E8", color: "#F56B23", borderRadius: "9999px", padding: "0.125rem 0.5rem", fontWeight: 600 }}>
                        {APPROVAL_TYPE_LABELS[a.type] ?? a.type}
                      </span>
                    </td>
                    <td style={{ padding: "0.625rem 0.875rem", fontSize: "0.875rem", color: "#2D2D2D", maxWidth: "12rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.title}
                    </td>
                    <td style={{ padding: "0.625rem 0.875rem", fontSize: "0.875rem", color: "#555" }}>
                      {a.requester.name}
                    </td>
                    <td style={{ padding: "0.625rem 0.875rem" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          padding: "0.125rem 0.5rem",
                          borderRadius: "9999px",
                          background: a.status === "APPROVED" ? "#E8F7EE" : "#FDECEA",
                          color: a.status === "APPROVED" ? "#2A8C50" : "#D93025",
                        }}
                      >
                        {a.status === "APPROVED" ? "승인" : "거절"}
                      </span>
                    </td>
                    <td style={{ padding: "0.625rem 0.875rem", fontSize: "0.75rem", color: "#999", whiteSpace: "nowrap" }}>
                      {a.decidedAt ? format(new Date(a.decidedAt), "M/d HH:mm", { locale: ko }) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
