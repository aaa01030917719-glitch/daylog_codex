"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FolderOpen, Plus } from "lucide-react";
import { ProjectCreateModal } from "@/components/modals/ProjectCreateModal";
import { ProjectBoardLayout } from "@/components/projects/ProjectBoardLayout";
import { ProjectCalendarView } from "@/components/projects/ProjectCalendarView";
import { ProjectGanttView } from "@/components/projects/ProjectGanttView";
import { ProjectStatusTabs } from "@/components/projects/ProjectStatusTabs";
import { ProjectViewToggle } from "@/components/projects/ProjectViewToggle";
import type {
  ProjectBoardStatus,
  ProjectMember,
  ProjectSummary,
  ProjectViewMode,
} from "@/components/projects/project-board-types";

interface ProjectsBoardClientProps {
  initialProjects: ProjectSummary[];
  isAdmin: boolean;
  members: ProjectMember[];
  initialStatus: ProjectBoardStatus;
  initialView: ProjectViewMode;
}

interface ProjectMutationResponse {
  id: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  color: string;
  status: string;
  budget: number | null;
  createdAt?: string;
  doneTasks?: number;
  progress?: number | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  _count?: { tasks: number };
}

function buildProjectUrl(
  pathname: string,
  params: URLSearchParams,
  status: ProjectBoardStatus,
  view: ProjectViewMode
) {
  const nextParams = new URLSearchParams(params.toString());

  if (status === "ALL") {
    nextParams.delete("status");
  } else {
    nextParams.set("status", status);
  }

  if (view === "LIST") {
    nextParams.delete("view");
  } else {
    nextParams.set("view", view);
  }

  const query = nextParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function deriveBoardStatus(project: {
  status: string;
  startDate: string | null;
  endDate: string | null;
}) {
  const todayStart = startOfToday();

  if (project.status === "ARCHIVED") {
    return "COMPLETED" as const;
  }

  if (project.endDate && new Date(project.endDate).getTime() < todayStart.getTime()) {
    return "COMPLETED" as const;
  }

  if (project.startDate && new Date(project.startDate).getTime() > todayStart.getTime()) {
    return "UPCOMING" as const;
  }

  return "ONGOING" as const;
}

function normalizeProject(
  project: ProjectMutationResponse,
  fallback?: ProjectSummary
) {
  const totalTasks = project._count?.tasks ?? fallback?.totalTasks ?? 0;
  const doneTasks = project.doneTasks ?? fallback?.doneTasks ?? 0;
  const startDate =
    project.startDate instanceof Date
      ? project.startDate.toISOString()
      : project.startDate ?? fallback?.startDate ?? null;
  const endDate =
    project.endDate instanceof Date
      ? project.endDate.toISOString()
      : project.endDate ?? fallback?.endDate ?? null;
  const derivedProgress =
    totalTasks > 0
      ? Math.round((doneTasks / totalTasks) * 100)
      : project.status === "ARCHIVED"
        ? 100
        : 0;
  const progress = Math.min(
    100,
    Math.max(0, Math.round(project.progress ?? fallback?.progress ?? derivedProgress))
  );

  return {
    ...project,
    createdAt: project.createdAt ?? fallback?.createdAt ?? new Date().toISOString(),
    totalTasks,
    doneTasks,
    progress,
    boardStatus: deriveBoardStatus({
      status: project.status,
      startDate,
      endDate,
    }),
    assigneeNames: fallback?.assigneeNames ?? [],
    tags: fallback?.tags ?? [],
    startDate,
    endDate,
    tasks: fallback?.tasks ?? [],
  };
}

function completeProjectLocally(project: ProjectSummary): ProjectSummary {
  return {
    ...project,
    status: "ARCHIVED",
    boardStatus: "COMPLETED",
    progress: project.totalTasks === 0 ? 100 : project.progress,
  };
}

async function readError(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? "프로젝트 완료 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  } catch {
    return "프로젝트 완료 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }
}

export function ProjectsBoardClient({
  initialProjects,
  isAdmin,
  members,
  initialStatus,
  initialView,
}: ProjectsBoardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<ProjectSummary[]>(initialProjects);
  const [activeStatus, setActiveStatus] = useState<ProjectBoardStatus>(initialStatus);
  const [viewMode, setViewMode] = useState<ProjectViewMode>(initialView);
  const [showModal, setShowModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [processingProjectId, setProcessingProjectId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      ALL: projects.length,
      ONGOING: projects.filter((project) => project.boardStatus === "ONGOING").length,
      COMPLETED: projects.filter((project) => project.boardStatus === "COMPLETED").length,
      UPCOMING: projects.filter((project) => project.boardStatus === "UPCOMING").length,
    }),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    if (activeStatus === "ALL") {
      return projects;
    }

    return projects.filter((project) => project.boardStatus === activeStatus);
  }, [activeStatus, projects]);

  const columns = useMemo(
    () => ({
      ONGOING: filteredProjects.filter((project) => project.boardStatus === "ONGOING"),
      UPCOMING: filteredProjects.filter((project) => project.boardStatus === "UPCOMING"),
      COMPLETED: filteredProjects.filter((project) => project.boardStatus === "COMPLETED"),
    }),
    [filteredProjects]
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );
  const showsGanttView = viewMode === "GANTT";

  function syncRoute(nextStatus: ProjectBoardStatus, nextView: ProjectViewMode) {
    const href = buildProjectUrl(
      pathname,
      new URLSearchParams(searchParams.toString()),
      nextStatus,
      nextView
    );
    router.replace(href, { scroll: false });
  }

  function handleStatusChange(status: ProjectBoardStatus) {
    setActiveStatus(status);
    syncRoute(status, viewMode);
  }

  function handleViewChange(view: ProjectViewMode) {
    setViewMode(view);
    syncRoute(activeStatus, view);
  }

  async function handleCompleteProject(project: ProjectSummary) {
    if (processingProjectId || project.status === "ARCHIVED") {
      return;
    }

    const previousProjects = projects;
    const previousStatus = activeStatus;
    const shouldSwitchToCompleted = activeStatus !== "ALL" && activeStatus !== "COMPLETED";

    setErrorMessage(null);
    setProcessingProjectId(project.id);
    setProjects((current) =>
      current.map((item) => (item.id === project.id ? completeProjectLocally(item) : item))
    );

    if (shouldSwitchToCompleted) {
      setActiveStatus("COMPLETED");
      syncRoute("COMPLETED", viewMode);
    }

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });

      if (!response.ok) {
        setProjects(previousProjects);
        if (shouldSwitchToCompleted) {
          setActiveStatus(previousStatus);
          syncRoute(previousStatus, viewMode);
        }
        setErrorMessage(await readError(response));
      }
    } catch {
      setProjects(previousProjects);
      if (shouldSwitchToCompleted) {
        setActiveStatus(previousStatus);
        syncRoute(previousStatus, viewMode);
      }
      setErrorMessage("프로젝트 완료 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setProcessingProjectId(null);
    }
  }

  const isEmpty = !showsGanttView && filteredProjects.length === 0;

  return (
    <div className="page-shell">
      <section className="page-header">
        <div className="page-header__meta">
          <div className="page-header__eyebrow">Project Board</div>
          <h1 className="page-title">프로젝트</h1>
          <p className="page-subtitle">
            {showsGanttView
              ? "업무별 일정과 진행 상황을 한눈에 확인하세요."
              : "전체, 진행 중, 완료, 예정 상태를 기준으로 프로젝트 흐름을 한 번에 확인하세요."}
          </p>
        </div>

        <div className="page-actions">
          <ProjectViewToggle viewMode={viewMode} onChange={handleViewChange} />
          {isAdmin ? (
            <button type="button" onClick={() => setShowModal(true)} className="primary-button">
              <Plus size={16} />
              프로젝트 추가
            </button>
          ) : null}
        </div>
      </section>

      {showsGanttView ? (
        errorMessage ? (
          <div className="mb-4 rounded-2xl border border-[#fecaca] bg-[var(--danger-light)] px-4 py-3 text-sm font-medium text-[#b42318]">
            {errorMessage}
          </div>
        ) : null
      ) : (
        <section className="page-control-strip">
          <ProjectStatusTabs
            activeStatus={activeStatus}
            counts={counts}
            onChange={handleStatusChange}
          />
          {errorMessage ? (
            <div className="rounded-2xl border border-[#fecaca] bg-[var(--danger-light)] px-4 py-3 text-sm font-medium text-[#b42318]">
              {errorMessage}
            </div>
          ) : null}
        </section>
      )}

      {isEmpty ? (
        <section className="empty-panel min-h-[280px]">
          <FolderOpen size={44} className="text-[var(--text-muted)]" />
          <p className="empty-panel__title">표시할 프로젝트가 없습니다.</p>
          <p className="empty-panel__description">선택한 상태에 맞는 프로젝트가 생기면 이 영역에 표시됩니다.</p>
          {isAdmin ? (
            <button type="button" onClick={() => setShowModal(true)} className="text-button">
              새 프로젝트 만들기
            </button>
          ) : null}
        </section>
      ) : viewMode === "LIST" ? (
        <ProjectBoardLayout
          activeStatus={activeStatus}
          columns={columns}
          processingProjectId={processingProjectId}
          onCompleteProject={handleCompleteProject}
          onSelectProject={(project) => setSelectedProjectId(project.id)}
        />
      ) : viewMode === "GANTT" ? (
        <ProjectGanttView projects={projects} />
      ) : (
        <ProjectCalendarView projects={filteredProjects} />
      )}

      {showModal ? (
        <ProjectCreateModal
          members={members}
          onCreated={(project) => {
            const normalizedProject = normalizeProject(project);
            setProjects((current) => [normalizedProject, ...current]);
            if (
              normalizedProject.boardStatus === "COMPLETED" &&
              activeStatus !== "ALL" &&
              activeStatus !== "COMPLETED"
            ) {
              setActiveStatus("COMPLETED");
              syncRoute("COMPLETED", viewMode);
            }
            setShowModal(false);
          }}
          onClose={() => setShowModal(false)}
        />
      ) : null}
      {selectedProject ? (
        <ProjectCreateModal
          members={members}
          project={selectedProject}
          onSaved={(project) => {
            setProjects((current) =>
              current.map((item) =>
                item.id === project.id ? normalizeProject(project, item) : item
              )
            );
            setSelectedProjectId(null);
          }}
          onClose={() => setSelectedProjectId(null)}
        />
      ) : null}
    </div>
  );
}
