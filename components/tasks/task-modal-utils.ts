"use client";

export type TaskEditorAction =
  | "bold"
  | "italic"
  | "underline"
  | "bullet"
  | "number"
  | "mention";

export interface TaskAttachmentMeta {
  id: string;
  name: string;
  size: number;
  mimeType?: string | null;
  createdAt: string;
  uploaderId?: string | null;
}

export interface TaskLinkMeta {
  id: string;
  title: string;
  url: string;
  createdAt: string;
}

const TASK_PROGRESS_STORAGE_PREFIX = "task-progress:";
const TASK_EDITOR_HTML_PATTERN = /<\/?(strong|b|em|i|u|p|div|br|ul|ol|li|span|img)\b/i;

interface ApplyTextFormatInput {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  action: TaskEditorAction;
}

interface ApplyTextFormatResult {
  nextValue: string;
  nextSelectionStart: number;
  nextSelectionEnd: number;
}

function applyInlineFormat(
  value: string,
  start: number,
  end: number,
  prefix: string,
  suffix = prefix
): ApplyTextFormatResult {
  const selected = value.slice(start, end);
  const replacement = `${prefix}${selected}${suffix}`;
  const nextValue = `${value.slice(0, start)}${replacement}${value.slice(end)}`;
  const cursorStart = start + prefix.length;
  const cursorEnd = cursorStart + selected.length;

  return {
    nextValue,
    nextSelectionStart: cursorStart,
    nextSelectionEnd: cursorEnd,
  };
}

function applyLinePrefix(
  value: string,
  start: number,
  end: number,
  linePrefix: (lineIndex: number) => string
): ApplyTextFormatResult {
  const blockStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const nextBreak = value.indexOf("\n", end);
  const blockEnd = nextBreak === -1 ? value.length : nextBreak;
  const selectedBlock = value.slice(blockStart, blockEnd);
  const lines = selectedBlock.split("\n");
  const prefixedBlock = lines
    .map((line, index) => `${linePrefix(index)}${line}`)
    .join("\n");
  const nextValue = `${value.slice(0, blockStart)}${prefixedBlock}${value.slice(blockEnd)}`;
  const prefixDelta = prefixedBlock.length - selectedBlock.length;

  return {
    nextValue,
    nextSelectionStart: start + linePrefix(0).length,
    nextSelectionEnd: end + prefixDelta,
  };
}

export function applyTextFormat({
  value,
  selectionStart,
  selectionEnd,
  action,
}: ApplyTextFormatInput): ApplyTextFormatResult {
  switch (action) {
    case "bold":
      return applyInlineFormat(value, selectionStart, selectionEnd, "**");
    case "italic":
      return applyInlineFormat(value, selectionStart, selectionEnd, "_");
    case "underline":
      return applyInlineFormat(value, selectionStart, selectionEnd, "<u>", "</u>");
    case "mention": {
      const prefix = "@";
      const nextValue = `${value.slice(0, selectionStart)}${prefix}${value.slice(selectionEnd)}`;
      const cursor = selectionStart + prefix.length;
      return {
        nextValue,
        nextSelectionStart: cursor,
        nextSelectionEnd: cursor,
      };
    }
    case "bullet":
      return applyLinePrefix(value, selectionStart, selectionEnd, () => "- ");
    case "number":
      return applyLinePrefix(value, selectionStart, selectionEnd, (lineIndex) => `${lineIndex + 1}. `);
    default:
      return {
        nextValue: value,
        nextSelectionStart: selectionStart,
        nextSelectionEnd: selectionEnd,
      };
  }
}

function escapeTaskEditorHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeTaskEditorEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&gt;/gi, ">")
    .replace(/&lt;/gi, "<")
    .replace(/&amp;/gi, "&");
}

export function normalizeTaskDescriptionHtml(value: string | null | undefined) {
  const raw = typeof value === "string" ? value : "";
  if (!raw.trim()) {
    return "";
  }

  if (TASK_EDITOR_HTML_PATTERN.test(raw)) {
    return raw;
  }

  let escaped = escapeTaskEditorHtml(raw);
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  escaped = escaped.replace(/(^|[\s(])_([^_]+)_($|[\s).,!?:;])/g, "$1<em>$2</em>$3");

  return escaped.replace(/\r?\n/g, "<br>");
}

export function taskDescriptionToPlainText(value: string | null | undefined) {
  const raw = typeof value === "string" ? value : "";
  if (!raw) {
    return "";
  }

  return decodeTaskEditorEntities(
    raw
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(div|p|li|ul|ol|h[1-6])>/gi, "\n")
      .replace(/<li>/gi, "• ")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isTaskDescriptionEmpty(value: string | null | undefined) {
  return taskDescriptionToPlainText(value).trim().length === 0;
}

export function toTaskAttachmentMetas(files: FileList | File[]): TaskAttachmentMeta[] {
  return Array.from(files).map((file) => ({
    id: `task-file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    size: file.size,
    mimeType: file.type || null,
    createdAt: new Date().toISOString(),
  }));
}

function getLinkStorageKey(taskId: string) {
  return `task-links:${taskId}`;
}

export function loadTaskLinkMetas(taskId: string): TaskLinkMeta[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getLinkStorageKey(taskId));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as TaskLinkMeta[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTaskLinkMetas(taskId: string, links: TaskLinkMeta[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getLinkStorageKey(taskId), JSON.stringify(links));
  } catch {
    // ignore local storage failures
  }
}

export function normalizeTaskLinkUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    try {
      return new URL(`https://${trimmed}`).toString();
    } catch {
      return "";
    }
  }
}

export function normalizeTaskProgress(value: unknown, fallback = 0) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return Math.max(0, Math.min(100, Math.round(fallback)));
  }

  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function getProgressStorageKey(taskId: string) {
  return `${TASK_PROGRESS_STORAGE_PREFIX}${taskId}`;
}

export function loadTaskProgress(taskId: string, fallback = 0) {
  if (typeof window === "undefined") {
    return normalizeTaskProgress(fallback);
  }

  const raw = window.localStorage.getItem(getProgressStorageKey(taskId));
  return normalizeTaskProgress(raw ?? fallback, fallback);
}

export function saveTaskProgress(taskId: string, progress: number) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getProgressStorageKey(taskId), String(normalizeTaskProgress(progress)));
  } catch {
    // ignore local storage failures
  }
}

export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("파일을 읽지 못했습니다."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}
