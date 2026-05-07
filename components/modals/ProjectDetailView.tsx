"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  CalendarDays,
  Check,
  Clock3,
  FileText,
  FolderPlus,
  Info,
  Link2,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  Users2,
  X,
} from "lucide-react";
import type { ProjectSummary } from "@/components/projects/project-board-types";
import { TaskCreateDetailModal } from "@/components/tasks/TaskCreateDetailModal";

interface Member {
  id: string;
  name: string | null;
  image: string | null;
}

interface ProjectTaskDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority?: string | null;
  requiresApproval?: boolean | null;
  dueDate?: string | Date | null;
  createdAt?: string | Date | null;
  assigneeId?: string | null;
  assignee?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
}

interface ProjectDetailResponse {
  id: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  color: string;
  status: string;
  budget: number | null;
  progress: number | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  createdAt: string | Date;
  _count?: { tasks: number };
  tasks: ProjectTaskDetail[];
}

interface ProjectDetailViewProps {
  project: ProjectSummary;
  defaultTab?: DetailTab;
  members: Member[];
  canDelete?: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDeleted?: (projectId: string) => void;
  onProgressUpdated?: (projectId: string, progress: number) => void;
}

type DetailTab = "overview" | "tasks" | "members" | "files";

type NormalizedTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  requiresApproval: boolean;
  dueDate: string | Date | null;
  createdAt: string | Date | null;
  assigneeId: string | null;
  assigneeName: string | null;
};

const BOARD_STATUS_LABELS: Record<ProjectSummary["boardStatus"], string> = {
  ONGOING: "진행중",
  REVIEW: "검토중",
  UPCOMING: "예정",
  COMPLETED: "완료",
};

const BOARD_STATUS_STYLES: Record<ProjectSummary["boardStatus"], string> = {
  ONGOING: "bg-[var(--accent-light)] text-[var(--accent)]",
  REVIEW: "bg-[var(--purple-light)] text-[var(--purple)]",
  UPCOMING: "bg-[var(--warning-light)] text-[var(--warning)]",
  COMPLETED: "bg-[var(--success-light)] text-[var(--success)]",
};

const TASK_STATUS_META: Record<string, { label: string; className: string; textClassName?: string }> = {
  TODO: {
    label: "예정",
    className: "bg-[var(--surface-3)] text-[var(--text-secondary)]",
  },
  IN_PROGRESS: {
    label: "진행중",
    className: "bg-[var(--accent-light)] text-[var(--accent)]",
  },
  IN_REVIEW: {
    label: "검토중",
    className: "bg-[var(--yellow-light)] text-[#92400e]",
  },
  DONE: {
    label: "완료",
    className: "bg-[var(--success-light)] text-[var(--success)]",
    textClassName: "text-[var(--text-muted)] line-through",
  },
};

const PRIORITY_META: Record<string, { label: string; className: string }> = {
  LOW: {
    label: "낮음",
    className: "bg-[var(--surface-3)] text-[var(--text-secondary)]",
  },
  MEDIUM: {
    label: "보통",
    className: "bg-[var(--surface-3)] text-[var(--text-secondary)]",
  },
  HIGH: {
    label: "높음",
    className: "bg-[var(--warning-light)] text-[#c2410c]",
  },
  URGENT: {
    label: "긴급",
    className: "bg-[var(--danger-light)] text-[var(--danger)]",
  },
};

function formatDateLabel(value?: string | Date | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return format(date, "yyyy. MM. dd", { locale: ko });
}

function formatDueLabel(value?: string | Date | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return format(date, "M월 d일", { locale: ko });
}

function formatBudget(value: number | null) {
  if (value == null) {
    return "-";
  }

  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function getDdayLabel(value?: string | Date | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.ceil((target.getTime() - start.getTime()) / 86400000);

  if (diffDays === 0) {
    return "D-day";
  }

  if (diffDays > 0) {
    return `D-${diffDays}`;
  }

  return `D+${Math.abs(diffDays)}`;
}

function isTaskOverdue(task: NormalizedTask) {
  if (task.status === "DONE" || !task.dueDate) {
    return false;
  }

  const date = new Date(task.dueDate);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  return target.getTime() < start.getTime();
}

function buildFallbackTasks(project: ProjectSummary): NormalizedTask[] {
  return project.tasks.map((task, index) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: "MEDIUM",
    requiresApproval: false,
    dueDate: task.endDate,
    createdAt: task.startDate ?? project.createdAt,
    assigneeId: null,
    assigneeName: task.assigneeName ?? project.assigneeNames[index] ?? null,
  }));
}

