"use client";

import { useState } from "react";
import Link from "next/link";
import { WorkspaceCheckinCard } from "@/components/dashboard/WorkspaceCheckinCard";
import {
  WorkspaceMonthCalendar,
  type WorkspaceCalendarEvent,
  type WorkspaceLeaveMarker,
} from "@/components/dashboard/WorkspaceMonthCalendar";
import { TaskDetailModal } from "@/components/modals/TaskDetailModal";

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
  tasks: Array<{
    id: string;
    title: string;
    statusLabel: string;
  }>;
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

function MoreLink({ href, label = "더 보기" }: { href: string; label?: string }) {
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
        <h2 className="card-title">📢 팀 공지</h2>
        <MoreLink href="/notices" />
      </div>
      <div className="card-body workspace-card-body--tight-top">
        {notices.length === 0 ? (
          <div className="empty-panel">
            <p className="empty-panel__title">등록된 공지사항이 없어요.</p>
            <p className="empty-panel__description">
              새 공지가 올라오면 이곳에서 바로 확인할 수 있어요.
            </p>
          </div>
        ) : (
          <div className="workspace-notice-list">
            {notices.slice(0, 2).map((notice) => (
              <Link key={notice.id} href={`/notices/${notice.id}`} className="workspace-notice-item">
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
                  <div className="workspace-notice-item__meta">{notice.createdAt}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ProjectSection({ projects }: { projects: ProjectPreview[] }) {
  return (
    <section className="card-panel">
      <div className="card-header">
        <h2 className="card-title">📁 진행 중인 프로젝트</h2>
        <MoreLink href="/projects" />
      </div>
      <div className="card-body workspace-card-body--tight-top">
        {projects.length === 0 ? (
          <div className="empty-panel">
            <p className="empty-panel__title">표시할 프로젝트가 없어요.</p>
            <p className="empty-panel__description">
              프로젝트가 시작되면 진행 상황을 여기서 볼 수 있어요.
            </p>
          </div>
        ) : (
          <div className="workspace-project-list workspace-project-list--scroll custom-scroll">
            {projects.map((project) => (
              <Link
                key={project.id}
                // 0403 테스크 화면 안쓰는중
                // href={`/projects/${project.id}`}
                href={`/projects?projectId=${project.id}`}
                className="workspace-project-item"
              >
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
                {project.tasks.length > 0 ? (
                  <div className="mt-3 rounded-[14px] border border-[var(--border-light)] bg-[var(--surface-2)] px-3 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)]">
                      진행 중인 태스크
                    </div>
                    <div className="mt-2 space-y-2">
                      {project.tasks.slice(0, 3).map((task) => (
                        <div key={task.id} className="flex items-center gap-2">
                          <span className="status-badge status-badge--accent">{task.statusLabel}</span>
                          <span className="min-w-0 truncate text-sm text-[var(--text-secondary)]">
                            {task.title}
                          </span>
                        </div>
                      ))}
                      {project.tasks.length > 3 ? (
                        <div className="text-xs text-[var(--text-muted)]">
                          +{project.tasks.length - 3}개 더 보기
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function getTaskPeriodLabel(label: string) {
  return label.startsWith("#") ? label.slice(1) : label;
}

function TaskSection({ tasks }: { tasks: ProjectPreview[] }) {
  const [selectedTask, setSelectedTask] = useState<ProjectPreview | null>(null);

  return (
    <section className="card-panel">
      <div className="card-header">
        <h2 className="card-title">📁 진행 중인 태스크</h2>
        <MoreLink href="/projects" />
      </div>
      <div className="card-body workspace-card-body--tight-top">
        {tasks.length === 0 ? (
          <div className="empty-panel">
            <p className="empty-panel__title">현재 진행 중인 태스크가 없습니다.</p>
            <p className="empty-panel__description">
              새로운 태스크가 생성되면 이곳에 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="workspace-project-list workspace-project-list--scroll custom-scroll">
            {tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                className="workspace-project-item workspace-task-item"
                onClick={() => setSelectedTask(task)}
              >
                <div className="workspace-project-item__top">
                  <span className="workspace-project-item__name">{task.name}</span>
                  <span className="workspace-project-item__pct">{task.progress}%</span>
                </div>
                {task.subtitle ? (
                  <div className="workspace-task-item__project">{task.subtitle}</div>
                ) : null}
                <div className="workspace-project-progress">
                  <div
                    className="workspace-project-progress__fill"
                    style={{ width: `${task.progress}%`, background: task.color || "var(--accent)" }}
                  />
                </div>
                <div className="workspace-project-item__meta">
                  {task.assigneeLabel} · {getTaskPeriodLabel(task.tagLabel)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedTask ? (
        <TaskDetailModal
          isOpen={true}
          onClose={() => setSelectedTask(null)}
          taskId={selectedTask.id}
          projectName={selectedTask.subtitle ?? undefined}
        />
      ) : null}
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
  const hideCheckinCard = userRole === "OWNER";

  return (
    <div className="page-shell">
      <section className="page-header">
        <div className="page-header__meta">
          <h1 className="page-title">안녕하세요, {userName}님 😊</h1>
          <p className="page-subtitle">오늘 하루도 잘 부탁드려요 🙌</p>
        </div>
        
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
          <TaskSection tasks={projects} />
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
      description: `전체 ${params.totalProjects}개 프로젝트 중`,
      href: "/projects",
      icon: "📁",
      tone: "var(--accent)",
    },
    {
      label: "아이디어",
      value: `${params.ideaCount}`,
      description: `팀에 공유된 아이디어 ${params.ideaCount}개`,
      href: "/ideas",
      icon: "💡",
      tone: "var(--purple)",
    },
    {
      label: "검토 대기 중",
      value: `${params.pendingDocs}`,
      description: `결재 요청이 ${params.pendingDocs}건 있어요`,
      href: "/docs",
      icon: "📄",
      tone: "var(--warning)",
    },
    {
      label: "남은 연차",
      value: params.remainingLeave,
      description: `연차 ${params.remainingLeave} 남았어요`,
      href: "/leave",
      icon: "🌴",
      tone: "var(--success)",
    },
  ] satisfies DashboardStatCard[];
}

