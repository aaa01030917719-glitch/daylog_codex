import { ApprovalStatus } from "@prisma/client";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminApprovalPanel } from "@/components/dashboard/AdminApprovalPanel";
import { DevResetButton } from "@/components/dashboard/DevResetButton";
import { InviteCodePanel } from "@/components/dashboard/InviteCodePanel";
import {
  getProjectBaseSelect,
  hasProjectSubtitleColumn,
} from "@/lib/project-column-support";
import { prisma } from "@/lib/prisma";

const APPROVAL_TYPE_LABELS: Record<string, string> = {
  LEAVE_REQUEST: "연차/반차",
  IMPORTANT_EVENT: "중요 일정",
  DEADLINE_CHANGE: "마감 변경",
  BUDGET_TASK: "예산",
  PROJECT_REVIEW: "프로젝트 검토",
};

const ATTENDANCE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  NORMAL: { label: "정상 출근", color: "#15803d", bg: "var(--success-light)" },
  LATE: { label: "지각", color: "var(--warning)", bg: "var(--warning-light)" },
  ABSENT: { label: "부재", color: "var(--danger)", bg: "var(--danger-light)" },
  HOLIDAY: { label: "연차", color: "var(--text-muted)", bg: "var(--border-light)" },
  EARLY_LEAVE: { label: "반차", color: "var(--accent)", bg: "var(--accent-light)" },
  OVERTIME: { label: "추가 근무", color: "var(--warning)", bg: "var(--warning-light)" },
};

