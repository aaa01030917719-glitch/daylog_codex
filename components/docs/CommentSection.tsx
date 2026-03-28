"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Send } from "lucide-react";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string | Date;
  author: Author;
}

interface Member {
  id: string;
  name: string | null;
  image: string | null;
}

interface Props {
  pageId: string;
  members: Member[];
  currentUserId: string;
}

export function CommentSection({ pageId, members, currentUserId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mentionDropdown, setMentionDropdown] = useState<{ query: string; pos: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchComments();
  }, [pageId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchComments() {
    const res = await fetch(`/api/pages/${pageId}/comments`);
    if (res.ok) {
      const data = await res.json();
      setComments(data.comments);
    }
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setContent(val);

    // @멘션 감지
    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0, cursor);
    const match = textBefore.match(/@(\w*)$/);
    if (match) {
      setMentionDropdown({ query: match[1], pos: cursor - match[0].length });
    } else {
      setMentionDropdown(null);
    }
  }

  function insertMention(member: Member) {
    if (!mentionDropdown) return;
    const before = content.slice(0, mentionDropdown.pos);
    const after = content.slice(textareaRef.current?.selectionStart ?? mentionDropdown.pos);
    const newContent = `${before}@${member.name} ${after}`;
    setContent(newContent);
    setMentionDropdown(null);
    textareaRef.current?.focus();
  }

  function parseMentionedUserIds(text: string): string[] {
    const regex = /@([^\s@]+)/g;
    const ids: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      const name = match[1];
      const member = members.find((m) => m.name === name);
      if (member && !ids.includes(member.id)) ids.push(member.id);
    }
    return ids;
  }

  async function handleSubmit() {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const mentionedUserIds = parseMentionedUserIds(content);
      const res = await fetch(`/api/pages/${pageId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), mentionedUserIds }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, data.comment]);
        setContent("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const filteredMembers = mentionDropdown
    ? members.filter(
        (m) =>
          m.id !== currentUserId &&
          m.name?.toLowerCase().includes(mentionDropdown.query.toLowerCase())
      )
    : [];

  function renderContent(text: string) {
    const parts = text.split(/(@\S+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const name = part.slice(1);
        const isMember = members.some((m) => m.name === name);
        if (isMember) {
          return (
            <span key={i} style={{ color: "#3B5BDB", fontWeight: 600 }}>
              {part}
            </span>
          );
        }
      }
      return <span key={i}>{part}</span>;
    });
  }

  return (
    <div style={{ marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid #E8E0C8" }}>
      <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#0D0D0D", marginBottom: "1.25rem" }}>
        댓글 {comments.length > 0 && <span style={{ color: "#999", fontWeight: 400 }}>({comments.length})</span>}
      </h3>

      {/* Comment list */}
      {comments.length === 0 ? (
        <p style={{ fontSize: "0.875rem", color: "#999", marginBottom: "1.25rem" }}>
          아직 댓글이 없습니다.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
          {comments.map((c) => (
            <div key={c.id} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "2rem",
                  height: "2rem",
                  borderRadius: "50%",
                  background: "#F56B23",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#fff",
                  flexShrink: 0,
                  overflow: "hidden",
                }}
              >
                {c.author.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.author.image} alt={c.author.name ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  (c.author.name ?? "?").charAt(0)
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0D0D0D" }}>{c.author.name}</span>
                  <span style={{ fontSize: "0.75rem", color: "#999" }}>
                    {format(new Date(c.createdAt), "M/d HH:mm", { locale: ko })}
                  </span>
                </div>
                <p style={{ fontSize: "0.875rem", color: "#2D2D2D", lineHeight: 1.5 }}>
                  {renderContent(c.content)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ position: "relative" }}>
        {/* Mention dropdown */}
        {mentionDropdown && filteredMembers.length > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: 0,
              right: 0,
              background: "#fff",
              border: "1px solid #E8E0C8",
              borderRadius: "0.5rem",
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
              zIndex: 10,
              maxHeight: "10rem",
              overflowY: "auto",
              marginBottom: "0.25rem",
            }}
          >
            {filteredMembers.map((m) => (
              <button
                key={m.id}
                onClick={() => insertMention(m)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 0.75rem",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  color: "#0D0D0D",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#FAF7EE")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <div style={{ width: "1.5rem", height: "1.5rem", borderRadius: "50%", background: "#E8E0C8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6875rem", fontWeight: 600, flexShrink: 0 }}>
                  {(m.name ?? "?").charAt(0)}
                </div>
                {m.name}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !mentionDropdown) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="댓글을 입력하세요. @이름으로 멘션할 수 있어요."
            rows={2}
            style={{
              flex: 1,
              border: "1px solid #E8E0C8",
              borderRadius: "0.5rem",
              padding: "0.625rem 0.75rem",
              fontSize: "0.875rem",
              outline: "none",
              resize: "none",
              lineHeight: 1.5,
              fontFamily: "inherit",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#F56B23")}
            onBlur={(e) => (e.target.style.borderColor = "#E8E0C8")}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
            style={{
              padding: "0.625rem 0.875rem",
              background: "#F56B23",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              cursor: submitting || !content.trim() ? "not-allowed" : "pointer",
              opacity: submitting || !content.trim() ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            <Send size={14} />
            등록
          </button>
        </div>
      </div>
    </div>
  );
}