function getMemberTone(index: number) {
  const tones = [
    "bg-[var(--accent)]",
    "bg-[var(--success)]",
    "bg-[var(--purple)]",
    "bg-[var(--warning)]",
  ];

  return tones[index % tones.length];
}

async function readError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    return typeof data.error === "string" ? data.error : fallback;
  } catch {
    return fallback;
  }
}
export function ProjectDetailView({
  project,
  defaultTab = "overview",
  members,
  canDelete = false,
  onClose,
  onEdit,
  onDeleted,
  onProgressUpdated,
}: ProjectDetailViewProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>(defaultTab);
  const [detailProject, setDetailProject] = useState<ProjectDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [requestingConfirm, setRequestingConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isTaskCreateOpen, setIsTaskCreateOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProgressEditing, setIsProgressEditing] = useState(false);
  const [progressDraft, setProgressDraft] = useState("");
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const progressInputRef = useRef<HTMLInputElement | null>(null);
  const progressCommitRef = useRef(false);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab, project.id]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let active = true;

    async function loadProject() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/projects/${project.id}`);
        if (!response.ok) {
          throw new Error();
        }

        const data = (await response.json()) as { project?: ProjectDetailResponse };
        if (!active) {
          return;
        }

        setDetailProject(data.project ?? null);
      } catch {
        if (active) {
          setError("프로젝트 상세 정보를 불러오지 못했습니다.");
        }
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
  }, [project.id]);

  const tasks = useMemo<NormalizedTask[]>(() => {
    if (detailProject?.tasks?.length) {
      return detailProject.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority ?? "MEDIUM",
        requiresApproval: Boolean(task.requiresApproval),
        dueDate: task.dueDate ?? null,
        createdAt: task.createdAt ?? null,
        assigneeId: task.assignee?.id ?? task.assigneeId ?? null,
        assigneeName: task.assignee?.name ?? null,
      }));
    }

    return buildFallbackTasks(project);
  }, [detailProject, project]);

  const totalTasks = detailProject?._count?.tasks ?? project.totalTasks;
  const doneTasks = tasks.filter((task) => task.status === "DONE").length;
  const ongoingTasks = tasks.filter((task) => task.status === "IN_PROGRESS").length;
  const reviewTasks = tasks.filter((task) => task.status === "IN_REVIEW").length;
  const overdueTasks = tasks.filter((task) => isTaskOverdue(task)).length;
  const progress =
    typeof detailProject?.progress === "number"
      ? detailProject.progress
      : totalTasks > 0
        ? Math.round((doneTasks / totalTasks) * 100)
        : project.progress;

  const effectiveProject = {
    ...project,
    ...detailProject,
    progress,
    budget: detailProject?.budget ?? project.budget,
    subtitle: detailProject?.subtitle ?? project.subtitle,
    description: detailProject?.description ?? project.description,
    startDate: detailProject?.startDate ?? project.startDate,
    endDate: detailProject?.endDate ?? project.endDate,
    createdAt: detailProject?.createdAt ?? project.createdAt,
  };

  const projectPriority =
    overdueTasks > 0 || tasks.some((task) => task.priority === "URGENT")
      ? { label: "긴급", className: "bg-[var(--danger-light)] text-[var(--danger)]" }
      : tasks.some((task) => task.priority === "HIGH") || reviewTasks > 0
        ? { label: "높음", className: "bg-[var(--warning-light)] text-[#c2410c]" }
        : { label: "보통", className: "bg-[var(--surface-3)] text-[var(--text-secondary)]" };

  const confirmState = tasks.some((task) => task.requiresApproval)
    ? { label: "대기중", className: "bg-[var(--yellow-light)] text-[#92400e]" }
    : { label: "없음", className: "bg-[var(--surface-3)] text-[var(--text-secondary)]" };

  const memberRows = useMemo(() => {
    return members.map((member, index) => {
      const assignedTasks = tasks.filter(
        (task) =>
          (task.assigneeId && task.assigneeId === member.id) ||
          (!task.assigneeId && task.assigneeName && task.assigneeName === member.name)
      );
      const memberDoneCount = assignedTasks.filter((task) => task.status === "DONE").length;
      const memberHasReview = assignedTasks.some((task) => task.status === "IN_REVIEW");
      const activity =
        assignedTasks.length === 0
          ? { label: "대기", className: "bg-[var(--surface-3)] text-[var(--text-secondary)]" }
          : memberDoneCount === assignedTasks.length
            ? { label: "완료", className: "bg-[var(--success-light)] text-[var(--success)]" }
            : memberHasReview
              ? { label: "검토중", className: "bg-[var(--yellow-light)] text-[#92400e]" }
              : { label: "활성", className: "bg-[var(--accent-light)] text-[var(--accent)]" };

      return {
        member,
        tone: getMemberTone(index),
        taskCount: assignedTasks.length,
        activity,
      };
    });
  }, [members, tasks]);

  const memberCount = Math.max(
    memberRows.filter((item) => item.taskCount > 0).length,
    project.assigneeNames.length,
    members.length
  );
  const dDayLabel = getDdayLabel(effectiveProject.endDate);
  const summaryDescription = effectiveProject.description?.trim() || null;
  const recentTasks = tasks.slice(0, 3);
  const hasUnsavedChanges = false;

  useEffect(() => {
    if (!isProgressEditing) {
      return;
    }

    progressInputRef.current?.focus();
    progressInputRef.current?.select();
  }, [isProgressEditing]);

  function handleTaskCreated(task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority?: string | null;
    requiresApproval?: boolean | null;
    dueDate?: string | Date | null;
    createdAt?: string | Date | null;
    assigneeId?: string | null;
    assignee?: {
      id: string;
      name: string | null;
      image: string | null;
    } | null;
  }) {
    setDetailProject((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        tasks: [
          {
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority ?? "MEDIUM",
            requiresApproval: Boolean(task.requiresApproval),
            dueDate: task.dueDate ?? null,
            createdAt: task.createdAt ?? new Date().toISOString(),
            assigneeId: task.assigneeId ?? null,
            assignee: task.assignee ?? null,
          },
          ...current.tasks,
        ],
        _count: {
          tasks: (current._count?.tasks ?? current.tasks.length) + 1,
        },
      };
    });

    setInfoMessage("태스크를 추가했습니다.");
    setIsTaskCreateOpen(false);
    setActiveTab("tasks");
  }

  function handleFileButtonClick() {
    fileInputRef.current?.click();
  }

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    setSelectedFiles((current) => [...current, ...files]);
    setInfoMessage(`${files.length}개의 파일을 선택했습니다.`);
    event.target.value = "";
  }

  async function handleConfirmRequest() {
    setRequestingConfirm(true);
    setError(null);
    setInfoMessage(null);

    try {
      const response = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "PROJECT_REVIEW",
          title: `프로젝트 컨펌 요청 · ${project.name}`,
          description:
            effectiveProject.description?.trim() ||
            effectiveProject.subtitle?.trim() ||
            `${project.name} 프로젝트 확인이 필요합니다.`,
        }),
      });

      if (!response.ok) {
        throw new Error();
      }

      setInfoMessage("컨펌 요청을 보냈습니다.");
    } catch {
      setError("컨펌 요청을 보내지 못했습니다.");
    } finally {
      setRequestingConfirm(false);
    }
  }

  async function handleDelete() {
    if (!canDelete) {
      return;
    }

    if (!window.confirm("프로젝트를 삭제할까요?")) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setError(await readError(response, "프로젝트를 삭제하지 못했습니다."));
        return;
      }

      onDeleted?.(project.id);
      onClose();
    } catch {
      setError("프로젝트를 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleTaskStatus(task: NormalizedTask) {
    const nextStatus = task.status === "DONE" ? "TODO" : "DONE";

    setDetailProject((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === task.id
            ? {
                ...item,
                status: nextStatus,
              }
            : item
        ),
      };
    });

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        throw new Error(await readError(response, "태스크 상태를 변경하지 못했습니다."));
      }
    } catch {
      setDetailProject((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          tasks: current.tasks.map((item) =>
            item.id === task.id
              ? {
                  ...item,
                  status: task.status,
                }
              : item
          ),
        };
      });
      setError("태스크 상태를 변경하지 못했습니다.");
    }
  }

  function beginProgressEdit() {
    if (isSavingProgress) {
      return;
    }

    setError(null);
    setInfoMessage(null);
    setProgressDraft(String(progress));
    setIsProgressEditing(true);
  }

  function cancelProgressEdit() {
    setProgressDraft(String(progress));
    setIsProgressEditing(false);
  }

  async function commitProgressEdit() {
    if (progressCommitRef.current) {
      return;
    }

    progressCommitRef.current = true;

    const trimmed = progressDraft.trim();
    if (!trimmed) {
      cancelProgressEdit();
      progressCommitRef.current = false;
      return;
    }

    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed)) {
      cancelProgressEdit();
      progressCommitRef.current = false;
      return;
    }

    const nextProgress = Math.min(100, Math.max(0, parsed));
    if (nextProgress === progress) {
      setIsProgressEditing(false);
      progressCommitRef.current = false;
      return;
    }

    const previousProgress = progress;
    setIsSavingProgress(true);
    setError(null);
    setInfoMessage(null);
    setDetailProject((current) =>
      current
        ? {
            ...current,
            progress: nextProgress,
          }
        : current
    );

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: nextProgress }),
      });

      if (!response.ok) {
        throw new Error(await readError(response, "진행률을 저장하지 못했습니다."));
      }

      const data = (await response.json()) as { project?: ProjectDetailResponse };
      const savedProgress =
        typeof data.project?.progress === "number" ? data.project.progress : nextProgress;

      setDetailProject((current) =>
        current
          ? {
              ...current,
              progress: savedProgress,
            }
          : current
      );
      onProgressUpdated?.(project.id, savedProgress);
      setInfoMessage("진행률을 저장했습니다.");
      setIsProgressEditing(false);
    } catch (saveError) {
      setDetailProject((current) =>
        current
          ? {
              ...current,
              progress: previousProgress,
            }
          : current
      );
      setProgressDraft(String(previousProgress));
      setError(
        saveError instanceof Error ? saveError.message : "진행률을 저장하지 못했습니다."
      );
      setIsProgressEditing(false);
    } finally {
      setIsSavingProgress(false);
      progressCommitRef.current = false;
    }
  }

  function handleProgressKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void commitProgressEdit();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelProgressEdit();
    }
  }

  return (
    <div className="modal-shell" onClick={onClose}>
      <div className="modal-overlay" />
      <div
        className="pointer-events-auto relative z-[1020] flex max-h-[90vh] w-full max-w-[780px] flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.18),0_0_0_1px_rgba(255,255,255,0.6)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-7 pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${BOARD_STATUS_STYLES[project.boardStatus]}`}
              >
                <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-current/25">
                  <span className="h-1 w-1 rounded-full bg-current" />
                </span>
                {BOARD_STATUS_LABELS[project.boardStatus]}
              </span>
              <h2 className="mt-4 truncate text-[22px] font-bold leading-[1.3] tracking-[-0.03em] text-[var(--text-primary)]">
                {project.name}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-[13px] text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={14} />
                  {formatDateLabel(effectiveProject.startDate)} - {formatDateLabel(effectiveProject.endDate)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users2 size={14} />
                  팀원 {memberCount}명
                </span>
                {dDayLabel ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 size={14} />
                    {dDayLabel}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-[var(--surface-2)] text-[var(--text-muted)] transition hover:bg-[var(--surface-3)] hover:text-[var(--text-secondary)]"
                aria-label="프로젝트 옵션"
              >
                <MoreVertical size={18} />
              </button>
              <button
                type="button"
                onClick={onEdit}
                className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-[var(--surface-2)] text-[var(--text-muted)] transition hover:bg-[var(--surface-3)] hover:text-[var(--text-secondary)]"
                aria-label="프로젝트 수정"
              >
                <Pencil size={18} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-[var(--surface-2)] text-[var(--text-muted)] transition hover:bg-[var(--surface-3)] hover:text-[var(--danger)]"
                aria-label="닫기"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-semibold text-[var(--text-secondary)]">전체 진행률</span>
              {isProgressEditing ? (
                <label className="inline-flex items-center gap-0.5 text-[13px] font-bold text-[var(--accent)]">
                  <input
                    ref={progressInputRef}
                    type="text"
                    inputMode="numeric"
                    value={progressDraft}
                    onChange={(event) =>
                      setProgressDraft(event.target.value.replace(/[^\d]/g, ""))
                    }
                    onBlur={() => void commitProgressEdit()}
                    onKeyDown={handleProgressKeyDown}
                    className="w-[3ch] min-w-[28px] border-0 bg-transparent p-0 text-right text-[13px] font-bold text-[var(--accent)] outline-none"
                    aria-label="프로젝트 진행률"
                  />
                  <span>%</span>
                </label>
              ) : (
                <button
                  type="button"
                  onClick={beginProgressEdit}
                  className="text-[13px] font-bold text-[var(--accent)] transition hover:text-[var(--accent-hover)]"
                  aria-label="진행률 수정"
                  title="진행률 수정"
                >
                  {progress}%
                </button>
              )}
            </div>
            <div className="mt-2 h-[6px] overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#4f7cff_0%,#7ba3ff_100%)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleConfirmRequest()}
              disabled={requestingConfirm}
              className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-3)] disabled:cursor-default disabled:opacity-60"
            >
              <Check size={15} />
              {requestingConfirm ? "요청 중..." : "컨펌 요청"}
            </button>
          </div>

          <div className="mt-8 flex overflow-x-auto border-b border-[var(--border-light)]">
            {[
              { id: "overview" as const, label: "개요" },
              { id: "tasks" as const, label: `태스크 ${totalTasks}` },
              { id: "members" as const, label: "멤버" },
              { id: "files" as const, label: "파일·링크" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`-mb-px whitespace-nowrap border-b-2 px-7 py-4 text-[13px] font-semibold transition ${
                  activeTab === tab.id
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {(loading || error || infoMessage) && (
          <div className="px-7 pt-5">
            {loading ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                프로젝트 정보를 불러오는 중입니다.
              </div>
            ) : null}
            {infoMessage ? (
              <div className="rounded-2xl border border-[#bbf7d0] bg-[var(--success-light)] px-4 py-3 text-sm font-medium text-[#15803d]">
                {infoMessage}
              </div>
            ) : null}
            {error ? (
              <div className="rounded-2xl border border-[#fecaca] bg-[var(--danger-light)] px-4 py-3 text-sm font-medium text-[#b42318]">
                {error}
              </div>
            ) : null}
          </div>
        )}
        <div className="custom-scroll flex-1 min-h-[420px] overflow-y-auto px-7 py-6">
          {activeTab === "overview" ? (
            <div className="space-y-7">
              <div className="flex flex-wrap gap-2">
                <SummaryChip>총 태스크 {totalTasks}개</SummaryChip>
                <SummaryChip tone="success">완료 {doneTasks}</SummaryChip>
                <SummaryChip tone="warning">진행중 {ongoingTasks}</SummaryChip>
                <SummaryChip tone="danger">지연 {overdueTasks}</SummaryChip>
              </div>

              <section>
                <SectionTitle>프로젝트 정보</SectionTitle>
                <div className="grid gap-3 md:grid-cols-3">
                  <InfoCard
                    label="마감일"
                    value={formatDateLabel(effectiveProject.endDate)}
                    valueClassName="text-[var(--warning)]"
                    icon={<Clock3 size={13} />}
                  />
                  <InfoCard
                    label="예산"
                    value={formatBudget(effectiveProject.budget)}
                    valueClassName="text-[var(--accent)]"
                    icon={<FileText size={13} />}
                  />
                  <InfoCard
                    label="담당 PM"
                    value={project.assigneeNames[0] ?? members[0]?.name ?? "-"}
                    icon={<UserRound size={13} />}
                  />
                  <InfoCard
                    label="우선순위"
                    value={
                      <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${projectPriority.className}`}>
                        {projectPriority.label}
                      </span>
                    }
                  />
                  <InfoCard
                    label="생성일"
                    value={formatDateLabel(effectiveProject.createdAt)}
                    valueClassName="text-[var(--text-secondary)]"
                  />
                  <InfoCard
                    label="컨펌 필요"
                    value={
                      <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${confirmState.className}`}>
                        {confirmState.label}
                      </span>
                    }
                  />
                </div>
              </section>

              {summaryDescription ? (
                <section>
                  <SectionTitle>프로젝트 설명</SectionTitle>
                  <div className="flex gap-3 rounded-r-[10px] border-l-[3px] border-[var(--accent)] bg-[var(--accent-light)] px-4 py-4 text-[13px] leading-7 text-[#1e3a8a]">
                    <Info size={16} className="mt-1 shrink-0" />
                    <p className="whitespace-pre-wrap">{summaryDescription}</p>
                  </div>
                </section>
              ) : null}

              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <SectionTitle className="mb-0">최근 태스크</SectionTitle>
                  <button
                    type="button"
                    onClick={() => setActiveTab("tasks")}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)] hover:underline"
                  >
                    전체 보기 →
                  </button>
                </div>
                <TaskTable tasks={recentTasks} compact onToggleTask={handleToggleTaskStatus} />
              </section>
            </div>
          ) : null}

          {activeTab === "tasks" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xl font-bold text-[var(--text-primary)]">전체 태스크 ({totalTasks})</div>
                <button
                  type="button"
                  onClick={() => setIsTaskCreateOpen(true)}
                  className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(79,124,255,0.24)] transition hover:bg-[var(--accent-hover)]"
                >
                  <FolderPlus size={15} />
                  태스크 추가
                </button>
              </div>
              <TaskTable tasks={tasks} onToggleTask={handleToggleTaskStatus} />
            </div>
          ) : null}

          {activeTab === "members" ? (
            <div className="space-y-4">
              <div className="text-xl font-bold text-[var(--text-primary)]">참여 멤버 ({memberRows.length}명)</div>
              <div className="space-y-2">
                {memberRows.map(({ member, tone, taskCount, activity }) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-4 rounded-[14px] border border-[var(--border-light)] bg-[var(--surface-2)] px-5 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${tone}`}
                      >
                        {(member.name ?? "U").slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold text-[var(--text-primary)]">
                          {member.name ?? "이름 없음"}
                        </div>
                        <div className="text-sm text-[var(--text-muted)]">프로젝트 멤버</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[var(--surface-3)] px-3 py-1 text-sm text-[var(--text-muted)]">
                        태스크 {taskCount}개
                      </span>
                      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${activity.className}`}>
                        {activity.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "files" ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelection}
              />
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]">
                <Link2 size={24} />
              </div>
              <div className="mt-4 text-2xl font-bold text-[var(--text-secondary)]">
                {selectedFiles.length > 0 ? "선택한 파일" : "아직 파일이 없어요"}
              </div>
              {selectedFiles.length > 0 ? (
                <div className="mt-4 w-full max-w-[420px] rounded-[14px] border border-[var(--border-light)] bg-[var(--surface-2)] px-4 py-4 text-left">
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-[10px] bg-white px-3 py-2 text-sm text-[var(--text-secondary)]"
                      >
                        <span className="min-w-0 truncate">{file.name}</span>
                        <span className="shrink-0 text-xs text-[var(--text-muted)]">
                          {Math.max(1, Math.round(file.size / 1024))}KB
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-[15px] leading-7 text-[var(--text-muted)]">
                  파일이나 링크를 첨부해보세요
                </p>
              )}
              <button
                type="button"
                onClick={handleFileButtonClick}
                className="mt-6 inline-flex items-center gap-2 rounded-[10px] border border-[var(--border)] bg-white px-5 py-3 text-base font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-2)]"
              >
                <Plus size={16} />
                파일 추가
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-[var(--border-light)] bg-white px-7 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {canDelete ? (
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--danger-light)] px-4 py-2.5 text-sm font-semibold text-[var(--danger)] transition hover:bg-[#fee2e2] disabled:cursor-default disabled:opacity-60"
              >
                <Trash2 size={15} />
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center rounded-[10px] border border-[var(--border)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-2)]"
            >
              닫기
            </button>
            <button
              type="button"
              disabled={!hasUnsavedChanges}
              className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(79,124,255,0.24)] transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Pencil size={15} />
              저장
            </button>
          </div>
        </div>
        {isTaskCreateOpen ? (
          <TaskCreateDetailModal
            projectId={project.id}
            projectName={project.name}
            members={members}
            onCreated={handleTaskCreated}
            onClose={() => setIsTaskCreateOpen(false)}
          />
        ) : null}
      </div>
    </div>
  );
}
function SectionTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-3 text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)] ${className}`}>
      {children}
    </div>
  );
}

