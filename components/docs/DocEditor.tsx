"use client";

import { useCallback, useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Heading from "@tiptap/extension-heading";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bold,
  ChevronRight,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Loader2,
  Trash2,
} from "lucide-react";
import styles from "@/components/docs/DocEditor.module.css";

interface PageChild {
  id: string;
  title: string;
  emoji: string | null;
  updatedAt: string;
  author: { id: string; name: string | null };
}

interface PageParent {
  id: string;
  title: string;
  emoji: string | null;
}

interface PageData {
  id: string;
  title: string;
  emoji: string | null;
  content: unknown;
  isPublic: boolean;
  parentId: string | null;
  authorId: string;
  updatedAt: string;
  parent: PageParent | null;
  children: PageChild[];
}

interface Props {
  page: PageData;
  currentUserId: string;
  isAdmin: boolean;
  source?: string | null;
}

export function DocEditor({ page, currentUserId, isAdmin, source }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(page.title);
  const [emoji, setEmoji] = useState(page.emoji ?? "");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("saved");
  const [saveTimeout, setSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const noticeSource =
    source === "notices" || source === "meeting-note" ? source : null;
  const backHref =
    noticeSource === "meeting-note" ? "/notices?tab=meeting-notes" : noticeSource ? "/notices" : "/docs";

  function buildDocHref(pageId: string) {
    if (!noticeSource) {
      return `/docs/${pageId}`;
    }

    return `/docs/${pageId}?source=${encodeURIComponent(noticeSource)}`;
  }

  const handleAutoSave = useCallback(
    (data: { title?: string; content?: object; emoji?: string }) => {
      if (saveTimeout) clearTimeout(saveTimeout);
      setSaveStatus("saving");

      const timeout = setTimeout(async () => {
        try {
          await fetch(`/api/pages/${page.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          setSaveStatus("saved");
        } catch {
          setSaveStatus("idle");
        }
      }, 1000);

      setSaveTimeout(timeout);
    },
    [page.id, saveTimeout]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false }),
      Heading.configure({ levels: [1, 2, 3] }),
      Placeholder.configure({ placeholder: "내용을 입력해 주세요..." }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: (page.content as object) ?? "",
    editorProps: {
      attributes: {
        class: "doc-editor-content",
      },
    },
    onFocus: () => {
      setIsEditorFocused(true);
    },
    onBlur: () => {
      setIsEditorFocused(false);
    },
    onUpdate: ({ editor: nextEditor }) => {
      handleAutoSave({ content: nextEditor.getJSON() });
    },
  });

  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  function handleTitleChange(newTitle: string) {
    setTitle(newTitle);
    handleAutoSave({ title: newTitle });
  }

  function handleEmojiChange(newEmoji: string) {
    setEmoji(newEmoji);
    handleAutoSave({ emoji: newEmoji || undefined });
  }

  async function handleDelete() {
    if (!confirm("문서를 삭제하시겠습니까?")) {
      return;
    }

    const response = await fetch(`/api/pages/${page.id}`, { method: "DELETE" });
    if (response.ok) {
      router.push(backHref);
    }
  }

  const canDelete = isAdmin || page.authorId === currentUserId;
  const toolbarButtons = [
    {
      key: "bold",
      title: "굵게",
      icon: <Bold size={13} />,
      active: editor?.isActive("bold") ?? false,
      onClick: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      key: "italic",
      title: "기울임",
      icon: <Italic size={13} />,
      active: editor?.isActive("italic") ?? false,
      onClick: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      key: "h1",
      title: "제목 1",
      icon: <Heading1 size={13} />,
      active: editor?.isActive("heading", { level: 1 }) ?? false,
      onClick: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      key: "h2",
      title: "제목 2",
      icon: <Heading2 size={13} />,
      active: editor?.isActive("heading", { level: 2 }) ?? false,
      onClick: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      key: "h3",
      title: "제목 3",
      icon: <Heading3 size={13} />,
      active: editor?.isActive("heading", { level: 3 }) ?? false,
      onClick: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      key: "bullet",
      title: "글머리 기호",
      icon: <List size={13} />,
      active: editor?.isActive("bulletList") ?? false,
      onClick: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      key: "ordered",
      title: "번호 목록",
      icon: <ListOrdered size={13} />,
      active: editor?.isActive("orderedList") ?? false,
      onClick: () => editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      key: "task",
      title: "체크리스트",
      icon: <ListChecks size={13} />,
      active: editor?.isActive("taskList") ?? false,
      onClick: () => editor?.chain().focus().toggleTaskList().run(),
    },
  ];

  return (
    <div className="space-y-5">
      <section className="card-panel overflow-hidden">
        <div className="border-b border-[var(--border-light)] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-[13px] text-[var(--text-muted)]">
              <button
                type="button"
                onClick={() => router.push(backHref)}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[var(--text-secondary)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
              >
                <ArrowLeft size={14} />
                문서
              </button>
              {page.parent ? (
                <>
                  <ChevronRight size={12} />
                  <button
                    type="button"
                    onClick={() => router.push(buildDocHref(page.parent!.id))}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[var(--text-secondary)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                  >
                    <span>{page.parent.emoji ?? "📄"}</span>
                    <span className="truncate">{page.parent.title}</span>
                  </button>
                </>
              ) : null}
              <ChevronRight size={12} />
              <span className="truncate text-[var(--text-primary)]">
                {emoji || "📄"} {title}
              </span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-light)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-muted)]">
              {saveStatus === "saving" ? <Loader2 size={13} className="animate-spin" /> : null}
              <span>
                {saveStatus === "saving"
                  ? "저장 중..."
                  : saveStatus === "saved"
                    ? "저장 완료"
                    : "편집 중"}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="flex items-end gap-3">
            <div className="field w-[72px] shrink-0">
              <label className="field-label" htmlFor="doc-editor-emoji">
                아이콘
              </label>
              <input
                id="doc-editor-emoji"
                value={emoji}
                onChange={(event) => handleEmojiChange(event.target.value)}
                placeholder="📄"
                maxLength={2}
                className="form-input h-[54px] px-0 text-center text-[24px]"
              />
            </div>

            <div className="field min-w-0 flex-1">
              <label className="field-label" htmlFor="doc-editor-title">
                제목
              </label>
              <input
                id="doc-editor-title"
                value={title}
                onChange={(event) => handleTitleChange(event.target.value)}
                placeholder="회의록 제목을 입력해 주세요"
                className="form-input h-[54px] text-[22px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div
            className={styles.editorFrame}
            data-focused={isEditorFocused ? "true" : "false"}
          >
            <div className="editor-toolbar">
              {toolbarButtons.slice(0, 2).map((button) => (
                <button
                  key={button.key}
                  type="button"
                  className={`toolbar-btn ${button.active ? "is-active" : ""}`}
                  aria-label={button.title}
                  title={button.title}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={button.onClick}
                >
                  {button.icon}
                </button>
              ))}
              <span className="toolbar-sep" />
              {toolbarButtons.slice(2, 5).map((button) => (
                <button
                  key={button.key}
                  type="button"
                  className={`toolbar-btn ${button.active ? "is-active" : ""}`}
                  aria-label={button.title}
                  title={button.title}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={button.onClick}
                >
                  {button.icon}
                </button>
              ))}
              <span className="toolbar-sep" />
              {toolbarButtons.slice(5).map((button) => (
                <button
                  key={button.key}
                  type="button"
                  className={`toolbar-btn ${button.active ? "is-active" : ""}`}
                  aria-label={button.title}
                  title={button.title}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={button.onClick}
                >
                  {button.icon}
                </button>
              ))}
            </div>

            <div className={styles.editorShell}>
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      </section>

      {page.children.length > 0 ? (
        <section className="card-panel">
          <div className="card-header card-header--compact">
            <div>
              <h3 className="card-title">하위 문서</h3>
              <p className="card-subtitle">연결된 회의록과 문서를 바로 열 수 있습니다.</p>
            </div>
          </div>
          <div className="card-body space-y-2 p-4">
            {page.children.map((child) => (
              <button
                key={child.id}
                type="button"
                onClick={() => router.push(buildDocHref(child.id))}
                className="flex w-full items-center gap-3 rounded-[12px] border border-[var(--border-light)] bg-[var(--surface)] px-4 py-3 text-left transition hover:bg-[var(--surface-2)]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--surface-2)] text-base">
                  {child.emoji ?? "📄"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {child.title}
                  </div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">
                    {child.author.name ?? "이름 없음"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {canDelete ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="btn-modal btn-modal-danger"
          >
            <Trash2 size={14} />
            문서 삭제
          </button>
        </div>
      ) : null}
    </div>
  );
}
