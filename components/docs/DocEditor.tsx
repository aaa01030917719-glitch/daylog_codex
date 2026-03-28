"use client";

import { useState, useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Heading from "@tiptap/extension-heading";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";

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
}

export function DocEditor({ page, currentUserId, isAdmin }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(page.title);
  const [emoji, setEmoji] = useState(page.emoji ?? "");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("saved");
  const [saveTimeout, setSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Heading.configure({ levels: [1, 2, 3] }),
      Placeholder.configure({ placeholder: "내용을 입력하세요..." }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: page.content as object ?? "",
    onUpdate: ({ editor }) => {
      handleAutoSave({ content: editor.getJSON() });
    },
  });

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

  function handleTitleChange(newTitle: string) {
    setTitle(newTitle);
    handleAutoSave({ title: newTitle });
  }

  function handleEmojiChange(newEmoji: string) {
    setEmoji(newEmoji);
    handleAutoSave({ emoji: newEmoji || undefined });
  }

  useEffect(() => {
    return () => {
      if (saveTimeout) clearTimeout(saveTimeout);
    };
  }, [saveTimeout]);

  const canDelete = isAdmin || page.authorId === currentUserId;

  async function handleDelete() {
    if (!confirm("문서를 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/pages/${page.id}`, { method: "DELETE" });
    if (res.ok) router.push("/docs");
  }

  return (
    <div style={{ maxWidth: "48rem", margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "1rem", fontSize: "0.8125rem", color: "#999" }}>
        <button
          onClick={() => router.push("/docs")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#555", display: "flex", alignItems: "center", gap: "0.25rem" }}
        >
          <ArrowLeft size={14} />
          문서
        </button>
        {page.parent && (
          <>
            <ChevronRight size={12} />
            <button
              onClick={() => router.push(`/docs/${page.parent!.id}`)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#555" }}
            >
              {page.parent.emoji} {page.parent.title}
            </button>
          </>
        )}
        <ChevronRight size={12} />
        <span style={{ color: "#999" }}>{emoji} {title}</span>
      </div>

      {/* Save status */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
        <span style={{ fontSize: "0.75rem", color: saveStatus === "saved" ? "#2A8C50" : "#999" }}>
          {saveStatus === "saving" ? "저장 중..." : saveStatus === "saved" ? "저장됨" : ""}
        </span>
      </div>

      {/* Emoji + Title */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "1rem" }}>
        <input
          value={emoji}
          onChange={(e) => handleEmojiChange(e.target.value)}
          placeholder="📄"
          maxLength={2}
          style={{
            width: "3rem",
            fontSize: "2rem",
            textAlign: "center",
            border: "none",
            outline: "none",
            background: "transparent",
            cursor: "text",
            flexShrink: 0,
          }}
        />
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          style={{
            flex: 1,
            fontSize: "2rem",
            fontWeight: 700,
            fontFamily: "Noto Serif KR, serif",
            color: "#0D0D0D",
            border: "none",
            outline: "none",
            background: "transparent",
            width: "100%",
          }}
        />
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          padding: "0.5rem",
          background: "#FAF7EE",
          borderRadius: "0.5rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
          border: "1px solid #E8E0C8",
        }}
      >
        {[
          { label: "B", cmd: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive("bold") },
          { label: "I", cmd: () => editor?.chain().focus().toggleItalic().run(), active: editor?.isActive("italic") },
          { label: "H1", cmd: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), active: editor?.isActive("heading", { level: 1 }) },
          { label: "H2", cmd: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: editor?.isActive("heading", { level: 2 }) },
          { label: "H3", cmd: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), active: editor?.isActive("heading", { level: 3 }) },
          { label: "•List", cmd: () => editor?.chain().focus().toggleBulletList().run(), active: editor?.isActive("bulletList") },
          { label: "1.List", cmd: () => editor?.chain().focus().toggleOrderedList().run(), active: editor?.isActive("orderedList") },
          { label: "☑ Task", cmd: () => editor?.chain().focus().toggleTaskList().run(), active: editor?.isActive("taskList") },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={btn.cmd}
            style={{
              padding: "0.25rem 0.625rem",
              border: "none",
              borderRadius: "0.25rem",
              background: btn.active ? "#F56B23" : "transparent",
              color: btn.active ? "#fff" : "#555",
              fontSize: "0.8125rem",
              fontWeight: btn.label === "B" ? 700 : 400,
              fontStyle: btn.label === "I" ? "italic" : "normal",
              cursor: "pointer",
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #E8E0C8",
          borderRadius: "0.75rem",
          padding: "1.5rem",
          minHeight: "20rem",
        }}
      >
        <style>{`
          .ProseMirror:focus { outline: none; }
          .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #999;
            pointer-events: none;
            height: 0;
          }
          .ProseMirror ul[data-type="taskList"] { list-style: none; padding: 0; }
          .ProseMirror ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.25rem; }
          .ProseMirror ul[data-type="taskList"] li input[type="checkbox"] { margin-top: 0.25rem; accent-color: #F56B23; }
          .ProseMirror h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.5rem; }
          .ProseMirror h2 { font-size: 1.375rem; font-weight: 600; margin-bottom: 0.375rem; }
          .ProseMirror h3 { font-size: 1.125rem; font-weight: 600; margin-bottom: 0.25rem; }
          .ProseMirror p { margin-bottom: 0.5rem; line-height: 1.6; }
          .ProseMirror ul, .ProseMirror ol { padding-left: 1.5rem; margin-bottom: 0.5rem; }
        `}</style>
        <EditorContent editor={editor} />
      </div>

      {/* Children pages */}
      {page.children.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "#555", marginBottom: "0.5rem" }}>
            하위 문서
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {page.children.map((child) => (
              <button
                key={child.id}
                onClick={() => router.push(`/docs/${child.id}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.625rem 0.875rem",
                  border: "1px solid #E8E0C8",
                  borderRadius: "0.5rem",
                  background: "#FAF7EE",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: "0.875rem",
                  color: "#2D2D2D",
                }}
              >
                <span>{child.emoji ?? "📄"}</span>
                <span style={{ flex: 1 }}>{child.title}</span>
                <span style={{ fontSize: "0.75rem", color: "#999" }}>{child.author.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Delete */}
      {canDelete && (
        <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid #E8E0C8" }}>
          <button
            onClick={handleDelete}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #FDECEA",
              borderRadius: "0.5rem",
              background: "#FDECEA",
              color: "#D93025",
              fontSize: "0.8125rem",
              cursor: "pointer",
            }}
          >
            문서 삭제
          </button>
        </div>
      )}
    </div>
  );
}