function getApprovalTypeTone(type: string) {
  switch (type) {
    case "LEAVE_REQUEST":
      return { background: "var(--warning-light)", color: "var(--warning)" };
    case "IMPORTANT_EVENT":
      return { background: "var(--accent-light)", color: "var(--accent)" };
    case "DEADLINE_CHANGE":
      return { background: "var(--danger-light)", color: "var(--danger)" };
    case "BUDGET_TASK":
      return { background: "var(--yellow-light)", color: "#ca8a04" };
    case "PROJECT_REVIEW":
      return { background: "var(--purple-light)", color: "var(--purple)" };
    default:
      return { background: "var(--border-light)", color: "var(--text-muted)" };
  }
}

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "OWNER") redirect("/");

  const workspaceId = session.user.workspaceId ?? "";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 0, 0, 0, 0);

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
  const projectSubtitleEnabled = await hasProjectSubtitleColumn();

  const [
    allPendingApprovals,
    urgentTasks,
    recentNotices,
    todayAttendanceRecords,
    activeProjects,
    decisionHistory,
    weekDoneTasks,
    totalUsers,
  ] = await Promise.all([
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
    prisma.task.findMany({
      where: {
        project: { workspaceId },
        status: { not: "DONE" },
        dueDate: { lte: tomorrow },
        NOT: { dueDate: null },
      },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.boardPost.findMany({
      where: { workspaceId, type: "NOTICE" },
      orderBy: { createdAt: "desc" },
      take: 2,
    }),
    prisma.attendance.findMany({
      where: { workspaceId, date: { gte: todayStart, lte: todayEnd } },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { checkIn: "asc" },
    }),
    prisma.project.findMany({
      where: { workspaceId, status: "ACTIVE" },
      select: {
        ...getProjectBaseSelect(projectSubtitleEnabled),
        _count: { select: { tasks: true } },
        tasks: { where: { status: "DONE" }, select: { id: true } },
      },
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
    prisma.task.count({
      where: {
        status: "DONE",
        project: { workspaceId },
        updatedAt: { gte: weekStart, lte: weekEnd },
      },
    }),
    prisma.workspaceMember.count({ where: { workspaceId } }),
  ]);

  const stats = [
    { label: "전체 사용자", value: totalUsers, unit: "명" },
    { label: "대기중 승인", value: allPendingApprovals.length, unit: "건" },
    { label: "오늘 출근", value: todayAttendanceRecords.length, unit: "명" },
    { label: "이번 주 완료", value: weekDoneTasks, unit: "개" },
  ];

  const todayLabel = format(now, "yyyy년 M월 d일 (EEE)", { locale: ko });
  const urgentCards = urgentTasks.map((task) => ({
    id: task.id,
    title: task.title,
    sub: `${task.project?.name ?? "프로젝트 없음"} · ${task.dueDate ? format(new Date(task.dueDate), "M/d 마감", { locale: ko }) : "일정 미정"}`,
    link: task.project?.id ? `/projects?projectId=${task.project.id}` : "/projects",
  }));
  const noticeCards = recentNotices.map((notice) => ({
    id: notice.id,
    title: notice.title,
    sub: format(new Date(notice.createdAt), "M/d 등록", { locale: ko }),
  }));

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid #F0EBE0",
        }}
      >
        <div>
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#0D0D0D", margin: 0 }}>
            관리자 홈
          </h1>
          <p style={{ fontSize: "12px", color: "#999", marginTop: "2px" }}>{todayLabel}</p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1.5rem",
        }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "#fff",
              border: "1px solid #E8E0C8",
              borderRadius: "12px",
              padding: "1.125rem",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            <p style={{ fontSize: "11px", color: "#999", marginBottom: "0.375rem" }}>{stat.label}</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0D0D0D", lineHeight: 1.1 }}>
              {stat.value}
              <span
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 400,
                  color: "#999",
                  marginLeft: "3px",
                }}
              >
                {stat.unit}
              </span>
            </p>
          </div>
        ))}
      </div>

      {urgentCards.length > 0 ? (
        <div style={{ marginBottom: "1.25rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "10px",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "20px",
              marginBottom: "8px",
              background: "var(--danger-light)",
              color: "var(--danger)",
            }}
          >
            <div
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: "currentColor",
              }}
            />
            즉시 확인 필요
          </div>
          {urgentCards.map((card) => (
            <a key={card.id} href={card.link} style={{ textDecoration: "none" }}>
              <div
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  border: "1px solid #E8E0C8",
                  marginBottom: "8px",
                  overflow: "hidden",
                  display: "flex",
                }}
              >
                <div style={{ width: "4px", background: "var(--danger)", flexShrink: 0 }} />
                <div
                  style={{
                    flex: 1,
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: "var(--danger-light)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: "16px",
                    }}
                  >
                    긴급
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "var(--danger)",
                        marginBottom: "2px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {card.title}
                    </div>
                    <div style={{ fontSize: "11px", color: "#888" }}>{card.sub}</div>
                  </div>
                  <span className="primary-button btn--sm">바로 확인</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : null}

      {noticeCards.length > 0 ? (
        <div style={{ marginBottom: "1.25rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "10px",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "20px",
              marginBottom: "8px",
              background: "var(--border-light)",
              color: "var(--text-muted)",
            }}
          >
            <div
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: "currentColor",
              }}
            />
            참고 정보
          </div>
          {noticeCards.map((card) => (
            <div
              key={card.id}
              style={{
                background: "#fff",
                borderRadius: "12px",
                border: "1px solid #E8E0C8",
                marginBottom: "8px",
                overflow: "hidden",
                display: "flex",
              }}
            >
              <div style={{ width: "4px", background: "#D4B896", flexShrink: 0 }} />
              <div
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "var(--surface-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: "16px",
                  }}
                >
                  공지
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#555",
                      marginBottom: "2px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {card.title}
                  </div>
                  <div style={{ fontSize: "11px", color: "#888" }}>{card.sub}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <section
        style={{
          background: "#fff",
          border: "1px solid #E8E0C8",
          borderRadius: "12px",
          padding: "1.25rem",
          marginBottom: "1.25rem",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <h2
          style={{
            fontFamily: "Noto Serif KR, serif",
            fontSize: "1rem",
            fontWeight: 600,
            color: "#0D0D0D",
            marginBottom: "1rem",
          }}
        >
          결재 처리 목록
        </h2>

        {allPendingApprovals.length === 0 ? (
          <p style={{ fontSize: "0.875rem", color: "#999", textAlign: "center", padding: "1.5rem 0" }}>
            처리 대기 중인 요청이 없습니다.
          </p>
        ) : (
          <AdminApprovalPanel initialApprovals={allPendingApprovals} />
        )}
      </section>

      <section
        style={{
          background: "#fff",
          border: "1px solid #E8E0C8",
          borderRadius: "12px",
          padding: "1.25rem",
          marginBottom: "1.25rem",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <h2
          style={{
            fontFamily: "Noto Serif KR, serif",
            fontSize: "1rem",
            fontWeight: 600,
            color: "#0D0D0D",
            marginBottom: "1rem",
          }}
        >
                  오늘 출퇴근
        </h2>
        {todayAttendanceRecords.length === 0 ? (
          <p style={{ fontSize: "0.875rem", color: "#999" }}>오늘 출근 기록이 없습니다.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F5EED5" }}>
                {["이름", "출근", "퇴근", "상태"].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      padding: "8px 14px",
                      textAlign: "left",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#7A6A4A",
                      borderBottom: "0.5px solid #F0EBE0",
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {todayAttendanceRecords.map((attendance) => {
                const status = ATTENDANCE_STATUS[attendance.status] ?? {
                  label: attendance.status,
                  color: "var(--text-secondary)",
                  bg: "var(--border-light)",
                };

                return (
                  <tr key={attendance.id} style={{ borderBottom: "0.5px solid #F0EBE0" }}>
                    <td style={{ padding: "8px 14px", fontSize: "12px", fontWeight: 500, color: "#0D0D0D" }}>
                      {attendance.user.name}
                    </td>
                    <td style={{ padding: "8px 14px", fontSize: "12px", color: "#2D2D2D" }}>
                      {attendance.checkIn ? format(new Date(attendance.checkIn), "HH:mm") : "-"}
                    </td>
                    <td style={{ padding: "8px 14px", fontSize: "12px", color: "#2D2D2D" }}>
                      {attendance.checkOut ? format(new Date(attendance.checkOut), "HH:mm") : "-"}
                    </td>
                    <td style={{ padding: "8px 14px" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "20px",
                          background: status.bg,
                          color: status.color,
                        }}
                      >
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section
        style={{
          background: "#fff",
          border: "1px solid #E8E0C8",
          borderRadius: "12px",
          padding: "1.25rem",
          marginBottom: "1.25rem",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <h2
          style={{
            fontFamily: "Noto Serif KR, serif",
            fontSize: "1rem",
            fontWeight: 600,
            color: "#0D0D0D",
            marginBottom: "1rem",
          }}
        >
          프로젝트 진행률
        </h2>
        {activeProjects.length === 0 ? (
          <p style={{ fontSize: "0.875rem", color: "#999" }}>진행 중인 프로젝트가 없습니다.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
            {activeProjects.map((project) => {
              const total = project._count.tasks;
              const done = project.tasks.length;
              const percent = total === 0 ? 0 : Math.round((done / total) * 100);
              return (
                <div key={project.id} style={{ border: "1px solid #E8E0C8", borderRadius: "8px", padding: "0.875rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: project.color, flexShrink: 0 }} />
                    <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0D0D0D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {project.name}
                    </p>
                  </div>
                  <div style={{ background: "#E8E0C8", borderRadius: "9999px", height: "6px", marginBottom: "4px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${percent}%`, background: "#F56B23", borderRadius: "9999px" }} />
                  </div>
                  <p style={{ fontSize: "11px", color: "#999" }}>
                    {done}/{total} 완료 ({percent}%)
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {workspace ? (
        <InviteCodePanel inviteCode={workspace.inviteCode} workspaceName={workspace.name} />
      ) : null}

      {process.env.NODE_ENV === "development" ? <DevResetButton /> : null}

      <section
        style={{
          background: "#fff",
          border: "1px solid #E8E0C8",
          borderRadius: "12px",
          padding: "1.25rem",
          marginTop: "1.25rem",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <h2
          style={{
            fontFamily: "Noto Serif KR, serif",
            fontSize: "1rem",
            fontWeight: 600,
            color: "#0D0D0D",
            marginBottom: "1rem",
          }}
        >
          결재 히스토리
        </h2>
        {decisionHistory.length === 0 ? (
          <p style={{ fontSize: "0.875rem", color: "#999" }}>처리된 요청이 없습니다.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F5EED5" }}>
                  {["유형", "제목", "요청자", "결정", "처리일"].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: "8px 14px",
                        textAlign: "left",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#7A6A4A",
                        borderBottom: "0.5px solid #F0EBE0",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {decisionHistory.map((approval, index) => {
                  const typeTone = getApprovalTypeTone(approval.type);
                  return (
                    <tr
                      key={approval.id}
                      style={{
                        background: index % 2 === 0 ? "#fff" : "#FAF7EE",
                        borderBottom: "0.5px solid #F0EBE0",
                      }}
                    >
                      <td style={{ padding: "8px 14px", fontSize: "12px" }}>
                        <span
                          style={{
                            background: typeTone.background,
                            color: typeTone.color,
                            borderRadius: "9999px",
                            padding: "2px 8px",
                            fontWeight: 600,
                          }}
                        >
                          {APPROVAL_TYPE_LABELS[approval.type] ?? approval.type}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "8px 14px",
                          fontSize: "12px",
                          color: "#2D2D2D",
                          maxWidth: "12rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {approval.title}
                      </td>
                      <td style={{ padding: "8px 14px", fontSize: "12px", color: "#555" }}>
                        {approval.requester.name}
                      </td>
                      <td style={{ padding: "8px 14px" }}>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "9999px",
                            background:
                              approval.status === "APPROVED"
                                ? "var(--success-light)"
                                : "var(--danger-light)",
                            color:
                              approval.status === "APPROVED" ? "#15803d" : "var(--danger)",
                          }}
                        >
                          {approval.status === "APPROVED" ? "승인" : "거절"}
                        </span>
                      </td>
                      <td style={{ padding: "8px 14px", fontSize: "11px", color: "#999", whiteSpace: "nowrap" }}>
                        {approval.decidedAt ? format(new Date(approval.decidedAt), "M/d HH:mm", { locale: ko }) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
