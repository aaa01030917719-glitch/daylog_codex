import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { WorkspaceCheckinCard } from "@/components/dashboard/WorkspaceCheckinCard";
import {
  WorkspaceMonthCalendar,
  type WorkspaceCalendarEvent,
  type WorkspaceLeaveMarker,
} from "@/components/dashboard/WorkspaceMonthCalendar";

type AttendanceCode =
  | "NORMAL"
  | "LATE"
  | "HOLIDAY"
  | "EARLY_LEAVE"
  | "OVERTIME"
  | "ABSENT"
  | null;

interface DashboardStatCard {
  label: string;
  value: string;
  description: string;
  href: string;
  icon: string;
  tone: string;
}

interface AttendanceOverview {
  isAdmin: boolean;
  dateLabel: string;
  currentStatusLabel: string;
  currentStatusTone: {
    background: string;
    color: string;
  };
  checkInLabel: string;
  checkOutLabel: string;
  summaryLabel: string;
  hasCheckIn: boolean;
  hasCheckOut: boolean;
  statusCode: AttendanceCode;
  teamCheckedIn: number;
  teamTotal: number;
  lateCount: number;
  holidayCount: number;
  todayRows: Array<{
    id: string;
    name: string;
    statusLabel: string;
    tone: { background: string; color: string };
    checkInLabel: string;
  }>;
}

interface NoticePreview {
  id: string;
  title: string;
  badgeLabel: string;
  badgeTone: {
    background: string;
    color: string;
  };
  createdAt: string;
}

interface ProjectPreview {
  id: string;
  name: string;
  subtitle: string | null;
  progress: number;
  assigneeLabel: string;
  tagLabel: string;
  color: string;
}

interface WorkspaceDashboardProps {
  userName: string;
  userRole?: string | null;
  stats: DashboardStatCard[];
  attendance: AttendanceOverview;
  notices: NoticePreview[];
  events: WorkspaceCalendarEvent[];
  leaveMarkers: WorkspaceLeaveMarker[];
  projects: ProjectPreview[];
}

function MoreLink({ href, label = "더보기" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="secondary-button btn--sm">
      {label}
    </Link>
  );
}

function StatCard({ label, value, description, href, icon, tone }: DashboardStatCard) {
  return (
    <Link href={href} className="workspace-stat-card">
      <div className="workspace-stat-card__icon">{icon}</div>
      <div className="workspace-stat-card__label">{label}</div>
      <div className="workspace-stat-card__value" style={{ color: tone }}>
        {value}
      </div>
      <div className="workspace-stat-card__sub">{description}</div>
    </Link>
  );
}

