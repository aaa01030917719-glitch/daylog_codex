"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  AtSign,
  Bold,
  CalendarDays,
  Check,
  ChevronDown,
  Copy,
  FolderOpen,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  MoreVertical,
  Paperclip,
  Plus,
  SendHorizontal,
  Underline,
  X,
} from "lucide-react";
import { useDirtyLeaveGuard } from "@/hooks/useDirtyLeaveGuard";
import { TaskTagModal } from "@/components/tasks/TaskTagModal";
import {
  isTaskDescriptionEmpty,
  normalizeTaskDescriptionHtml,
  normalizeTaskLinkUrl,
  normalizeTaskProgress,
  readFileAsDataUrl,
  saveTaskLinkMetas,
  saveTaskProgress,
  taskDescriptionToPlainText,
  toTaskAttachmentMetas,
  type TaskAttachmentMeta,
  type TaskEditorAction,
  type TaskLinkMeta,
} from "@/components/tasks/task-modal-utils";

type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  requiresApproval: boolean;
  budget: number | null;
  startDate: string | Date | null;
  dueDate: string | Date | null;
  progress?: number | null;
  projectId: string;
  assigneeId: string | null;
  creatorId: string;
  assignee: { id: string; name: string | null; image: string | null } | null;
  creator: { id: string; name: string | null };
  attachments?: TaskAttachmentMeta[];
}

interface Member {
  id: string;
  name: string | null;
  image: string | null;
}

interface Project {
  id: string;
  name: string;
  color: string;
}

interface TaskCreateDetailModalProps {
  projectId?: string;
  projectName?: string;
  defaultStatus?: TaskStatus;
  validationMode?: "inline" | "alert";
  members: Member[];
  projects?: Project[];
  currentUserId?: string;
  onCreated: (task: Task) => void;
  onClose: () => void;
}

interface DraftComment {
  id: string;
  author: string;
  createdAt: string;
  content: string;
}

interface DraftSubTask {
  id: string;
  title: string;
  isDone: boolean;
}

type TabKey = "detail" | "comments" | "activity";

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

function formatDisplayDate(value: Date) {
  return format(value, "yyyy. MM. dd", { locale: ko });
}

function getAvatarTone(index: number) {
  return ["av-blue", "av-green", "av-purple", "av-orange"][index % 4];
}

function getDueTone(value: string) {
  if (!value) {
    return "";
  }

  const target = new Date(value);
  if (Number.isNaN(target.getTime())) {
    return "";
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateOnly = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffDays = Math.ceil((dateOnly.getTime() - todayStart.getTime()) / 86400000);

  if (diffDays < 0) {
    return "danger";
  }

  if (diffDays <= 3) {
    return "warn";
  }

  return "";
}

async function readError(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? "업무를 저장하지 못했습니다.";
  } catch {
    return "업무를 저장하지 못했습니다.";
  }
}

