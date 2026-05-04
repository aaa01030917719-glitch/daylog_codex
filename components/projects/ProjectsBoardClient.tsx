"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FolderOpen, Plus } from "lucide-react";
import { ProjectCreateModal } from "@/components/modals/ProjectCreateModal";
import { ProjectDetailModal } from "@/components/modals/ProjectDetailModal";
import { ProjectBoardLayout } from "@/components/projects/ProjectBoardLayout";
import { ProjectCalendarView } from "@/components/projects/ProjectCalendarView";
import { ProjectGanttViewRedesign } from "@/components/projects/ProjectGanttViewRedesign";
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
  initialProjectId: string | null;
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
  view: ProjectViewMode,
  projectId: string | null
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

  if (!projectId || projectId === "ALL") {
    nextParams.delete("projectId");
  } else {
    nextParams.set("projectId", projectId);
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
  taskStatuses?: string[];
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

  if (project.taskStatuses?.includes("IN_REVIEW")) {
    return "REVIEW" as const;
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
      taskStatuses: fallback?.tasks.map((task) => task.status) ?? [],
    }),
    assigneeNames: fallback?.assigneeNames ?? [],
    tags: fallback?.tags ?? [],
    startDate,
    endDate,
    tasks: fallback?.tasks ?? [],
    commentCount: fallback?.commentCount ?? 0,
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
  initialProjectId,
}: ProjectsBoardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<ProjectSummary[]>(initialProjects);
  const [activeStatus, setActiveStatus] = useState<ProjectBoardStatus>(initialStatus);
  const [viewMode, setViewMode] = useState<ProjectViewMode>(initialView);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(initialProjectId);
  const [showModal, setShowModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [processingProjectId, setProcessingProjectId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const projectScopedProjects = useMemo(() => {
    if (!activeProjectId) {
      return projects;
    }

    return projects.filter((project) => project.id === activeProjectId);
  }, [activeProjectId, projects]);

  const counts = useMemo(
    () => ({
      ALL: projectScopedProjects.length,
      ONGOING: projectScopedProjects.filter((project) => project.boardStatus === "ONGOING").length,
      REVIEW: projectScopedProjects.filter((project) => project.boardStatus === "REVIEW").length,
      COMPLETED: projectScopedProjects.filter((project) => project.boardStatus === "COMPLETED").length,
      UPCOMING: projectScopedProjects.filter((project) => project.boardStatus === "UPCOMING").length,
    }),
    [projectScopedProjects]
  );

  const filteredProjects = useMemo(() => {
    if (activeStatus === "ALL") {
      return projectScopedProjects;
    }

    return projectScopedProjects.filter((project) => project.boardStatus === activeStatus);
  }, [activeStatus, projectScopedProjects]);

  const columns = useMemo(
    () => ({
      ONGOING: filteredProjects.filter((project) => project.boardStatus === "ONGOING"),
      REVIEW: filteredProjects.filter((project) => project.boardStatus === "REVIEW"),
      UPCOMING: filteredProjects.filter((project) => project.boardStatus === "UPCOMING"),
      COMPLETED: filteredProjects.filter((project) => project.boardStatus === "COMPLETED"),
    }),
    [filteredProjects]
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );
  const editingProject = useMemo(
    () => projects.find((project) => project.id === editingProjectId) ?? null,
    [editingProjectId, projects]
  );
  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [activeProjectId, projects]
  );
  const existingProjectNames = useMemo(
    () => Array.from(new Set(projects.map((project) => project.name).filter(Boolean))),
    [projects]
  );
  const showsGanttView = viewMode === "GANTT";
  const pageTitle =
    activeStatus === "ONGOING"
      ? "진행 중인 프로젝트"
      : activeStatus === "COMPLETED"
        ? "완료된 프로젝트"
        : activeStatus === "UPCOMING"
          ? "예정된 프로젝트"
          : activeStatus === "REVIEW"
            ? "검토 중인 프로젝트"
            : "프로젝트 전체";

  useEffect(() => {
    setActiveStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    setViewMode(initialView);
  }, [initialView]);

  useEffect(() => {
    setActiveProjectId(initialProjectId);
    setSelectedProjectId(null);
  }, [initialProjectId]);

  function syncRoute(
    nextStatus: ProjectBoardStatus,
    nextView: ProjectViewMode,
    nextProjectId: string | null = activeProjectId
  ) {
    const href = buildProjectUrl(
      pathname,
      new URLSearchParams(searchParams.toString()),
      nextStatus,
      nextView,
      nextProjectId
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
          <h1 className="page-title">{pageTitle}</h1>
          <p className="page-subtitle">총 {filteredProjects.length}개</p>
        </div>

        <div className="flex flex-col items-start gap-3 md:items-end">
          <div className="page-actions">
            <ProjectViewToggle viewMode={viewMode} onChange={handleViewChange} />
            {isAdmin ? (
              <button type="button" onClick={() => setShowModal(true)} className="primary-button">
                <Plus size={16} />
                프로젝트 추가
              </button>
            ) : null}
          </div>
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
          <p className="empty-panel__title">표시할 프로젝트가 없어요.</p>
          <p className="empty-panel__description">프로젝트가 생기면 여기서 바로 볼 수 있어요.</p>
          {isAdmin ? (
            <button type="button" onClick={() => setShowModal(true)} className="text-button">
              프로젝트 추가하기
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
        <ProjectGanttViewRedesign
          projects={projects}
          onSelectProject={(project) => setSelectedProjectId(project.id)}
        />
      ) : (
        <ProjectCalendarView projects={filteredProjects} />
      )}

      {showModal ? (
        <ProjectCreateModal
          members={members}
          existingProjectNames={existingProjectNames}
          defaultProjectName={activeProject?.name ?? undefined}
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
        <ProjectDetailModal
          isOpen
          projectId={selectedProject.id}
          defaultTab="tasks"
          project={selectedProject}
          members={members}
          canDelete={isAdmin}
          onEdit={() => {
            setEditingProjectId(selectedProject.id);
            setSelectedProjectId(null);
          }}
          onDeleted={(projectId) => {
            setProjects((current) => current.filter((item) => item.id !== projectId));
            setSelectedProjectId(null);
          }}
          onProgressUpdated={(projectId, progress) => {
            setProjects((current) =>
              current.map((item) =>
                item.id === projectId
                  ? {
                      ...item,
                      progress,
                    }
                  : item
              )
            );
          }}
          onClose={() => setSelectedProjectId(null)}
        />
      ) : null}
      {editingProject ? (
        <ProjectCreateModal
          members={members}
          project={editingProject}
          startInEditMode
          existingProjectNames={existingProjectNames}
          canDelete={isAdmin}
          onSaved={(project) => {
            setProjects((current) =>
              current.map((item) =>
                item.id === project.id ? normalizeProject(project, item) : item
              )
            );
            setEditingProjectId(null);
            setSelectedProjectId(project.id);
          }}
          onDeleted={(projectId) => {
            setProjects((current) => current.filter((item) => item.id !== projectId));
            setEditingProjectId(null);
            setSelectedProjectId(null);
          }}
          onClose={() => setEditingProjectId(null)}
        />
      ) : null}
    </div>
  );
}
