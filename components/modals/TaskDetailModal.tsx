"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useSession } from "next-auth/react";
import {
  AtSign,
  Bold,
  CalendarDays,
  Check,
  ChevronDown,
  Copy,
  FolderOpen,
  Image as ImageIcon,
  Info,
  Italic,
  Link2,
  List,
  ListOrdered,
  MoreVertical,
  Plus,
  SendHorizontal,
  Trash2,
  Underline,
  X,
} from "lucide-react";
import { TaskTagModal } from "@/components/tasks/TaskTagModal";
import { ModalTabGroup } from "@/components/ui/ModalTabGroup";
import {
  isTaskDescriptionEmpty,
  loadTaskLinkMetas,
  loadTaskProgress,
  normalizeTaskDescriptionHtml,
  normalizeTaskLinkUrl,
  normalizeTaskProgress,
  readFileAsDataUrl,
  saveTaskLinkMetas,
  saveTaskProgress,
  toTaskAttachmentMetas,
  type TaskAttachmentMeta,
  type TaskEditorAction,
  type TaskLinkMeta,
} from "@/components/tasks/task-modal-utils";

type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface Member {
  id: string;
  name: string | null;
  image: string | null;
}

interface TaskComment {
  id: string;
  author: string;
  createdAt: string;
  content: string;
}

interface TaskTag {
  id: string;
  name: string;
  color?: string | null;
}

interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  requiresApproval: boolean;
  isApprovalRequested?: boolean;
  approvedBy?: string | null;
  approvedAt?: string | Date | null;
  rejectedReason?: string | null;
  budget: number | null;
  startDate?: string | Date | null;
  dueDate: string | Date | null;
  progress?: number | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  projectId: string;
  assigneeId: string | null;
  creatorId: string;
  assignee: { id: string; name: string | null; image: string | null } | null;
  creator: { id: string; name: string | null; image?: string | null } | null;
  project?: { id: string; name: string; color?: string | null } | null;
  tags?: TaskTag[];
  attachments?: TaskAttachmentMeta[];
}

interface SubTask {
  id: string;
  title: string;
  isDone: boolean;
  assigneeId?: string;
}

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  projectName?: string;
  initialTask?: TaskRecord | null;
  members?: Member[];
  isAdmin?: boolean;
  currentUserId?: string;
  onUpdated?: (task: TaskRecord) => void;
  onDeleted?: (taskId: string) => void;
}

type TabKey = "detail" | "comments" | "activity";

interface EditableSnapshot {
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId: string;
  startDate: string;
  dueDate: string;
  progress: number;
  attachmentsSerialized: string;
}

function serializeTaskAttachments(attachments: TaskAttachmentMeta[]) {
  return JSON.stringify(
    attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      size: attachment.size,
      mimeType: attachment.mimeType ?? null,
      createdAt: attachment.createdAt,
    }))
  );
}

function serializeTaskLinks(links: TaskLinkMeta[]) {
  return JSON.stringify(
    links.map((link) => ({
      id: link.id,
      title: link.title,
      url: link.url,
    }))
  );
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "예정",
  IN_PROGRESS: "진행중",
  IN_REVIEW: "검토중",
  DONE: "완료",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
  URGENT: "긴급",
};

function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "yyyy. MM. dd HH:mm", { locale: ko });
}

function formatDateOnly(value?: string | Date | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "yyyy. MM. dd", { locale: ko });
}

function getAvatarTone(index: number) {
  return ["av-blue", "av-green", "av-purple", "av-orange"][index % 4];
}

function getDueTone(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.ceil((target.getTime() - todayStart.getTime()) / 86400000);
  if (diffDays < 0) return "danger";
  if (diffDays <= 3) return "warn";
  return "";
}

async function readError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string; task?: TaskRecord };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}

function toEditableSnapshot(task: TaskRecord): EditableSnapshot {
  return {
    title: task.title,
    description: normalizeTaskDescriptionHtml(task.description ?? ""),
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId ?? "",
    startDate: task.startDate ? format(new Date(task.startDate), "yyyy-MM-dd") : "",
    dueDate: task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "",
    progress: normalizeTaskProgress(task.progress),
    attachmentsSerialized: serializeTaskAttachments(task.attachments ?? []),
  };
}