function SummaryChip({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const className =
    tone === "success"
      ? "bg-[var(--success-light)] text-[var(--success)]"
      : tone === "warning"
        ? "bg-[var(--warning-light)] text-[#c2410c]"
        : tone === "danger"
          ? "bg-[var(--danger-light)] text-[var(--danger)]"
          : "border border-[var(--border-light)] bg-[var(--surface-2)] text-[var(--text-secondary)]";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium ${className}`}>
      {children}
    </span>
  );
}

function InfoCard({
  label,
  value,
  icon,
  valueClassName = "",
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[10px] border border-[var(--border-light)] bg-[var(--surface-2)] px-4 py-4">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-muted)]">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-[15px] font-semibold leading-7 text-[var(--text-primary)] ${valueClassName}`}>
        {value}
      </div>
    </div>
  );
}

function TaskTable({
  tasks,
  compact = false,
  onToggleTask,
}: {
  tasks: NormalizedTask[];
  compact?: boolean;
  onToggleTask?: (task: NormalizedTask) => void;
}) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-[14px] border border-[var(--border-light)] bg-[var(--surface-2)] px-5 py-20 min-h-[220px] text-center text-sm text-[var(--text-muted)]">
        아직 등록된 태스크가 없어요.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-[var(--border-light)]">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead className="bg-[var(--surface-2)]">
          <tr className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
            <th className="px-4 py-3">완료 / 태스크</th>
            <th className="px-4 py-3">상태</th>
            {!compact ? <th className="px-4 py-3">담당자</th> : null}
            {!compact ? <th className="px-4 py-3">우선순위</th> : null}
            <th className="px-4 py-3">마감</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const statusMeta = TASK_STATUS_META[task.status] ?? TASK_STATUS_META.TODO;
            const priorityMeta = PRIORITY_META[task.priority] ?? PRIORITY_META.MEDIUM;

            return (
              <tr key={task.id} className="border-t border-[var(--border-light)] hover:bg-[var(--surface-2)]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onToggleTask?.(task)}
                      title={task.status === "DONE" ? "태스크를 미완료로 표시" : "태스크를 완료로 표시"}
                      aria-label={task.status === "DONE" ? `${task.title} 미완료로 표시` : `${task.title} 완료로 표시`}
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition ${
                        task.status === "DONE"
                          ? "border-[var(--success)] bg-[var(--success)]"
                          : "border-[var(--border)] bg-white hover:border-[var(--accent)]"
                      }`}
                    >
                      {task.status === "DONE" ? <Check size={11} className="text-white" /> : null}
                    </button>
                    <span className={`font-medium text-[var(--text-primary)] ${statusMeta.textClassName ?? ""}`}>
                      {task.title}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.className}`}>
                    {statusMeta.label}
                  </span>
                </td>
                {!compact ? (
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{task.assigneeName ?? "-"}</td>
                ) : null}
                {!compact ? (
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${priorityMeta.className}`}>
                      {priorityMeta.label}
                    </span>
                  </td>
                ) : null}
                <td
                  className={`px-4 py-3 ${
                    isTaskOverdue(task) ? "font-semibold text-[var(--danger)]" : "text-[var(--text-secondary)]"
                  }`}
                >
                  {formatDueLabel(task.dueDate)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