function NoticeSection({ notices }: { notices: NoticePreview[] }) {
  return (
    <section className="card-panel">
      <div className="card-header">
        <h2 className="card-title">공지사항</h2>
        <MoreLink href="/notices" />
      </div>
      <div className="card-body">
        {notices.length === 0 ? (
          <div className="empty-panel">
            <p className="empty-panel__title">등록된 공지사항이 없습니다.</p>
            <p className="empty-panel__description">
              새 공지가 등록되면 최근 순서대로 이 영역에 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="workspace-notice-list">
            {notices.slice(0, 3).map((notice) => (
              <Link key={notice.id} href="/notices" className="workspace-notice-item">
                <span className="workspace-notice-item__dot" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="workspace-notice-item__title">{notice.title}</div>
                    <span
                      className="status-badge"
                      style={{
                        background: notice.badgeTone.background,
                        color: notice.badgeTone.color,
                      }}
                    >
                      {notice.badgeLabel}
                    </span>
                  </div>
                  <div className="workspace-notice-item__meta">작성일 {notice.createdAt}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ProjectSection({ projects }: { projects: ProjectPreview[] }) {
  return (
    <section className="card-panel">
      <div className="card-header">
        <h2 className="card-title">진행 중인 프로젝트</h2>
        <MoreLink href="/projects?status=ONGOING" />
      </div>
      <div className="card-body">
        {projects.length === 0 ? (
          <div className="empty-panel">
            <p className="empty-panel__title">진행 중인 프로젝트가 없습니다.</p>
            <p className="empty-panel__description">
              프로젝트가 시작되면 진행률과 담당자 정보가 여기에 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="workspace-project-list">
            {projects.slice(0, 3).map((project) => (
              <div key={project.id} className="workspace-project-item">
                <div className="workspace-project-item__top">
                  <span className="workspace-project-item__name">{project.name}</span>
                  <span className="workspace-project-item__pct">{project.progress}%</span>
                </div>
                {project.subtitle ? (
                  <div className="mt-1 text-sm text-[var(--text-secondary)]">{project.subtitle}</div>
                ) : null}
                <div className="workspace-project-progress">
                  <div
                    className="workspace-project-progress__fill"
                    style={{ width: `${project.progress}%`, background: project.color || "var(--accent)" }}
                  />
                </div>
                <div className="workspace-project-item__meta">
                  {project.assigneeLabel} · {project.tagLabel}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function WorkspaceDashboard({
  userName,
  userRole,
  stats,
  attendance,
  notices,
  events,
  leaveMarkers,
  projects,
}: WorkspaceDashboardProps) {
  const messages = [
    "오늘도 차분하게 업무를 시작해볼까요?",
    "이번 주 일정과 진행 상황을 한 번에 정리해드릴게요.",
    "중요한 일정과 결재 요청을 먼저 확인해 보세요.",
    "작은 할 일부터 차근차근 정리해보세요.",
    "한 주의 흐름을 정리하기 좋은 날입니다.",
    "이번 주 마무리까지 안정적으로 이어가볼까요?",
    "다음 주를 준비하기 전에 오늘 현황부터 확인해 보세요.",
  ];

  const today = new Date().getDay();
  const weeklyMessage = messages[today];
  const hideCheckinCard = userRole === "OWNER";

  return (
    <div className="page-shell">
      <section className="page-header">
        <div className="page-header__meta">
          <h1 className="page-title">안녕하세요, {userName}님</h1>
          <p className="page-subtitle">{weeklyMessage}</p>
        </div>
        <div className="summary-chip">{format(new Date(), "yyyy.MM.dd (eee)", { locale: ko })}</div>
      </section>

      <section className="workspace-stats-grid">
        {stats.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </section>

      <section className="workspace-main-grid">
        <div className="workspace-main-column">
          {hideCheckinCard ? null : (
            <WorkspaceCheckinCard
              initialCheckInLabel={attendance.checkInLabel}
              initialCheckOutLabel={attendance.checkOutLabel}
              initialStatusLabel={attendance.currentStatusLabel}
              initialSummaryLabel={attendance.summaryLabel}
              initialHasCheckIn={attendance.hasCheckIn}
              initialHasCheckOut={attendance.hasCheckOut}
            />
          )}
          <WorkspaceMonthCalendar events={events} leaveMarkers={leaveMarkers} />
        </div>

        <div className="workspace-main-column">
          <NoticeSection notices={notices} />
          <ProjectSection projects={projects} />
        </div>
      </section>
    </div>
  );
}

export function buildDashboardStatCards(params: {
  ongoingProjects: number;
  totalProjects: number;
  ideaCount: number;
  pendingDocs: number;
  remainingLeave: string;
}) {
  return [
    {
      label: "진행 중인 프로젝트",
      value: `${params.ongoingProjects}`,
      description: `총 ${params.totalProjects}개 프로젝트`,
      href: "/projects?status=ONGOING",
      icon: "📁",
      tone: "var(--accent)",
    },
    {
      label: "남은 연차",
      value: params.remainingLeave,
      description: "연차 현황은 근무 기록과 함께 관리됩니다.",
      href: "/attendance",
      icon: "🌴",
      tone: "var(--success)",
    },
    {
      label: "대기 중인 문서",
      value: `${params.pendingDocs}`,
      description: `결재 요청 ${params.pendingDocs}건`,
      href: "/docs",
      icon: "📄",
      tone: "var(--warning)",
    },
    {
      label: "아이디어",
      value: `${params.ideaCount}`,
      description: `열람 가능한 아이디어 ${params.ideaCount}건`,
      href: "/ideas",
      icon: "💡",
      tone: "var(--purple)",
    },
  ] satisfies DashboardStatCard[];
}