export function TaskCreateDetailModal({
  projectId: initialProjectId,
  projectName,
  defaultStatus = "TODO",
  validationMode = "inline",
  members,
  projects,
  currentUserId,
  onCreated,
  onClose,
}: TaskCreateDetailModalProps) {
  const defaultAssigneeId =
    currentUserId && members.some((member) => member.id === currentUserId)
      ? currentUserId
      : "";
  const defaultStartDate = format(new Date(), "yyyy-MM-dd");
  const defaultDueDate = "";
  const [activeTab, setActiveTab] = useState<TabKey>("detail");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [progress, setProgress] = useState(defaultStatus === "DONE" ? 100 : 0);
  const [assigneeId, setAssigneeId] = useState(defaultAssigneeId);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId ?? "");
  const [comments, setComments] = useState<DraftComment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [subTasks, setSubTasks] = useState<DraftSubTask[]>([]);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachmentMeta[]>([]);
  const [links, setLinks] = useState<TaskLinkMeta[]>([]);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const selectedProject = projects?.find((project) => project.id === selectedProjectId) ?? null;
  const resolvedProjectName = projectName ?? selectedProject?.name ?? "프로젝트";
  const resolvedProjectId = initialProjectId ?? selectedProjectId;
  const doneCount = subTasks.filter((item) => item.isDone).length;
  const progressPct =
    subTasks.length > 0 ? Math.round((doneCount / subTasks.length) * 100) : 0;
  const dueTone = getDueTone(dueDate);
  const isProgressEditable = status === "IN_PROGRESS" || status === "IN_REVIEW";
  const isDirty =
    title.trim().length > 0 ||
    !isTaskDescriptionEmpty(description) ||
    status !== defaultStatus ||
    priority !== "MEDIUM" ||
    progress !== 0 ||
    assigneeId !== defaultAssigneeId ||
    startDate !== defaultStartDate ||
    dueDate !== defaultDueDate ||
    selectedProjectId !== (initialProjectId ?? "") ||
    tags.length > 0 ||
    links.length > 0 ||
    attachments.length > 0 ||
    linkTitle.trim().length > 0 ||
    linkUrl.trim().length > 0 ||
    subTasks.length > 0 ||
    comments.length > 0 ||
    commentDraft.trim().length > 0;
  const { requestClose } = useDirtyLeaveGuard({
    isDirty,
    onDiscard: onClose,
    disabled: loading,
  });

  function applyStatus(nextStatus: TaskStatus) {
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
    const normalized = normalizeTaskProgress(nextProgress);
    setProgress(normalized);
    if (normalized >= 100) {
      setStatus("DONE");
    } else if (status === "DONE" || status === "TODO") {
      setStatus("IN_PROGRESS");
    }
  }

  function handleAddLink() {
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
  }

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function showCreateFeedback(message: string) {
    if (validationMode === "alert") {
      window.alert(message);
      return;
    }

    setError(message);
  }

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
    document.addEventListener("selectionchange", updateActiveFormats);
    return () => {
      document.removeEventListener("selectionchange", updateActiveFormats);
    };
  }, [updateActiveFormats]);

  async function handleCreate() {
    if (!title.trim()) {
      showCreateFeedback(
        validationMode === "alert" ? "업무 제목을 입력해주세요." : "업무 제목을 입력하세요"
      );
      return;
    }

    if (isTaskDescriptionEmpty(description)) {
      showCreateFeedback(
        validationMode === "alert" ? "업무 내용을 입력해주세요." : "업무 내용을 입력하세요."
      );
      return;
    }

    if (!assigneeId) {
      showCreateFeedback(
        validationMode === "alert" ? "담당자를 선택해주세요." : "담당자를 등록하셔야합니다"
      );
      return;
    }

    if (!dueDate) {
      showCreateFeedback(
        validationMode === "alert" ? "마감일을 선택해주세요." : "마감일을 선택해 주세요."
      );
      return;
    }

    if (!resolvedProjectId) {
      showCreateFeedback(
        validationMode === "alert" ? "프로젝트를 선택해주세요." : "프로젝트를 선택해 주세요."
      );
      return;
    }

    if (startDate && dueDate && dueDate < startDate) {
      showCreateFeedback("마감일은 시작일보다 빠를 수 없습니다.");
      return;
    }

    setLoading(true);
    setError(null);
    setLinkError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: isTaskDescriptionEmpty(description) ? null : description,
          projectId: resolvedProjectId,
          status,
          startDate: startDate || null,
          dueDate: dueDate || null,
          priority,
          progress,
          assigneeId: assigneeId || null,
          requiresApproval: false,
          attachments: attachments.map((attachment) => ({
            name: attachment.name,
            size: attachment.size,
            mimeType: attachment.mimeType ?? null,
            createdAt: attachment.createdAt,
          })),
        }),
      });

      if (!response.ok) {
        const errorMessage = await readError(response);
        if (validationMode === "alert") {
          window.alert(errorMessage);
        } else {
          setError(errorMessage);
        }
        return;
      }

      const data = (await response.json()) as {
        task: Task;
        projectStartDateAdjusted?: boolean;
      };
      const createdTask = {
        ...data.task,
        progress: normalizeTaskProgress(data.task.progress ?? progress, progress),
      };
      saveTaskProgress(createdTask.id, createdTask.progress);
      if (links.length > 0) {
        saveTaskLinkMetas(createdTask.id, links);
      }
      if (validationMode === "alert") {
        onCreated(createdTask);
        return;
      }
      if (data.projectStartDateAdjusted) {
        setSuccessMessage(
          "태스크 시작일이 프로젝트 시작일보다 빨라서 프로젝트 시작일도 함께 변경되었습니다."
        );
        window.setTimeout(() => {
          onCreated(createdTask);
        }, 900);
        return;
      }

      onCreated(createdTask);
    } catch {
      if (validationMode === "alert") {
        window.alert("업무 등록 중 문제가 발생했습니다. 다시 시도해주세요.");
      } else {
        setError("업무를 저장하지 못했습니다.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleAddSubTask() {
    const value = newSubTaskTitle.trim();
    if (!value) {
      return;
    }

    setSubTasks((current) => [
      ...current,
      {
        id: `sub-${Date.now()}`,
        title: value,
        isDone: false,
      },
    ]);
    setNewSubTaskTitle("");
    requestAnimationFrame(() => subTaskInputRef.current?.focus());
  }

  function handleAddTag() {
    setTagModalOpen(true);
  }

  function handleAddComment() {
    const value = commentDraft.trim();
    if (!value) {
      return;
    }

    setComments((current) => [
      ...current,
      {
        id: `comment-${Date.now()}`,
        author: "나",
        createdAt: new Date().toISOString(),
        content: value,
      },
    ]);
    setCommentDraft("");
  }

  function handleApplyFormat(action: TaskEditorAction) {
    const editor = descriptionRef.current;
    if (!editor) {
      return;
    }

    restoreDescriptionSelection();
    document.execCommand("styleWithCSS", false, "false");

    switch (action) {
      case "bold":
        document.execCommand("bold");
        break;
      case "italic":
        document.execCommand("italic");
        break;
      case "underline":
        document.execCommand("underline");
        break;
      case "bullet":
        document.execCommand("insertUnorderedList");
        break;
      case "number":
        document.execCommand("insertOrderedList");
        break;
      case "mention":
        document.execCommand("insertText", false, "@");
        break;
      default:
        break;
    }

    const nextHtml = normalizeTaskDescriptionHtml(editor.innerHTML);
    setDescription(nextHtml);
    updateActiveFormats();
  }

  function handleDescriptionInput() {
    if (isComposingRef.current) {
      return;
    }

    setDescription(
      normalizeTaskDescriptionHtml(descriptionRef.current?.innerHTML ?? "")
    );
    updateActiveFormats();
  }

  function handleDescriptionCompositionStart() {
    isComposingRef.current = true;
  }

  function handleDescriptionCompositionEnd(
    event: React.CompositionEvent<HTMLDivElement>
  ) {
    isComposingRef.current = false;
    setDescription(normalizeTaskDescriptionHtml(event.currentTarget.innerHTML));
    updateActiveFormats();
  }

  function handleDescriptionPaste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    setDescription(
      normalizeTaskDescriptionHtml(descriptionRef.current?.innerHTML ?? "")
    );
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
    updateActiveFormats();
    imageInputRef.current?.click();
  }

  async function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
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
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    setAttachments((current) => [...current, ...toTaskAttachmentMetas(files)]);
    event.target.value = "";
  }

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-[rgba(16,20,36,0.45)] p-4 backdrop-blur-[4px] max-[680px]:items-end max-[680px]:p-0"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-[900px] flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.14),0_0_0_1px_rgba(255,255,255,0.5)] max-[680px]:max-h-[94vh] max-[680px]:rounded-b-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b-[1.5px] border-[var(--border-light)] px-7 pt-[22px] max-[680px]:px-[18px] max-[680px]:pt-[14px]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="breadcrumb">
                <span className="font-medium text-[var(--accent)]">{resolvedProjectName}</span>
                <span>/</span>
                <span>새 업무</span>
              </div>

              <div className="flex items-start gap-[10px]">
                <button
                  type="button"
                  className={`status-circle ${status === "DONE" ? "done" : ""}`}
                  onClick={() => applyStatus(status === "DONE" ? "TODO" : "DONE")}
                  aria-label={status === "DONE" ? "완료 취소" : "완료 처리"}
                  title={status === "DONE" ? "새 업무를 미완료로 시작" : "새 업무를 완료 상태로 시작"}
                >
                  <Check size={10} className="text-white" />
                </button>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="새 업무 제목을 입력하세요"
                  className="min-w-0 flex-1 border-none bg-transparent text-[20px] font-bold leading-[1.35] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center gap-[6px]">
              <button
                type="button"
                className="btn-icon-sm"
                aria-label="제목 복사"
                onClick={() => {
                  void navigator.clipboard?.writeText(title.trim());
                }}
              >
                <Copy size={13} />
              </button>
              <button type="button" className="btn-icon-sm" aria-label="더보기">
                <MoreVertical size={14} />
              </button>
              <button
                type="button"
                className="btn-icon-sm close"
                aria-label="닫기"
                onClick={requestClose}
              >
                <X size={12} />
              </button>
            </div>
          </div>

          <div className="modal-tabs mt-4">
            <button
              type="button"
              className={`modal-tab-btn ${activeTab === "detail" ? "active" : ""}`}
              onClick={() => setActiveTab("detail")}
            >
              상세
            </button>
            <button
              type="button"
              className={`modal-tab-btn ${activeTab === "comments" ? "active" : ""}`}
              onClick={() => setActiveTab("comments")}
            >
              댓글 <span className="ml-0.5 text-[11px] font-bold text-[var(--accent)]">{comments.length}</span>
            </button>
            <button
              type="button"
              className={`modal-tab-btn ${activeTab === "activity" ? "active" : ""}`}
              onClick={() => setActiveTab("activity")}
            >
              활동 기록
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_280px] overflow-hidden max-[680px]:grid-cols-1">
          <div className="custom-scroll overflow-y-auto border-r-[1.5px] border-[var(--border-light)] px-6 py-[22px] max-[680px]:border-r-0 max-[680px]:px-[18px] max-[680px]:py-4">
            {activeTab === "detail" ? (
              <div className="space-y-[26px]">
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
                  <div
                    ref={descriptionRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleDescriptionInput}
                    onCompositionStart={handleDescriptionCompositionStart}
                    onCompositionEnd={handleDescriptionCompositionEnd}
                    onBlur={updateActiveFormats}
                    onKeyUp={updateActiveFormats}
                    onMouseUp={updateActiveFormats}
                    onPaste={handleDescriptionPaste}
                    className="desc-area"
                    data-placeholder="설명을 입력하세요..."
                  />
                </section>

                <section>
                  <div className="checklist-header">
                    <div className="section-label mb-0">하위 업무</div>
                    <div className="checklist-pct">{`${doneCount} / ${subTasks.length} 완료`}</div>
                  </div>
                  <div className="mini-progress">
                    <div className="mini-progress-fill" style={{ width: `${progressPct}%` }} />
                  </div>
                  <div className="checklist">
                    {subTasks.length === 0 ? (
                      <div className="rounded-[10px] border border-[var(--border-light)] bg-[var(--surface-2)] px-4 py-4 text-sm text-[var(--text-muted)]">
                        업무를 만든 뒤에도 하위 업무를 계속 추가할 수 있어요.
                      </div>
                    ) : (
                      subTasks.map((item, index) => (
                        <div key={item.id} className="check-item">
                          <button
                            type="button"
                            className={`check-box ${item.isDone ? "checked" : ""}`}
                            onClick={() =>
                              setSubTasks((current) =>
                                current.map((subTask) =>
                                  subTask.id === item.id
                                    ? { ...subTask, isDone: !subTask.isDone }
                                    : subTask
                                )
                              )
                            }
                            aria-label={`${item.title} 완료 여부 토글`}
                            title={item.isDone ? "하위 업무를 미완료로 표시" : "하위 업무를 완료로 표시"}
                          >
                            <Check size={9} className="text-white" />
                          </button>
                          <div className={`check-text ${item.isDone ? "done" : ""}`}>
                            {item.title}
                          </div>
                          <span className={`avatar avatar-sm ${getAvatarTone(index)}`}>
                            {(members.find((member) => member.id === assigneeId)?.name ?? "나").slice(0, 1)}
                          </span>
                        </div>
                      ))
                    )}

                    <div className="mt-2 flex gap-2">
                      <input
                        ref={subTaskInputRef}
                        value={newSubTaskTitle}
                        onChange={(event) => setNewSubTaskTitle(event.target.value)}
                        placeholder="하위 업무를 입력하세요"
                        className="form-input h-[40px] flex-1"
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleAddSubTask();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn-modal btn-modal-ghost"
                        onClick={handleAddSubTask}
                        disabled={!newSubTaskTitle.trim()}
                      >
                        <Plus size={14} />
                        하위 업무 추가
                      </button>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="section-label">태그</div>
                  <div className="flex flex-wrap gap-[5px]">
                    {tags.map((tag, index) => (
                      <span
                        key={`${tag}-${index}`}
                        className="rounded-full border border-[var(--border-light)] bg-[var(--surface-3)] px-[9px] py-[3px] text-[11.5px] font-medium text-[var(--text-secondary)]"
                      >
                        #{tag}
                      </span>
                    ))}
                    <button
                      type="button"
                      className="rounded-full border border-[var(--border-light)] bg-[var(--surface-3)] px-[9px] py-[3px] text-[11.5px] font-medium text-[var(--text-secondary)]"
                      onClick={handleAddTag}
                    >
                      + 태그 추가
                    </button>
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="section-label mb-0">첨부파일</div>
                    <button
                      type="button"
                      className="btn-modal btn-modal-ghost"
                      onClick={() => attachmentInputRef.current?.click()}
                    >
                      <Paperclip size={14} />
                      첨부파일
                    </button>
                  </div>
                  <div className="rounded-[10px] border border-[var(--border-light)] bg-[var(--surface)] px-4 py-3">
                    {attachments.length === 0 ? (
                      <p className="text-sm leading-6 text-[var(--text-muted)]">
                        업무 전용 첨부파일을 추가하면 프로젝트 파일과 분리되어 관리됩니다.
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
                    {linkError ? (
                      <p className="text-[12px] font-medium text-[var(--danger)]">{linkError}</p>
                    ) : (
                      <p className="text-[12px] text-[var(--text-muted)]">
                        공유 문서, 피그마, 참고 링크를 함께 남길 수 있습니다.
                      </p>
                    )}
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
                            <button
                              type="button"
                              className="btn-icon-sm"
                              aria-label={`${link.title} 링크 제거`}
                              onClick={() =>
                                setLinks((current) => current.filter((item) => item.id !== link.id))
                              }
                            >
                              <X size={14} />
                            </button>
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
                  {comments.length === 0 ? (
                    <div className="rounded-[10px] border border-[var(--border-light)] bg-[var(--surface-2)] px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                      저장 전에도 댓글 UI는 확인할 수 있어요.
                    </div>
                  ) : (
                    comments.map((comment, index) => (
                      <div key={comment.id} className="comment-item">
                        <div className={`avatar ${getAvatarTone(index)}`}>{comment.author.slice(0, 1)}</div>
                        <div className="comment-body">
                          <div className="comment-meta">
                            <span className="comment-author">{comment.author}</span>
                            <span className="comment-time">
                              {format(new Date(comment.createdAt), "오늘 a h:mm", { locale: ko })}
                            </span>
                          </div>
                          <div className="comment-text whitespace-pre-wrap">{comment.content}</div>
                        </div>
                      </div>
                    ))
                  )}
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
                  <button
                    type="button"
                    className="btn-modal btn-modal-primary h-[40px] px-4"
                    onClick={handleAddComment}
                  >
                    <SendHorizontal size={15} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-2 text-[12px] leading-[1.5] text-[var(--text-muted)]">
                  <span className="mt-[5px] h-[6px] w-[6px] shrink-0 rounded-full bg-[var(--border)]" />
                  <span>
                    <b className="text-[var(--text-secondary)]">나</b>가 새 업무 작성 화면을 열었습니다.
                  </span>
                </div>
                {title.trim() ? (
                  <div className="flex items-start gap-2 text-[12px] leading-[1.5] text-[var(--text-muted)]">
                    <span className="mt-[5px] h-[6px] w-[6px] shrink-0 rounded-full bg-[var(--border)]" />
                    <span>
                      제목 초안이 <b className="text-[var(--text-secondary)]">{title}</b>로 입력되었습니다.
                    </span>
                  </div>
                ) : null}
                {!isTaskDescriptionEmpty(description) ? (
                  <div className="flex items-start gap-2 text-[12px] leading-[1.5] text-[var(--text-muted)]">
                    <span className="mt-[5px] h-[6px] w-[6px] shrink-0 rounded-full bg-[var(--border)]" />
                    <span>{taskDescriptionToPlainText(description).slice(0, 120)}</span>
                  </div>
                ) : null}
              </div>
            )}

            {error ? (
              <p className="mt-4 text-sm font-medium text-[var(--danger)]">{error}</p>
            ) : null}
            {successMessage ? (
              <p className="mt-4 rounded-[10px] border border-[#b7e4c7] bg-[var(--success-light)] px-3 py-2 text-sm font-medium text-[#15803d]">
                {successMessage}
              </p>
            ) : null}
          </div>

          <div className="custom-scroll overflow-y-auto bg-[var(--surface-2)] px-5 py-[22px] max-[680px]:hidden">
            <div className="prop-row">
              <div className="prop-label">우선순위</div>
              <div className="relative">
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as Priority)}
                  className="status-select appearance-none pr-10 !bg-[var(--warning-light)] !text-[#c2410c]"
                >
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#c2410c]" />
              </div>
            </div>

            <div className="prop-row">
              <div className="prop-label">상태</div>
              <div className="relative">
                <select
                  value={status}
                  onChange={(event) => applyStatus(event.target.value as TaskStatus)}
                  className="status-select appearance-none pr-10"
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--accent)]" />
              </div>
            </div>

            <div className="prop-row">
              <div className="prop-label">진행률</div>
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
            </div>

            <div className="divider" />

            <div className="prop-row">
              <div className="prop-label">담당자</div>
              <label className="assignee-chip">
                <span className={`avatar avatar-sm ${getAvatarTone(1)}`}>
                  {(members.find((member) => member.id === assigneeId)?.name ?? "U").slice(0, 1)}
                </span>
                <select
                  value={assigneeId}
                  onChange={(event) => setAssigneeId(event.target.value)}
                  className="w-full appearance-none bg-transparent text-[13px] font-medium text-[var(--text-primary)] outline-none"
                >
                  <option value="">담당자 없음</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name ?? "이름 없음"}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="text-[var(--text-muted)]" />
              </label>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                담당자를 1명 이상 선택해야 등록할 수 있습니다
              </p>
            </div>

            <div className="prop-row">
              <div className="prop-label">시작일</div>
              <div className="date-chip">
                <CalendarDays size={13} />
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full bg-transparent text-[13px] outline-none"
                />
              </div>
            </div>

            <div className="prop-row">
              <div className="prop-label">마감일</div>
              <div className={`date-chip ${dueTone}`}>
                <CalendarDays size={13} />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="w-full bg-transparent text-[13px] outline-none"
                />
              </div>
            </div>

            <div className="prop-row">
              <div className="prop-label">프로젝트</div>
              {projects && !initialProjectId ? (
                <label className="assignee-chip">
                  <FolderOpen size={14} className="text-[var(--accent)]" />
                  <select
                    value={selectedProjectId}
                    onChange={(event) => setSelectedProjectId(event.target.value)}
                    className="w-full appearance-none bg-transparent text-[13px] font-medium text-[var(--text-primary)] outline-none"
                  >
                    <option value="">프로젝트 선택</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="text-[var(--text-muted)]" />
                </label>
              ) : (
                <div className="assignee-chip cursor-default">
                  <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                  <span>{resolvedProjectName}</span>
                </div>
              )}
            </div>

            <div className="divider" />

            <div className="prop-row">
              <div className="prop-label">생성자</div>
              <div className="assignee-chip cursor-default">
                <span className={`avatar avatar-sm ${getAvatarTone(0)}`}>나</span>
                <span>나</span>
              </div>
            </div>
            <div className="prop-row">
              <div className="prop-label">생성일</div>
              <div className="prop-value">{formatDisplayDate(new Date())}</div>
            </div>
            <div className="prop-row">
              <div className="prop-label">마지막 수정</div>
              <div className="prop-value">저장 전</div>
            </div>

          </div>
        </div>

        <div className="modal-footer max-[680px]:px-[18px]">
          <div />
          <div className="flex items-center gap-2">
            <button type="button" className="btn-modal btn-modal-ghost" onClick={requestClose}>
              닫기
            </button>
            <button
              type="button"
              className="btn-modal btn-modal-primary"
              onClick={() => void handleCreate()}
              disabled={loading}
            >
              {loading ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
        <TaskTagModal
          isOpen={tagModalOpen}
          existingNames={tags}
          onClose={() => setTagModalOpen(false)}
          onSubmit={(name) => {
            setTags((current) => [...current, name]);
            setTagModalOpen(false);
          }}
        />
      </div>
    </div>
  );
}
