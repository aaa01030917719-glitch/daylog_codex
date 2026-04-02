import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ApprovalStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { InviteCodePanel } from "@/components/dashboard/InviteCodePanel";
import { DevResetButton } from "@/components/dashboard/DevResetButton";
import { AdminApprovalPanel } from "@/components/dashboard/AdminApprovalPanel";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { getProjectBaseSelect, hasProjectSubtitleColumn } from "@/lib/project-column-support";

const APPROVAL_TYPE_LABELS: Record<string, string> = {
  LEAVE_REQUEST: "휴가·반차",
  IMPORTANT_EVENT: "중요일정",
  DEADLINE_CHANGE: "마감변경",
  BUDGET_TASK: "예산",
  PROJECT_REVIEW: "완성본검토",
};

const ATTENDANCE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  NORMAL:      { label: "정상 출근", color: "#15803d", bg: "#DCFCE7" },
  LATE:        { label: "지각",     color: "#92400e", bg: "#FEF3C7" },
  ABSENT:      { label: "미출근",   color: "#c53030", bg: "#FEF2F2" },
  HOLIDAY:     { label: "휴가",     color: "#888",    bg: "#F1EFE8" },
  EARLY_LEAVE: { label: "조퇴",     color: "#3B5BDB", bg: "#EEF3FC" },
  OVERTIME:    { label: "초과근무", color: "#F56B23", bg: "#FEF0E8" },
};

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "OWNER") redirect("/");

  const workspaceId = session.user.workspaceId ?? "";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const tomorrow   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 0, 0, 0, 0);

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
    // 마감 D-1 이내 미완료 태스크
    prisma.task.findMany({
      where: {
        project: { workspaceId },
        status: { not: "DONE" },
        dueDate: { lte: tomorrow },
        NOT: { dueDate: null },
      },
      include: { project: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    // 최근 공지 2개
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

  const pendingApprovals = allPendingApprovals.length;
  const todayAttendanceCount = todayAttendanceRecords.length;

  const stats = [
    { label: "전체 사용자", value: totalUsers, unit: "명" },
    { label: "대기중 승인", value: pendingApprovals, unit: "건" },
    { label: "오늘 출근", value: todayAttendanceCount, unit: "명" },
    { label: "이번 주 완료", value: weekDoneTasks, unit: "개" },
  ];

  const todayStr = format(new Date(), "yyyy년 M월 d일 (E)", { locale: ko });

  // 긴급도 카드 데이터 구성
  const urgentCards = urgentTasks.map((t) => ({
    id: t.id,
    title: t.title,
    sub: `${t.project?.name ?? "프로젝트 없음"} · ${t.dueDate ? format(new Date(t.dueDate), "M/d 마감") : ""}`,
    link: `/projects`,
  }));

  const pendingCards = allPendingApprovals.slice(0, 5).map((a) => ({
    id: a.id,
    title: a.title,
    sub: `${a.requester.name} · ${APPROVAL_TYPE_LABELS[a.type] ?? a.type}`,
    type: a.type,
    requesterId: a.requester.id,
    requesterName: a.requester.name,
  }));

  const noticeCards = recentNotices.map((n) => ({
    id: n.id,
    title: n.title,
    sub: format(new Date(n.createdAt), "M/d 등록"),
  }));

  return (
    <div>
      {/* ── 페이지 헤더 [관리자-1] ─────────────────────────────── */}
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
          <p style={{ fontSize: "12px", color: "#999", marginTop: "2px" }}>{todayStr}</p>
        </div>
      </div>

      {/* ── 통계 카드 ───────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
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
            <p style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0D0D0D", lineHeight: 1 }}>
              {stat.value}
              <span style={{ fontSize: "0.8125rem", fontWeight: 400, color: "#999", marginLeft: "3px" }}>{stat.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* ── [관리자-2] 긴급도 3단계 카드 ─────────────────────────── */}

      {/* 1단계: 즉시 조치 필요 */}
      {urgentCards.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            fontSize: "10px", fontWeight: 600,
            padding: "2px 8px", borderRadius: "20px", marginBottom: "8px",
            background: "#FEF2F2", color: "#c53030",
          }}>
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "currentColor" }} />
            즉시 조치 필요
          </div>
          {urgentCards.map((card) => (
            <a key={card.id} href={card.link} style={{ textDecoration: "none" }}>
              <div style={{
                background: "#fff", borderRadius: "12px",
                border: "1px solid #E8E0C8", marginBottom: "8px",
                overflow: "hidden", display: "flex",
              }}>
                <div style={{ width: "4px", background: "#e53e3e", flexShrink: 0 }} />
                <div style={{ flex: 1, padding: "12px 14px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "8px",
                    background: "#FEF2F2", display: "flex", alignItems: "center",
                    justifyContent: "center", flexShrink: 0, fontSize: "16px",
                  }}>🚨</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#c53030", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {card.title}
                    </div>
                    <div style={{ fontSize: "11px", color: "#888" }}>{card.sub}</div>
                  </div>
                  <button style={{
                    background: "#FEF2F2", color: "#c53030",
                    border: "1px solid #FECACA", borderRadius: "8px",
                    padding: "7px 14px", fontSize: "12px", fontWeight: 600,
                    cursor: "pointer", whiteSpace: "nowrap",
                  }}>바로 확인</button>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* 2단계: 확인 필요 (컨펌 대기) */}
      {pendingCards.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            fontSize: "10px", fontWeight: 600,
            padding: "2px 8px", borderRadius: "20px", marginBottom: "8px",
            background: "#FEF0E8", color: "#C05621",
          }}>
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "currentColor" }} />
            확인 필요
          </div>
          {pendingCards.map((card) => (
            <div key={card.id} style={{
              background: "#fff", borderRadius: "12px",
              border: "1px solid #E8E0C8", marginBottom: "8px",
              overflow: "hidden", display: "flex",
            }}>
              <div style={{ width: "4px", background: "#F56B23", flexShrink: 0 }} />
              <div style={{ flex: 1, padding: "12px 14px", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "8px",
                  background: "#FEF0E8", display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0, fontSize: "16px",
                }}>📋</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#C05621", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {card.title}
                  </div>
                  <div style={{ fontSize: "11px", color: "#888" }}>{card.sub}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3단계: 참고 정보 (공지) */}
      {noticeCards.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            fontSize: "10px", fontWeight: 600,
            padding: "2px 8px", borderRadius: "20px", marginBottom: "8px",
            background: "#FAF7EE", color: "#A07850",
          }}>
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "currentColor" }} />
            참고 정보
          </div>
          {noticeCards.map((card) => (
            <div key={card.id} style={{
              background: "#fff", borderRadius: "12px",
              border: "1px solid #E8E0C8", marginBottom: "8px",
              overflow: "hidden", display: "flex",
            }}>
              <div style={{ width: "4px", background: "#D4B896", flexShrink: 0 }} />
              <div style={{ flex: 1, padding: "12px 14px", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "8px",
                  background: "#FAF7EE", display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0, fontSize: "16px",
                }}>📢</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#555", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {card.title}
                  </div>
                  <div style={{ fontSize: "11px", color: "#888" }}>{card.sub}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── [관리자-3] 컨펌 대기 전체 목록 ─────────────────────────── */}
      <section style={{ background: "#fff", border: "1px solid #E8E0C8", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <h2 style={{ fontFamily: "Noto Serif KR, serif", fontSize: "1rem", fontWeight: 600, color: "#0D0D0D", marginBottom: "1rem" }}>
          컨펌 대기 목록
        </h2>

        {allPendingApprovals.length === 0 ? (
          <p style={{ fontSize: "0.875rem", color: "#999", textAlign: "center", padding: "1.5rem 0" }}>
            처리 대기 중인 요청이 없습니다.
          </p>
        ) : (
          <AdminApprovalPanel initialApprovals={allPendingApprovals} />
        )}
      </section>

      {/* ── [관리자-4] 팀 출퇴근 현황 ────────────────────────────── */}
      <section style={{ background: "#fff", border: "1px solid #E8E0C8", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <h2 style={{ fontFamily: "Noto Serif KR, serif", fontSize: "1rem", fontWeight: 600, color: "#0D0D0D", marginBottom: "1rem" }}>
          팀 출퇴근 현황
        </h2>
        {todayAttendanceRecords.length === 0 ? (
          <p style={{ fontSize: "0.875rem", color: "#999" }}>오늘 출근 기록이 없습니다.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F5EED5" }}>
                {["이름", "출근", "퇴근", "상태"].map((h) => (
                  <th key={h} style={{
                    padding: "8px 14px", textAlign: "left",
                    fontSize: "11px", fontWeight: 600, color: "#7A6A4A",
                    borderBottom: "0.5px solid #F0EBE0",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {todayAttendanceRecords.map((a) => {
                const s = ATTENDANCE_STATUS[a.status] ?? { label: a.status, color: "#555", bg: "#F5EED5" };
                return (
                  <tr key={a.id} style={{ borderBottom: "0.5px solid #F0EBE0" }}>
                    <td style={{ padding: "8px 14px", fontSize: "12px", fontWeight: 500, color: "#0D0D0D" }}>
                      {a.user.name}
                    </td>
                    <td style={{ padding: "8px 14px", fontSize: "12px", color: "#2D2D2D" }}>
                      {a.checkIn ? format(new Date(a.checkIn), "HH:mm") : "-"}
                    </td>
                    <td style={{ padding: "8px 14px", fontSize: "12px", color: "#2D2D2D" }}>
                      {a.checkOut ? format(new Date(a.checkOut), "HH:mm") : "-"}
                    </td>
                    <td style={{ padding: "8px 14px" }}>
                      <span style={{
                        fontSize: "10px", fontWeight: 600,
                        padding: "2px 8px", borderRadius: "20px",
                        background: s.bg, color: s.color,
                      }}>
                        {s.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* ── 프로젝트 진행률 ───────────────────────────────────────── */}
      <section style={{ background: "#fff", border: "1px solid #E8E0C8", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <h2 style={{ fontFamily: "Noto Serif KR, serif", fontSize: "1rem", fontWeight: 600, color: "#0D0D0D", marginBottom: "1rem" }}>
          프로젝트 진행률
        </h2>
        {activeProjects.length === 0 ? (
          <p style={{ fontSize: "0.875rem", color: "#999" }}>진행 중인 프로젝트가 없습니다.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
            {activeProjects.map((p) => {
              const total = p._count.tasks;
              const done = p.tasks.length;
              const pct = total === 0 ? 0 : Math.round((done / total) * 100);
              return (
                <div key={p.id} style={{ border: "1px solid #E8E0C8", borderRadius: "8px", padding: "0.875rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                    <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0D0D0D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name}
                    </p>
                  </div>
                  <div style={{ background: "#E8E0C8", borderRadius: "9999px", height: "6px", marginBottom: "4px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "#F56B23", borderRadius: "9999px" }} />
                  </div>
                  <p style={{ fontSize: "11px", color: "#999" }}>{done}/{total} 완료 ({pct}%)</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 워크스페이스 초대 ───────────────────────────────────── */}
      {workspace && (
        <InviteCodePanel inviteCode={workspace.inviteCode} workspaceName={workspace.name} />
      )}

      {/* Dev reset */}
      {process.env.NODE_ENV === "development" && <DevResetButton />}

      {/* ── 컨펌 히스토리 ────────────────────────────────────────── */}
      <section style={{ background: "#fff", border: "1px solid #E8E0C8", borderRadius: "12px", padding: "1.25rem", marginTop: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <h2 style={{ fontFamily: "Noto Serif KR, serif", fontSize: "1rem", fontWeight: 600, color: "#0D0D0D", marginBottom: "1rem" }}>
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
                    <th key={h} style={{
                      padding: "8px 14px", textAlign: "left",
                      fontSize: "11px", fontWeight: 600, color: "#7A6A4A",
                      borderBottom: "0.5px solid #F0EBE0", whiteSpace: "nowrap",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {decisionHistory.map((a, idx) => (
                  <tr key={a.id} style={{ background: idx % 2 === 0 ? "#fff" : "#FAF7EE", borderBottom: "0.5px solid #F0EBE0" }}>
                    <td style={{ padding: "8px 14px", fontSize: "12px" }}>
                      <span style={{ background: "#FEF0E8", color: "#F56B23", borderRadius: "9999px", padding: "2px 8px", fontWeight: 600 }}>
                        {APPROVAL_TYPE_LABELS[a.type] ?? a.type}
                      </span>
                    </td>
                    <td style={{ padding: "8px 14px", fontSize: "12px", color: "#2D2D2D", maxWidth: "12rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.title}
                    </td>
                    <td style={{ padding: "8px 14px", fontSize: "12px", color: "#555" }}>
                      {a.requester.name}
                    </td>
                    <td style={{ padding: "8px 14px" }}>
                      <span style={{
                        fontSize: "10px", fontWeight: 600,
                        padding: "2px 8px", borderRadius: "9999px",
                        background: a.status === "APPROVED" ? "#DCFCE7" : "#FEF2F2",
                        color: a.status === "APPROVED" ? "#15803d" : "#c53030",
                      }}>
                        {a.status === "APPROVED" ? "승인" : "거절"}
                      </span>
                    </td>
                    <td style={{ padding: "8px 14px", fontSize: "11px", color: "#999", whiteSpace: "nowrap" }}>
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