export function TaskDetailModal({
  isOpen,
  onClose,
  taskId,
  projectName,
  initialTask = null,
  members = [],
  isAdmin = false,
  currentUserId,
  onUpdated,
  onDeleted,
}: TaskDetailModalProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabKey>("detail");
  const [task, setTask] = useState<TaskRecord | null>(initialTask);
  const [title, setTitle] = useState(initialTask?.title ?? "");
  const [description, setDescription] = useState(
    normalizeTaskDescriptionHtml(initialTask?.description ?? "")
  );
  const [status, setStatus] = useState<TaskStatus>(initialTask?.status ?? "TODO");
  const [priority, setPriority] = useState<Priority>(initialTask?.priority ?? "MEDIUM");
  const [progress, setProgress] = useState(
    initialTask ? loadTaskProgress(initialTask.id, initialTask.progress ?? 0) : 0
  );
  const [assigneeId, setAssigneeId] = useState(initialTask?.assigneeId ?? "");
  const [startDate, setStartDate] = useState(
    initialTask?.startDate ? format(new Date(initialTask.startDate), "yyyy-MM-dd") : ""
  );
  const [dueDate, setDueDate] = useState(
    initialTask?.dueDate ? format(new Date(initialTask.dueDate), "yyyy-MM-dd") : ""
  );
  const [tags, setTags] = useState<TaskTag[]>(initialTask?.tags ?? []);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState("");
  const [attachments, setAttachments] = useState<TaskAttachmentMeta[]>(initialTask?.attachments ?? []);
  const [links, setLinks] = useState<TaskLinkMeta[]>([]);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [originalLinksSerialized, setOriginalLinksSerialized] = useState("[]");
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [subTaskInputOpen, setSubTaskInputOpen] = useState(false);
  const [linkInputOpen, setLinkInputOpen] = useState(false);
  const [originalSnapshot, setOriginalSnapshot] = useState<EditableSnapshot | null>(
    initialTask ? toEditableSnapshot(initialTask) : null
  );
  const [loading, setLoading] = useState(!initialTask);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState<"APPROVE" | "REJECT" | null>(null);
  const [reviewDecisionModal, setReviewDecisionModal] = useState<"APPROVE" | "REJECT" | null>(null);
  const [revisionReasonDraft, setRevisionReasonDraft] = useState("");
  const [revisionReasonTouched, setRevisionReasonTouched] = useState(false);
  const [showRevisionReason, setShowRevisionReason] = useState(false);
  const [revisionReasonAcknowledged, setRevisionReasonAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
  });
  const descriptionRef = useRef<HTMLDivElement | null>(null);
  const isComposingRef = useRef(false);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const subTaskInputRef = useRef<HTMLInputElement | null>(null);
  const selectionRangeRef = useRef<Range | null>(null);

  const syncDescriptionEditor = useCallback((nextHtml: string) => {
    const editor = descriptionRef.current;
    if (!editor) {
      return;
    }

    const normalizedHtml = normalizeTaskDescriptionHtml(nextHtml);
    if (editor.innerHTML !== normalizedHtml) {
      editor.innerHTML = normalizedHtml;
    }
  }, []);

  const updateActiveFormats = useCallback(() => {
    const editor = descriptionRef.current;
    if (!editor || typeof window === "undefined") {
      return;
    }

    const selection = window.getSelection();
    const isInsideEditor = Boolean(
      selection &&
        selection.rangeCount > 0 &&
        editor.contains(selection.anchorNode)
    );

    if (!isInsideEditor) {
      selectionRangeRef.current = null;
      setActiveFormats({ bold: false, italic: false, underline: false });
      return;
    }

    selectionRangeRef.current = selection?.getRangeAt(0).cloneRange() ?? null;
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
  }, []);

  useEffect(() => {
    const editor = descriptionRef.current;
    if (!editor || isComposingRef.current) {
      return;
    }

    const normalizedHtml = normalizeTaskDescriptionHtml(description);
    if (editor.innerHTML === normalizedHtml) {
      return;
    }

    if (document.activeElement === editor) {
      return;
    }

    syncDescriptionEditor(description);
  }, [description, syncDescriptionEditor]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const handleSelectionChange = () => {
      updateActiveFormats();
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [updateActiveFormats]);

  useEffect(() => {
    if (!initialTask) {
      return;
    }

    setTask(initialTask);
    setTitle(initialTask.title);
    setDescription(normalizeTaskDescriptionHtml(initialTask.description ?? ""));
    setStatus(initialTask.status);
    setPriority(initialTask.priority);
    const nextProgress = loadTaskProgress(initialTask.id, initialTask.progress ?? 0);
    setProgress(nextProgress);
    setAssigneeId(initialTask.assigneeId ?? "");
    setStartDate(initialTask.startDate ? format(new Date(initialTask.startDate), "yyyy-MM-dd") : "");
    setDueDate(initialTask.dueDate ? format(new Date(initialTask.dueDate), "yyyy-MM-dd") : "");
    setTags(initialTask.tags ?? []);
    setComments([]);
    setSubTasks([]);
    setAttachments(initialTask.attachments ?? []);
    const nextLinks = loadTaskLinkMetas(initialTask.id);
    setLinks(nextLinks);
    setOriginalLinksSerialized(serializeTaskLinks(nextLinks));
    setLinkTitle("");
    setLinkUrl("");
    setLinkError(null);
    setCommentDraft("");
    setNewSubTaskTitle("");
    setLinkInputOpen(false);
    setSubTaskInputOpen(false);
    setOriginalSnapshot(toEditableSnapshot({ ...initialTask, progress: nextProgress }));
    setLoading(false);
    setError(null);
  }, [initialTask, taskId]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setSuccessMessage(null);
      return;
    }

    if (!successMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [isOpen, onClose, successMessage]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const shouldShowLoading = !initialTask;
    async function loadTask() {
      if (shouldShowLoading) {
        setLoading(true);
      }
      setError(null);
      try {
        const response = await fetch(`/api/tasks/${taskId}`);
        const data = (await response.json().catch(() => null)) as { task?: TaskRecord; error?: string } | null;
        if (!response.ok || !data?.task) throw new Error(data?.error ?? "업무 정보를 불러오지 못했습니다.");
        if (!active) return;
        setTask(data.task);
        setTitle(data.task.title);
        setDescription(normalizeTaskDescriptionHtml(data.task.description ?? ""));
        setStatus(data.task.status);
        setPriority(data.task.priority);
        const nextProgress = loadTaskProgress(data.task.id, data.task.progress ?? 0);
        setProgress(nextProgress);
        setAssigneeId(data.task.assigneeId ?? "");
        setStartDate(data.task.startDate ? format(new Date(data.task.startDate), "yyyy-MM-dd") : "");
        setDueDate(data.task.dueDate ? format(new Date(data.task.dueDate), "yyyy-MM-dd") : "");
        setTags(data.task.tags ?? []);
        setAttachments(data.task.attachments ?? []);
        const nextLinks = loadTaskLinkMetas(data.task.id);
        setLinks(nextLinks);
        setOriginalLinksSerialized(serializeTaskLinks(nextLinks));
        setLinkTitle("");
        setLinkUrl("");
        setLinkError(null);
        setLinkInputOpen(false);
        setOriginalSnapshot(toEditableSnapshot({ ...data.task, progress: nextProgress }));
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "업무 정보를 불러오지 못했습니다.");
      } finally {
        if (active && shouldShowLoading) setLoading(false);
      }
    }
    void loadTask();
    return () => {
      active = false;
    };
  }, [initialTask, isOpen, taskId]);

  useEffect(() => {
    setRevisionReasonAcknowledged(false);
  }, [task?.id, task?.rejectedReason]);

  const effectiveCurrentUserId = currentUserId ?? session?.user?.id;
  const canEditTask = Boolean(task && effectiveCurrentUserId && task.creatorId === effectiveCurrentUserId);
  const canDelete = canEditTask;
  const isApprovalPending = Boolean(
    task &&
      !task.approvedAt &&
      !task.rejectedReason &&
      ((task.isApprovalRequested ?? false) ||
        (status === "IN_REVIEW" && task.requiresApproval))
  );
  const isReviewCompleted = Boolean(
    task &&
      status === "IN_REVIEW" &&
      task.approvedAt &&
      !isApprovalPending &&
      !task.rejectedReason
  );
  const canRequestConfirm = Boolean(
    task &&
      effectiveCurrentUserId &&
      status !== "DONE" &&
      task.creatorId === effectiveCurrentUserId &&
      !isApprovalPending &&
      !isReviewCompleted
  );
  const canReviewConfirm = Boolean(
    task &&
      isAdmin &&
      status === "IN_REVIEW" &&
      isApprovalPending
  );
  const canViewRevisionRequest = Boolean(task?.rejectedReason && canEditTask);
  const displayStatusLabel = isReviewCompleted ? "검토완료" : STATUS_LABELS[status];
  const approvalRowLabel = isApprovalPending
    ? `요청됨 ${formatDateOnly(task?.updatedAt ?? task?.createdAt)}`
    : isReviewCompleted
      ? "검토완료"
      : canViewRevisionRequest
        ? "수정 요청 확인 필요"
      : "확인 요청";
  const approvalRowMessage = isApprovalPending
    ? "대표 또는 권한 있는 사용자의 확인을 기다리고 있어요."
    : isReviewCompleted
      ? `${formatDateOnly(task?.approvedAt)} 확인이 완료됐어요. 작성자가 완료 상태로 변경할 수 있어요.`
      : canViewRevisionRequest
        ? "대표가 보낸 수정 요청을 확인하세요."
    : "완료 전 확인이 필요하면 요청을 보낼 수 있어요.";
  const doneCount = subTasks.filter((item) => item.isDone).length;
  const progressPct = subTasks.length > 0 ? Math.round((doneCount / subTasks.length) * 100) : 0;
  const resolvedProjectName = projectName || task?.project?.name || "프로젝트";
  const dueTone = getDueTone(dueDate);
  const isProgressEditable = status === "IN_PROGRESS" || status === "IN_REVIEW";
  const isDirty = canEditTask && originalSnapshot
    ? originalSnapshot.title !== title ||
      originalSnapshot.description !== description ||
      originalSnapshot.status !== status ||
      originalSnapshot.priority !== priority ||
      originalSnapshot.progress !== progress ||
      originalSnapshot.assigneeId !== assigneeId ||
      originalSnapshot.startDate !== startDate ||
      originalSnapshot.dueDate !== dueDate ||
      originalSnapshot.attachmentsSerialized !== serializeTaskAttachments(attachments) ||
      originalLinksSerialized !== serializeTaskLinks(links) ||
      linkTitle.trim().length > 0 ||
      linkUrl.trim().length > 0
    : false;
  const activityItems = useMemo(() => {
    if (!task) return [];
    return [
      { id: "created", label: `${task.creator?.name ?? "이름 없음"}님이 업무를 생성했습니다.`, time: formatDateTime(task.createdAt) },
      ...(task.assignee?.name ? [{ id: "assignee", label: `담당자가 ${task.assignee.name}님으로 지정되었습니다.`, time: formatDateTime(task.updatedAt ?? task.createdAt) }] : []),
      ...(dueDate ? [{ id: "due", label: `마감일이 ${formatDateOnly(dueDate)}로 설정되었습니다.`, time: formatDateTime(task.updatedAt ?? task.createdAt) }] : []),
      ...comments.map((comment) => ({ id: comment.id, label: `${comment.author}님이 댓글을 남겼습니다.`, time: formatDateTime(comment.createdAt) })),
    ];
  }, [comments, dueDate, task]);
  const approvalSection =
    task &&
    (task.requiresApproval || isApprovalPending || isReviewCompleted || canViewRevisionRequest || canRequestConfirm || canReviewConfirm) ? (
      <div className="mt-3 rounded-[12px] border border-[var(--border-light)] bg-[var(--surface-2)] px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <Info size={14} className="mt-0.5 shrink-0 text-[var(--warning)]" />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[var(--text-secondary)]">
                {approvalRowLabel}
              </p>
              <p className="text-[13px] leading-5 text-[var(--text-muted)]">
                {approvalRowMessage}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canReviewConfirm ? (
              <>
                <button
                  type="button"
                  className="btn-modal btn-modal-ghost h-8 justify-center px-3 text-[12px]"
                  onClick={() => {
                    setRevisionReasonDraft("");
                    setRevisionReasonTouched(false);
                    setReviewDecisionModal("REJECT");
                  }}
                  disabled={decisionLoading !== null}
                >
                  {decisionLoading === "REJECT" ? "전달 중..." : "수정 요청"}
                </button>
                <button
                  type="button"
                  className="btn-modal btn-modal-primary h-8 justify-center px-3 text-[12px]"
                  onClick={() => setReviewDecisionModal("APPROVE")}
                  disabled={decisionLoading !== null}
                >
                  {decisionLoading === "APPROVE" ? "처리 중..." : "확인 완료"}
                </button>
              </>
            ) : isApprovalPending ? (
              <span className="inline-flex h-8 items-center rounded-[10px] border border-[#f2d58a] bg-[#fff8dd] px-3 text-[12px] font-semibold text-[#8a6116]">
                요청됨
              </span>
            ) : isReviewCompleted ? (
              <span className="inline-flex h-8 items-center rounded-[10px] border border-[#b7e4c7] bg-[var(--success-light)] px-3 text-[12px] font-semibold text-[#15803d]">
                검토완료
              </span>
            ) : canViewRevisionRequest ? (
              revisionReasonAcknowledged ? (
                <button
                  type="button"
                  className="btn-modal btn-modal-ghost h-8 justify-center px-3 text-[12px]"
                  onClick={() => void handleConfirmRequest()}
                  disabled={confirming}
                >
                  {confirming ? "요청 중..." : "확인 요청"}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-modal btn-modal-ghost h-8 justify-center px-3 text-[12px]"
                  onClick={() => setShowRevisionReason(true)}
                >
                  수정 요청 확인
                </button>
              )
            ) : (
              <button
                type="button"
                className="btn-modal btn-modal-ghost h-8 justify-center px-3 text-[12px]"
                onClick={() => void handleConfirmRequest()}
                disabled={confirming}
              >
                {confirming ? "요청 중..." : "확인 요청"}
              </button>
            )}
          </div>
        </div>
      </div>
    ) : null;

  async function syncTask(payload: Record<string, unknown>) {
    if (!canEditTask) {
      throw new Error("이 업무는 작성자만 수정할 수 있어요.");
    }

    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await readError(response, "업무를 저장하지 못했습니다."));
    }

    const data = (await response.json()) as { task?: TaskRecord };
    if (!data.task) {
      throw new Error("업무 저장 결과를 확인하지 못했습니다.");
    }

    const nextProgress = normalizeTaskProgress(data.task.progress ?? progress, progress);
    const nextTask = { ...data.task, progress: nextProgress };
    setTask(nextTask);
    setTitle(data.task.title);
    setDescription(normalizeTaskDescriptionHtml(data.task.description ?? ""));
    setStatus(data.task.status);
    setPriority(data.task.priority);
    setProgress(nextProgress);
    saveTaskProgress(data.task.id, nextProgress);
    setAssigneeId(data.task.assigneeId ?? "");
    setStartDate(data.task.startDate ? format(new Date(data.task.startDate), "yyyy-MM-dd") : "");
    setDueDate(data.task.dueDate ? format(new Date(data.task.dueDate), "yyyy-MM-dd") : "");
    setTags(data.task.tags ?? tags);
    setAttachments(data.task.attachments ?? []);
    setOriginalSnapshot(toEditableSnapshot(nextTask));
    onUpdated?.(nextTask);
    return nextTask;
  }

  async function handleStatusToggle() {
    if (!canEditTask) return;

    const nextStatus: TaskStatus = status === "DONE" ? "TODO" : "DONE";
    const previousStatus = status;
    const previousProgress = progress;
    const nextProgress = nextStatus === "DONE" ? 100 : Math.min(progress, 99);
    setStatus(nextStatus);
    setProgress(nextProgress);
    try {
      await syncTask({ status: nextStatus, progress: nextProgress });
    } catch (toggleError) {
      setStatus(previousStatus);
      setProgress(previousProgress);
      setError(toggleError instanceof Error ? toggleError.message : "상태를 변경하지 못했습니다.");
    }
  }

  function applyStatus(nextStatus: TaskStatus) {
    if (!canEditTask) return;

    setStatus(nextStatus);
    setProgress((current) => {
      if (nextStatus === "DONE") {
        return 100;
      }
      if (nextStatus === "TODO") {
        return 0;
      }
      if (nextStatus === "IN_PROGRESS") {
        return current >= 100 ? 99 : current;
      }
      if (nextStatus === "IN_REVIEW" && current >= 100) {
        return 99;
      }
      return current;
    });
  }

  function applyProgress(nextProgress: number) {
    if (!canEditTask) return;

    const normalized = normalizeTaskProgress(nextProgress);
    setProgress(normalized);
    if (normalized >= 100) {
      setStatus("DONE");
    } else if (status === "DONE" || status === "TODO") {
      setStatus("IN_PROGRESS");
    }
  }

  function handleAddLink() {
    if (!canEditTask) return;

    const normalizedUrl = normalizeTaskLinkUrl(linkUrl);
    if (!normalizedUrl) {
      setLinkError("공유 링크 주소를 확인해주세요.");
      return;
    }

    setLinks((current) => [
      ...current,
      {
        id: `task-link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: linkTitle.trim() || normalizedUrl,
        url: normalizedUrl,
        createdAt: new Date().toISOString(),
      },
    ]);
    setLinkTitle("");
    setLinkUrl("");
    setLinkError(null);
    setLinkInputOpen(false);
  }

  async function handleSave() {
    if (!canEditTask) {
      setError("이 업무는 작성자만 수정할 수 있어요.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    setLinkError(null);

    if (!assigneeId) {
      setError("담당자를 등록하셔야합니다");
      setSaving(false);
      return;
    }

    try {
      await syncTask({
        title: title.trim(),
        description: isTaskDescriptionEmpty(description) ? null : description,
        status,
        priority,
        progress,
        assigneeId: assigneeId || null,
        startDate: startDate || null,
        dueDate: dueDate || null,
        attachments: attachments.map((attachment) => ({
          id: attachment.id,
          name: attachment.name,
          size: attachment.size,
          mimeType: attachment.mimeType ?? null,
          createdAt: attachment.createdAt,
        })),
      });
      const resolvedTaskId = task?.id ?? taskId;
      if (resolvedTaskId) {
        saveTaskLinkMetas(resolvedTaskId, links);
        setOriginalLinksSerialized(serializeTaskLinks(links));
      }
      setSuccessMessage("저장이 완료되었습니다");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "업무를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!canEditTask) {
      setError("이 업무는 작성자만 삭제할 수 있어요.");
      return;
    }

    if (!task || !window.confirm("이 업무를 삭제할까요?")) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readError(response, "업무를 삭제하지 못했습니다."));
      onDeleted?.(task.id);
      onClose();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "업무를 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleConfirmRequest() {
    if (!task) return;
    setConfirming(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch(`/api/tasks/${task.id}/approval-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "BUDGET_TASK",
          title: `업무 컨펌 요청: ${title}`,
          description: `${description || "설명 없음"}${task.budget ? `\n예산 ${task.budget.toLocaleString("ko-KR")}원` : ""}`,
          taskId: task.id,
        }),
      });
      if (!response.ok) {
        throw new Error(await readError(response, "확인 요청을 보내지 못했습니다."));
      }
      const data = (await response.json().catch(() => null)) as
        | { task?: Partial<TaskRecord> }
        | null;
      const nextProgress = normalizeTaskProgress(
        data?.task?.progress ?? Math.min(progress, 99),
        Math.min(progress, 99)
      );
      const nextTask = {
        ...task,
        ...data?.task,
        status: "IN_REVIEW" as TaskStatus,
        progress: nextProgress,
        requiresApproval: true,
        isApprovalRequested: true,
      };
      setTask(nextTask);
      setStatus(nextTask.status);
      setProgress(nextTask.progress);
      setOriginalSnapshot(toEditableSnapshot(nextTask));
      onUpdated?.(nextTask);
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "확인 요청을 보내지 못했습니다."
      );
    } finally {
      setConfirming(false);
    }
  }

  async function handleApprovalDecision(decision: "APPROVE" | "REJECT", reason = "") {
    if (!task) return false;

    const trimmedReason = reason.trim();
    if (decision === "REJECT" && !trimmedReason) {
      setRevisionReasonTouched(true);
      return false;
    }

    setDecisionLoading(decision);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/tasks/${task.id}/approval-decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason: trimmedReason }),
      });
      if (!response.ok) {
        throw new Error(await readError(response, "확인 처리를 완료하지 못했습니다."));
      }

      const data = (await response.json()) as { task?: TaskRecord };
      if (data.task) {
        const nextProgress = normalizeTaskProgress(data.task.progress ?? progress, progress);
        const nextTask = { ...data.task, progress: nextProgress };
        setTask(nextTask);
        setStatus(nextTask.status);
        setProgress(nextProgress);
        saveTaskProgress(nextTask.id, nextProgress);
        setOriginalSnapshot(toEditableSnapshot(nextTask));
        onUpdated?.(nextTask);
      }

      setSuccessMessage(
        decision === "APPROVE"
          ? "확인 완료되었습니다."
          : "수정 요청이 전달되었습니다."
      );
      setReviewDecisionModal(null);
      return true;
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "확인 처리를 완료하지 못했습니다.");
      return false;
    } finally {
      setDecisionLoading(null);
    }
  }

  function handleAddSubTask() {
    if (!canEditTask) return;

    const nextTitle = newSubTaskTitle.trim();
    if (!nextTitle) return;
    setSubTasks((current) => [...current, { id: `sub-${Date.now()}`, title: nextTitle, isDone: false, assigneeId: assigneeId || undefined }]);
    setNewSubTaskTitle("");
    setSubTaskInputOpen(false);
  }

  function handleApplyFormat(action: TaskEditorAction) {
    if (!canEditTask) return;

    const editor = descriptionRef.current;
    if (!editor) {
      return;
    }

    restoreDescriptionSelection();
    const commandMap: Partial<Record<TaskEditorAction, string>> = {
      bold: "bold",
      italic: "italic",
      underline: "underline",
      bullet: "insertUnorderedList",
      number: "insertOrderedList",
    };

    const command = commandMap[action];
    if (command) {
      document.execCommand(command);
    } else if (action === "mention") {
      document.execCommand("insertText", false, "@");
    }

    const nextHtml = normalizeTaskDescriptionHtml(editor.innerHTML);
    setDescription(nextHtml);
    updateActiveFormats();
  }

  function handleDescriptionInput(event: React.FormEvent<HTMLDivElement>) {
    if (!canEditTask) return;

    if (isComposingRef.current) {
      return;
    }

    setDescription(normalizeTaskDescriptionHtml(event.currentTarget.innerHTML));
    updateActiveFormats();
  }

  function handleDescriptionCompositionStart() {
    isComposingRef.current = true;
  }

  function handleDescriptionCompositionEnd(event: React.CompositionEvent<HTMLDivElement>) {
    if (!canEditTask) return;

    isComposingRef.current = false;
    setDescription(normalizeTaskDescriptionHtml(event.currentTarget.innerHTML));
    updateActiveFormats();
  }

  function handleDescriptionPaste(event: React.ClipboardEvent<HTMLDivElement>) {
    if (!canEditTask) return;

    event.preventDefault();
    const pastedText = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, pastedText);
    requestAnimationFrame(() => {
      const editor = descriptionRef.current;
      if (!editor) {
        return;
      }
      setDescription(normalizeTaskDescriptionHtml(editor.innerHTML));
      updateActiveFormats();
    });
  }

  function restoreDescriptionSelection() {
    const editor = descriptionRef.current;
    if (!editor || typeof window === "undefined") {
      return;
    }

    editor.focus();
    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    selection.removeAllRanges();
    if (selectionRangeRef.current) {
      selection.addRange(selectionRangeRef.current);
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.addRange(range);
  }

  function handleOpenImagePicker() {
    if (!canEditTask) return;

    updateActiveFormats();
    imageInputRef.current?.click();
  }

  async function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
    if (!canEditTask) {
      event.target.value = "";
      return;
    }

    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith("image/")
    );

    if (files.length === 0) {
      event.target.value = "";
      return;
    }

    try {
      const images = await Promise.all(files.map((file) => readFileAsDataUrl(file)));
      restoreDescriptionSelection();

      images.forEach((src) => {
        document.execCommand(
          "insertHTML",
          false,
          `<img src="${src}" alt="업무 이미지" data-task-inline-image="true" />`
        );
      });

      const nextHtml = normalizeTaskDescriptionHtml(
        descriptionRef.current?.innerHTML ?? ""
      );
      setDescription(nextHtml);
      updateActiveFormats();
    } catch {
      setError("사진을 불러오지 못했습니다.");
    } finally {
      event.target.value = "";
    }
  }

  function handleAttachmentSelect(event: React.ChangeEvent<HTMLInputElement>) {
    if (!canEditTask) {
      event.target.value = "";
      return;
    }

    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    setAttachments((current) => [...current, ...toTaskAttachmentMetas(files)]);
    event.target.value = "";
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-[rgba(16,20,36,0.45)] p-4 backdrop-blur-[4px] max-[680px]:items-end max-[680px]:p-0" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="relative flex max-h-[90vh] w-full max-w-[900px] flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.18),0_0_0_1px_rgba(255,255,255,0.6)] max-[680px]:max-h-[94vh] max-[680px]:rounded-b-none">
        <div className="border-b-[1.5px] border-[var(--border-light)] px-7 pt-6 max-[680px]:px-[18px] max-[680px]:pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-1 text-[11.5px] text-[var(--text-muted)]">
                <button
                  type="button"
                  className="font-medium text-[var(--accent)] hover:underline"
                  onClick={() => {
                    if (task?.projectId) {
                      window.location.href = `/projects?projectId=${task.projectId}`;
                    }
                  }}
                >
                  {resolvedProjectName}
                </button>
                <span className="text-[var(--border)]">/</span>
                <span className="truncate">{title || task?.title || "업무 상세"}</span>
              </div>
              <div className="flex items-start gap-3">
                <button type="button" onClick={() => void handleStatusToggle()} disabled={!canEditTask} className={`status-circle ${status === "DONE" ? "done" : ""} ${canEditTask ? "" : "cursor-default opacity-70"}`} aria-label={status === "DONE" ? "완료 취소" : "완료 처리"} title={canEditTask ? (status === "DONE" ? "업무를 미완료로 표시" : "업무를 완료로 표시") : "작성자만 수정할 수 있어요."}>
                  <Check size={12} className="text-white" />
                </button>
                <h2
                  className={`min-w-0 flex-1 text-[20px] font-bold leading-[1.35] ${
                    status === "DONE"
                      ? "text-[var(--text-muted)] line-through"
                      : "text-[var(--text-primary)]"
                  }`}
                >
                  {title || task?.title || "업무 상세"}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" className="btn-icon-sm" aria-label="복사" onClick={() => void navigator.clipboard?.writeText(title || task?.title || "")}><Copy size={16} /></button>
              {canEditTask ? <button type="button" className="btn-icon-sm" aria-label="더보기"><MoreVertical size={16} /></button> : null}
              <button type="button" className="btn-icon-sm close" aria-label="닫기" onClick={onClose}><X size={18} /></button>
            </div>
          </div>
          {approvalSection}
          {task && !canEditTask ? (
            <p className="mt-2 text-[12px] font-medium text-[var(--text-muted)]">
              이 업무는 작성자만 수정할 수 있어요.
            </p>
          ) : null}
          <ModalTabGroup
            className="mt-4"
            aria-label="업무 상세 탭"
            activeValue={activeTab}
            onChange={setActiveTab}
            items={[
              { value: "detail", label: "상세" },
              { value: "comments", label: "댓글", count: comments.length },
              { value: "activity", label: "활동 기록" },
            ]}
          />
        </div>

        {loading || !task ? (
          <div className="flex min-h-[360px] items-center justify-center px-6 py-10 text-sm text-[var(--text-muted)]">{error ?? "업무 정보를 불러오는 중입니다."}</div>
        ) : (
          <>
            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_280px] overflow-hidden max-[680px]:grid-cols-1">
              <div className="custom-scroll overflow-y-auto border-r-[1.5px] border-[var(--border-light)] px-6 py-[22px] max-[680px]:border-r-0 max-[680px]:px-[18px] max-[680px]:py-4">
                {activeTab === "detail" ? (
                  <div className="space-y-7">
                    <section>
                      <div className="section-label">설명</div>
                      <input
                        ref={attachmentInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleAttachmentSelect}
                      />
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageSelect}
                      />
                      {canEditTask ? (
                      <div className="editor-toolbar">
                        <button type="button" className={`toolbar-btn ${activeFormats.bold ? "is-active" : ""}`} aria-label="굵게" title="굵게" onMouseDown={(event) => event.preventDefault()} onClick={() => handleApplyFormat("bold")}><Bold size={13} /></button>
                        <button type="button" className={`toolbar-btn ${activeFormats.italic ? "is-active" : ""}`} aria-label="기울임" title="기울임" onMouseDown={(event) => event.preventDefault()} onClick={() => handleApplyFormat("italic")}><Italic size={13} /></button>
                        <button type="button" className={`toolbar-btn ${activeFormats.underline ? "is-active" : ""}`} aria-label="밑줄" title="밑줄" onMouseDown={(event) => event.preventDefault()} onClick={() => handleApplyFormat("underline")}><Underline size={13} /></button>
                        <span className="toolbar-sep" />
                        <button type="button" className="toolbar-btn" aria-label="글머리 기호" title="글머리 기호" onMouseDown={(event) => event.preventDefault()} onClick={() => handleApplyFormat("bullet")}><List size={13} /></button>
                        <button type="button" className="toolbar-btn" aria-label="번호 목록" title="번호 목록" onMouseDown={(event) => event.preventDefault()} onClick={() => handleApplyFormat("number")}><ListOrdered size={13} /></button>
                        <span className="toolbar-sep" />
                        <button type="button" className="toolbar-btn" aria-label="사진 추가" title="사진 추가" onClick={handleOpenImagePicker}><ImageIcon size={13} /></button>
                        <button type="button" className="toolbar-btn" aria-label="멘션 추가" title="멘션 추가" onMouseDown={(event) => event.preventDefault()} onClick={() => handleApplyFormat("mention")}><AtSign size={13} /></button>
                      </div>
                      ) : null}
                      <div
                        ref={descriptionRef}
                        contentEditable={canEditTask}
                        suppressContentEditableWarning
                        className={`desc-area min-h-[160px] ${canEditTask ? "" : "cursor-default bg-[var(--surface-2)]"}`}
                        data-placeholder="업무 설명을 적어주세요"
                        onInput={handleDescriptionInput}
                        onCompositionStart={handleDescriptionCompositionStart}
                        onCompositionEnd={handleDescriptionCompositionEnd}
                        onPaste={handleDescriptionPaste}
                        onFocus={updateActiveFormats}
                        onKeyUp={updateActiveFormats}
                        onMouseUp={updateActiveFormats}
                      />
                    </section>

                    <section>
                      <div className="checklist-header">
                        <div className="section-label mb-0">하위 업무</div>
                        <div className="checklist-pct">{`${doneCount} / ${subTasks.length} 완료`}</div>
                      </div>
                      <div className="mini-progress"><div className="mini-progress-fill" style={{ width: `${progressPct}%` }} /></div>
                      <div className="checklist">
                        {subTasks.length === 0 ? <div className="rounded-[10px] border border-[var(--border-light)] bg-[var(--surface-2)] px-4 py-4 text-sm text-[var(--text-muted)]">아직 등록된 하위 업무가 없습니다.</div> : subTasks.map((item, index) => (
                          <div key={item.id} className="check-item">
                            <button type="button" className={`check-box ${item.isDone ? "checked" : ""}`} onClick={() => setSubTasks((current) => current.map((subTask) => subTask.id === item.id ? { ...subTask, isDone: !subTask.isDone } : subTask))} disabled={!canEditTask} aria-label={`${item.title} 완료 여부 토글`} title={canEditTask ? (item.isDone ? "하위 업무를 미완료로 표시" : "하위 업무를 완료로 표시") : "작성자만 수정할 수 있어요."}><Check size={11} className="text-white" /></button>
                            <div className={`check-text ${item.isDone ? "done" : ""}`}>{item.title}</div>
                            {item.assigneeId ? <span className={`avatar avatar-sm ${getAvatarTone(index)}`}>{(members.find((member) => member.id === item.assigneeId)?.name ?? "U").slice(0, 1)}</span> : null}
                            {canEditTask ? <button type="button" className="btn-icon-sm" aria-label="하위 업무 삭제" onClick={() => setSubTasks((current) => current.filter((subTask) => subTask.id !== item.id))}><Trash2 size={14} /></button> : null}
                          </div>
                        ))}
                        {canEditTask && subTaskInputOpen ? (
                        <div className="mt-2 flex gap-2">
                          <input ref={subTaskInputRef} value={newSubTaskTitle} onChange={(event) => setNewSubTaskTitle(event.target.value)} placeholder="새 하위 업무를 입력해 주세요" className="form-input h-[40px] flex-1" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); handleAddSubTask(); } }} />
                          <button type="button" className="btn-modal btn-modal-ghost" onClick={handleAddSubTask} disabled={!newSubTaskTitle.trim()}><Plus size={15} />하위 업무 추가</button>
                        </div>
                        ) : canEditTask ? (
                          <button
                            type="button"
                            className="mt-2 text-xs font-semibold text-[var(--accent)] hover:underline"
                            onClick={() => {
                              setSubTaskInputOpen(true);
                              requestAnimationFrame(() => subTaskInputRef.current?.focus());
                            }}
                          >
                            + 하위 업무 추가
                          </button>
                        ) : null}
                      </div>
                    </section>

                    <section>
                      <div className="section-label">태그</div>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => <span key={tag.id} className="inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-semibold" style={{ background: `${tag.color ?? "#4f7cff"}14`, color: tag.color ?? "#4f7cff", borderColor: `${tag.color ?? "#4f7cff"}33` }}>{`#${tag.name}`}</span>)}
                        {canEditTask ? <button type="button" className="btn-modal btn-modal-ghost" onClick={() => setTagModalOpen(true)}><Plus size={14} />태그 추가</button> : null}
                      </div>
                    </section>

                    <section>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="section-label mb-0">첨부파일</div>
                        {canEditTask ? (
                          <button
                            type="button"
                            className="text-xs font-semibold text-[var(--accent)] hover:underline"
                            onClick={() => attachmentInputRef.current?.click()}
                          >
                            + 첨부파일 추가
                          </button>
                        ) : null}
                      </div>
                      <div className="rounded-[10px] border border-[var(--border-light)] bg-[var(--surface)] px-4 py-3">
                        {attachments.length === 0 ? (
                          <p className="text-sm leading-6 text-[var(--text-muted)]">
                            업무 전용 첨부파일을 추가하면 프로젝트 파일·링크와 분리되어 관리됩니다.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {attachments.map((attachment) => (
                              <div
                                key={attachment.id}
                                className="flex items-center justify-between gap-3 rounded-[8px] border border-[var(--border-light)] bg-[var(--surface-2)] px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                                    {attachment.name}
                                  </p>
                                  <p className="text-xs text-[var(--text-muted)]">
                                    {Math.max(1, Math.round(attachment.size / 1024))}KB
                                  </p>
                                </div>
                                {canEditTask ? (
                                  <button
                                    type="button"
                                    className="btn-icon-sm"
                                    aria-label={`${attachment.name} 첨부 제거`}
                                    onClick={() =>
                                      setAttachments((current) =>
                                        current.filter((item) => item.id !== attachment.id)
                                      )
                                    }
                                  >
                                    <X size={14} />
                                  </button>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </section>

                    <section>
                      <div className="mb-3 flex items-center gap-2">
                        <div className="section-label mb-0">공유 링크</div>
                        <span className="rounded-full bg-[var(--surface-3)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                          여러 개 추가 가능
                        </span>
                      </div>
                      <div className="space-y-3 rounded-[10px] border border-[var(--border-light)] bg-[var(--surface)] px-4 py-3">
                        {canEditTask && (linkInputOpen || linkTitle.trim() || linkUrl.trim() || linkError) ? (
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto]">
                          <input
                            type="text"
                            value={linkTitle}
                            onChange={(event) => {
                              setLinkTitle(event.target.value);
                              if (linkError) {
                                setLinkError(null);
                              }
                            }}
                            placeholder="링크 제목"
                            className="form-input h-[40px]"
                          />
                          <input
                            type="url"
                            value={linkUrl}
                            onChange={(event) => {
                              setLinkUrl(event.target.value);
                              if (linkError) {
                                setLinkError(null);
                              }
                            }}
                            placeholder="https://example.com"
                            className="form-input h-[40px]"
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                handleAddLink();
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="btn-modal btn-modal-ghost h-[40px]"
                            onClick={handleAddLink}
                          >
                            <Link2 size={14} />
                            링크 추가
                          </button>
                        </div>
                        ) : canEditTask ? (
                          <button
                            type="button"
                            className="text-xs font-semibold text-[var(--accent)] hover:underline"
                            onClick={() => setLinkInputOpen(true)}
                          >
                            + 링크 추가
                          </button>
                        ) : null}
                        {canEditTask && linkError ? (
                          <p className="text-[12px] font-medium text-[var(--danger)]">{linkError}</p>
                        ) : canEditTask ? (
                          <p className="text-[12px] text-[var(--text-muted)]">
                            공유 문서, 피그마, 참고 링크를 함께 남길 수 있습니다.
                          </p>
                        ) : null}
                        {links.length > 0 ? (
                          <div className="space-y-2">
                            {links.map((link) => (
                              <div
                                key={link.id}
                                className="flex items-center justify-between gap-3 rounded-[8px] border border-[var(--border-light)] bg-[var(--surface-2)] px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                                    {link.title}
                                  </p>
                                  <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block truncate text-xs text-[var(--accent)] hover:underline"
                                  >
                                    {link.url}
                                  </a>
                                </div>
                                {canEditTask ? (
                                  <button
                                    type="button"
                                    className="btn-icon-sm"
                                    aria-label={`${link.title} 링크 제거`}
                                    onClick={() =>
                                      setLinks((current) =>
                                        current.filter((item) => item.id !== link.id)
                                      )
                                    }
                                  >
                                    <X size={14} />
                                  </button>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </section>
                  </div>
                ) : activeTab === "comments" ? (
                  <div>
                    <div className="comment-list">
                      {comments.length === 0 ? <div className="rounded-[10px] border border-[var(--border-light)] bg-[var(--surface-2)] px-4 py-6 text-center text-sm text-[var(--text-muted)]">아직 댓글이 없습니다.</div> : comments.map((comment, index) => (
                        <div key={comment.id} className="comment-item">
                          <div className={`avatar ${getAvatarTone(index)}`}>{comment.author.slice(0, 1)}</div>
                          <div className="comment-body">
                            <div className="comment-meta"><span className="comment-author">{comment.author}</span><span className="comment-time">{formatDateTime(comment.createdAt)}</span></div>
                            <div className="comment-text whitespace-pre-wrap">{comment.content}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="comment-input-row">
                      <div className={`avatar ${getAvatarTone(0)} self-start`}>나</div>
                      <textarea
                        value={commentDraft}
                        onChange={(event) => {
                          setCommentDraft(event.target.value);
                          event.target.style.height = "auto";
                          event.target.style.height = `${event.target.scrollHeight}px`;
                        }}
                        className="comment-input"
                        rows={1}
                        placeholder="댓글을 입력하세요... (@멘션 가능)"
                      />
                      <button type="button" className="btn-modal btn-modal-primary h-[40px] px-4" onClick={() => { if (!commentDraft.trim()) return; setComments((current) => [...current, { id: `comment-${Date.now()}`, author: "나", createdAt: new Date().toISOString(), content: commentDraft.trim() }]); setCommentDraft(""); }}><SendHorizontal size={15} /></button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activityItems.map((item) => (
                      <div key={item.id} className="flex items-start gap-3">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--border)]" />
                        <div><p className="text-[13px] font-medium leading-6 text-[var(--text-secondary)]">{item.label}</p><p className="mt-1 text-[12px] text-[var(--text-muted)]">{item.time}</p></div>
                      </div>
                    ))}
                  </div>
                )}
                {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}
                {successMessage ? (
                  <p className="mt-4 rounded-[10px] border border-[#b7e4c7] bg-[var(--success-light)] px-3 py-2 text-sm font-medium text-[#15803d]">
                    {successMessage}
                  </p>
                ) : null}

              </div>

              <div className="custom-scroll overflow-y-auto bg-[var(--surface-2)] px-5 py-[22px] max-[680px]:hidden">
                <div className="prop-row">
                  <div className="prop-label">우선순위</div>
                  {canEditTask ? (
                    <div className="relative">
                      <select value={priority} onChange={(event) => setPriority(event.target.value as Priority)} className="status-select appearance-none pr-10 !bg-[var(--warning-light)] !text-[var(--warning)]">
                        {Object.entries(PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--warning)]" />
                    </div>
                  ) : (
                    <div className="assignee-chip cursor-default">{PRIORITY_LABELS[priority]}</div>
                  )}
                </div>

                <div className="prop-row">
                  <div className="prop-label">상태</div>
                  {canEditTask ? (
                    <div className="relative">
                      <select value={status} onChange={(event) => applyStatus(event.target.value as TaskStatus)} className="status-select appearance-none pr-10">
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {value === "IN_REVIEW" && isReviewCompleted ? "검토완료" : label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--accent)]" />
                    </div>
                  ) : (
                    <div className="assignee-chip cursor-default">{displayStatusLabel}</div>
                  )}
                </div>

                <div className="prop-row">
                  <div className="prop-label">진행률</div>
                  {canEditTask ? (
                    <div
                      className={`rounded-[var(--radius-sm)] border border-[var(--border-light)] bg-white px-3 py-2 ${
                        isProgressEditable ? "" : "opacity-70"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={progress}
                          onChange={(event) => applyProgress(normalizeTaskProgress(event.target.value))}
                          className="h-1.5 flex-1 accent-[var(--accent)]"
                          disabled={!isProgressEditable}
                          aria-label="업무 진행률"
                        />
                        <span className="min-w-[38px] text-right text-[13px] font-semibold text-[var(--accent)]">
                          {progress}%
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                        {status === "IN_PROGRESS"
                          ? "진행중 상태에서 바로 진행률을 조정할 수 있습니다."
                          : status === "IN_REVIEW"
                            ? "검토중 상태에서도 진행률을 조정할 수 있습니다."
                          : status === "DONE"
                            ? "완료 상태는 진행률이 100%로 고정됩니다."
                            : "진행중으로 변경하면 진행률을 입력할 수 있습니다."}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-[var(--radius-sm)] border border-[var(--border-light)] bg-white px-3 py-2">
                      <div className="mb-2 flex items-center justify-between text-[13px] font-semibold text-[var(--accent)]">
                        <span>진행률</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--surface-3)]">
                        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="divider" />

                <div className="prop-row">
                  <div className="prop-label">담당자</div>
                  {canEditTask ? (
                    <label className="assignee-chip">
                      <span className={`avatar avatar-sm ${getAvatarTone(1)}`}>{(members.find((member) => member.id === assigneeId)?.name ?? task.assignee?.name ?? "U").slice(0, 1)}</span>
                      <select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} className="w-full appearance-none bg-transparent text-[13px] font-medium text-[var(--text-primary)] outline-none">
                        <option value="">담당자 없음</option>
                        {members.map((member) => <option key={member.id} value={member.id}>{member.name ?? "이름 없음"}</option>)}
                      </select>
                      <ChevronDown size={14} className="text-[var(--text-muted)]" />
                    </label>
                  ) : (
                    <div className="assignee-chip cursor-default">
                      <span className={`avatar avatar-sm ${getAvatarTone(1)}`}>{(members.find((member) => member.id === assigneeId)?.name ?? task.assignee?.name ?? "U").slice(0, 1)}</span>
                      <span>{members.find((member) => member.id === assigneeId)?.name ?? task.assignee?.name ?? "담당자 없음"}</span>
                    </div>
                  )}
                </div>

                <div className="prop-row">
                  <div className="prop-label">시작일</div>
                  {canEditTask ? (
                    <div className="date-chip">
                      <CalendarDays size={14} />
                      <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="w-full bg-transparent text-[13px] outline-none" />
                    </div>
                  ) : (
                    <div className="date-chip cursor-default">
                      <CalendarDays size={14} />
                      <span>{formatDateOnly(startDate)}</span>
                    </div>
                  )}
                </div>

                <div className="prop-row">
                  <div className="prop-label">마감일</div>
                  {canEditTask ? (
                    <div className={`date-chip ${dueTone}`}>
                      <CalendarDays size={14} />
                      <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="w-full bg-transparent text-[13px] outline-none" />
                    </div>
                  ) : (
                    <div className={`date-chip cursor-default ${dueTone}`}>
                      <CalendarDays size={14} />
                      <span>{formatDateOnly(dueDate)}</span>
                    </div>
                  )}
                </div>

                <div className="prop-row">
                  <div className="prop-label">프로젝트</div>
                  <div className="assignee-chip cursor-default"><FolderOpen size={14} className="text-[var(--accent)]" /><span>{resolvedProjectName}</span></div>
                </div>

                <div className="divider" />

                <div className="prop-row"><div className="prop-label">생성자</div><div className="assignee-chip cursor-default"><span className={`avatar avatar-sm ${getAvatarTone(0)}`}>{(task.creator?.name ?? "U").slice(0, 1)}</span><span>{task.creator?.name ?? "이름 없음"}</span></div></div>
                <div className="prop-row"><div className="prop-label">생성일</div><div className="prop-value">{formatDateOnly(task.createdAt)}</div></div>
                <div className="prop-row"><div className="prop-label">마지막 수정</div><div className="prop-value">{formatDateTime(task.updatedAt ?? task.createdAt)}</div></div>

                {false ? (
                  <>
                    <div className="divider" />
                    <div className="confirm-banner">
                      <div className="flex items-start gap-2">
                        <Info size={15} className="mt-[1px] shrink-0" />
                        <div><p className="font-semibold">컨펌 대기중</p><p className="mt-1">대표님의 최종 승인이 필요한 업무입니다.</p></div>
                      </div>
                    </div>
                    <button type="button" className="btn-modal btn-modal-primary w-full justify-center" onClick={() => void handleConfirmRequest()} disabled={confirming}>{confirming ? "요청 중..." : "컨펌 요청"}</button>
                  </>
                ) : null}
              </div>
            </div>

            <div className="modal-footer max-[680px]:px-[18px]">
              <div>{canDelete ? <button type="button" className="btn-modal btn-modal-danger" onClick={() => void handleDelete()} disabled={deleting}><Trash2 size={15} />{deleting ? "삭제 중..." : "삭제"}</button> : null}</div>
              <div className="flex items-center gap-2">
                <button type="button" className="btn-modal btn-modal-ghost" onClick={onClose}>닫기</button>
                {canEditTask ? (
                  <button type="button" className="btn-modal btn-modal-primary" onClick={() => void handleSave()} disabled={!isDirty || saving || Boolean(successMessage)}>{saving ? "저장 중..." : "저장"}</button>
                ) : null}
              </div>
            </div>
            {reviewDecisionModal ? (
              <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-[rgba(16,20,36,0.42)] p-4" onClick={() => decisionLoading === null && setReviewDecisionModal(null)}>
                <div className="w-full max-w-[420px] rounded-[16px] bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.18)]" onClick={(event) => event.stopPropagation()}>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    {reviewDecisionModal === "REJECT" ? "수정 요청 보내기" : "확인 완료 처리"}
                  </h3>
                  {reviewDecisionModal === "REJECT" ? (
                    <>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                        담당자가 확인할 수정 요청 내용을 입력해주세요.
                      </p>
                      <textarea
                        value={revisionReasonDraft}
                        onChange={(event) => {
                          setRevisionReasonDraft(event.target.value);
                          if (revisionReasonTouched) setRevisionReasonTouched(false);
                        }}
                        className="mt-3 min-h-[120px] w-full resize-none rounded-[12px] border border-[var(--border)] px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
                        placeholder="수정이 필요한 내용을 구체적으로 적어주세요."
                        disabled={decisionLoading !== null}
                      />
                      {revisionReasonTouched && !revisionReasonDraft.trim() ? (
                        <p className="mt-2 text-xs font-semibold text-[var(--danger)]">수정 요청 내용을 입력해주세요.</p>
                      ) : null}
                    </>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                      이 버튼을 누르면 담당자에게 검토완료로 전달됩니다.
                    </p>
                  )}
                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      className="btn-modal btn-modal-ghost"
                      onClick={() => setReviewDecisionModal(null)}
                      disabled={decisionLoading !== null}
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      className="btn-modal btn-modal-primary"
                      onClick={() => void handleApprovalDecision(reviewDecisionModal, revisionReasonDraft)}
                      disabled={decisionLoading !== null || (reviewDecisionModal === "REJECT" && !revisionReasonDraft.trim())}
                    >
                      {decisionLoading === reviewDecisionModal
                        ? reviewDecisionModal === "REJECT"
                          ? "전달 중..."
                          : "처리 중..."
                        : reviewDecisionModal === "REJECT"
                          ? "수정 요청"
                          : "확인 완료"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            {showRevisionReason ? (
              <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-[rgba(16,20,36,0.42)] p-4" onClick={() => setShowRevisionReason(false)}>
                <div className="w-full max-w-[420px] rounded-[16px] bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.18)]" onClick={(event) => event.stopPropagation()}>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">수정 요청 내용</h3>
                  <div className="mt-3 max-h-[240px] overflow-y-auto whitespace-pre-wrap rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm leading-6 text-[var(--text-primary)]">
                    {task?.rejectedReason || "전달된 수정 요청 내용이 없습니다."}
                  </div>
                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      className="btn-modal btn-modal-primary"
                      onClick={() => {
                        setRevisionReasonAcknowledged(true);
                        setShowRevisionReason(false);
                      }}
                    >
                      확인했습니다
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            {canEditTask ? (
              <TaskTagModal
                isOpen={tagModalOpen}
                existingNames={tags.map((tag) => tag.name)}
                onClose={() => setTagModalOpen(false)}
                onSubmit={(name) => {
                  setTags((current) => [
                    ...current,
                    { id: `tag-${Date.now()}`, name, color: "#4f7cff" },
                  ]);
                  setTagModalOpen(false);
                }}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
