"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProjectSummary } from "@/components/projects/project-board-types";
import { ProjectDetailView } from "@/components/modals/ProjectDetailView";

interface Member {
  id: string;
  name: string | null;
  image: string | null;
}

interface ProjectTaskApiItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt?: string | Date | null;
  dueDate?: string | Date | null;
  assignee?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  tags?: Array<{ id: string; name: string }>;
}

interface ProjectApiRecord {
  id: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  color: string;
  status: string;
  budget: number | null;
  progress?: number | null;
  createdAt: string | Date;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  _count?: { tasks: number };
  tasks: ProjectTaskApiItem[];
}

interface ProjectDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  defaultTab?: "overview" | "tasks" | "members" | "files";
  project?: ProjectSummary | null;
  members?: Member[];
  canDelete?: boolean;
  onEdit?: () => void;
  onDeleted?: (projectId: string) => void;
  onProgressUpdated?: (projectId: string, progress: number) => void;
}

function deriveBoardStatus(project: ProjectApiRecord): ProjectSummary["boardStatus"] {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (project.status === "ARCHIVED") {
    return "COMPLETED";
  }

  if (project.endDate) {
    const endDate = new Date(project.endDate);
    if (!Number.isNaN(endDate.getTime()) && endDate.getTime() < todayStart.getTime()) {
      return "COMPLETED";
    }
  }

  if (project.startDate) {
    const startDate = new Date(project.startDate);
    if (!Number.isNaN(startDate.getTime()) && startDate.getTime() > todayStart.getTime()) {
      return "UPCOMING";
    }
  }

  if (project.tasks.some((task) => task.status === "IN_REVIEW")) {
    return "REVIEW";
  }

  return "ONGOING";
}

function mapProjectToSummary(project: ProjectApiRecord): ProjectSummary {
  const doneTasks = project.tasks.filter((task) => task.status === "DONE").length;
  const totalTasks = project._count?.tasks ?? project.tasks.length;
  const uniqueAssigneeNames = Array.from(
    new Set(
      project.tasks
        .map((task) => task.assignee?.name?.trim())
        .filter((name): name is string => Boolean(name))
    )
  );
  const uniqueTags = Array.from(
    new Set(
      project.tasks
        .flatMap((task) => task.tags?.map((tag) => tag.name) ?? [])
        .filter(Boolean)
    )
  );

  return {
    id: project.id,
    name: project.name,
    subtitle: project.subtitle,
    description: project.description,
    color: project.color,
    status: project.status,
    budget: project.budget,
    createdAt:
      project.createdAt instanceof Date
        ? project.createdAt.toISOString()
        : String(project.createdAt),
    totalTasks,
    doneTasks,
    progress:
      totalTasks > 0
        ? Math.round((doneTasks / totalTasks) * 100)
        : Math.round(project.progress ?? 0),
    boardStatus: deriveBoardStatus(project),
    assigneeNames: uniqueAssigneeNames,
    tags: uniqueTags,
    startDate:
      project.startDate instanceof Date
        ? project.startDate.toISOString()
        : project.startDate ?? null,
    endDate:
      project.endDate instanceof Date
        ? project.endDate.toISOString()
        : project.endDate ?? null,
    tasks: project.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      ganttStatus:
        task.status === "DONE"
          ? "done"
          : task.status === "IN_PROGRESS"
            ? "prog"
            : task.status === "IN_REVIEW"
              ? "review"
              : "todo",
      assigneeName: task.assignee?.name ?? null,
      startDate:
        task.createdAt instanceof Date
          ? task.createdAt.toISOString()
          : task.createdAt ?? null,
      endDate:
        task.dueDate instanceof Date
          ? task.dueDate.toISOString()
          : task.dueDate ?? null,
    })),
    commentCount: 0,
  };
}

function deriveMembersFromProject(project: ProjectApiRecord): Member[] {
  const seen = new Set<string>();

  return project.tasks
    .map((task) => task.assignee)
    .filter((assignee): assignee is NonNullable<ProjectTaskApiItem["assignee"]> => Boolean(assignee))
    .filter((assignee) => {
      if (seen.has(assignee.id)) {
        return false;
      }

      seen.add(assignee.id);
      return true;
    })
    .map((assignee) => ({
      id: assignee.id,
      name: assignee.name,
      image: assignee.image,
    }));
}

export function ProjectDetailModal({
  isOpen,
  onClose,
  projectId,
  defaultTab = "overview",
  project = null,
  members,
  canDelete = false,
  onEdit,
  onDeleted,
  onProgressUpdated,
}: ProjectDetailModalProps) {
  const [projectSummary, setProjectSummary] = useState<ProjectSummary | null>(project);
  const [derivedMembers, setDerivedMembers] = useState<Member[]>(members ?? []);
  const [loading, setLoading] = useState(!project);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProjectSummary(project);
    if (members) {
      setDerivedMembers(members);
    }
    setLoading(!project);
    setError(null);
  }, [members, project, projectId]);

  useEffect(() => {
    if (!isOpen || project) {
      return;
    }

    let active = true;

    async function loadProject() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/projects/${projectId}`);
        const data = (await response.json().catch(() => null)) as
          | { error?: string; project?: ProjectApiRecord }
          | null;

        if (!response.ok || !data?.project) {
          throw new Error(data?.error ?? "프로젝트 상세 정보를 불러오지 못했습니다.");
        }

        if (!active) {
          return;
        }

        setProjectSummary(mapProjectToSummary(data.project));
        setDerivedMembers(members ?? deriveMembersFromProject(data.project));
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "프로젝트 상세 정보를 불러오지 못했습니다."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProject();

    return () => {
      active = false;
    };
  }, [isOpen, members, project, projectId]);

  const resolvedMembers = useMemo(
    () => (members && members.length > 0 ? members : derivedMembers),
    [derivedMembers, members]
  );

  if (!isOpen) {
    return null;
  }

  if (loading || !projectSummary) {
    return (
      <div className="modal-shell" onClick={onClose}>
        <div className="modal-overlay" />
        <div
          className="pointer-events-auto relative z-[1020] flex w-full max-w-[780px] flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.18),0_0_0_1px_rgba(255,255,255,0.6)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="px-7 py-8">
            <h2 className="text-[22px] font-bold text-[var(--text-primary)]">프로젝트 상세</h2>
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              {error ?? "프로젝트 정보를 불러오는 중입니다."}
            </p>
            <div className="mt-6 flex justify-end">
              <button type="button" className="secondary-button" onClick={onClose}>
                닫기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProjectDetailView
      project={projectSummary}
      defaultTab={defaultTab}
      members={resolvedMembers}
      canDelete={canDelete}
      onClose={onClose}
      onEdit={onEdit ?? onClose}
      onDeleted={onDeleted}
      onProgressUpdated={onProgressUpdated}
    />
  );
}
