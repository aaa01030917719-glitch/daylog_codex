"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface Page {
  id: string;
  title: string;
  emoji: string | null;
  isPublic: boolean;
  parentId: string | null;
  updatedAt: string | Date;
  author: { id: string; name: string | null; image: string | null };
  _count: { children: number };
}

interface Props {
  initialPages: Page[];
  currentUserId: string;
}

export function DocsClientPage({ initialPages }: Props) {
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>(initialPages);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const [creating, setCreating] = useState(false);

  const topLevelPages = pages.filter((p) => !p.parentId);
  const childPages = (parentId: string) => pages.filter((p) => p.parentId === parentId);

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          emoji: newEmoji.trim() || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPages((prev) => [data.page, ...prev]);
        setShowCreate(false);
        setNewTitle("");
        setNewEmoji("");
        router.push(`/docs/${data.page.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "Noto Serif KR, serif", fontSize: "1.5rem", fontWeight: 700, color: "#0D0D0D" }}>
          문서
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            background: "#F56B23",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Plus size={16} />
          새 문서
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "1rem" }}>
        {/* Left tree panel */}
        <div style={{ background: "#FAF7EE", border: "1px solid #E8E0C8", borderRadius: "0.75rem", padding: "0.875rem", height: "fit-content" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
            페이지 목록
          </p>
          {topLevelPages.length === 0 ? (
            <p style={{ fontSize: "0.8125rem", color: "#999" }}>문서가 없습니다.</p>
          ) : (
            topLevelPages.map((page) => (
              <div key={page.id}>
                <button
                  onClick={() => router.push(`/docs/${page.id}`)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.375rem 0.5rem",
                    borderRadius: "0.375rem",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    color: "#2D2D2D",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#F5EED5")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span>{page.emoji ?? <FileText size={14} />}</span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {page.title}
                  </span>
                  {page._count.children > 0 && (
                    <span style={{ fontSize: "0.6875rem", color: "#999" }}>{page._count.children}</span>
                  )}
                </button>

                {/* Children */}
                {childPages(page.id).map((child) => (
                  <button
                    key={child.id}
                    onClick={() => router.push(`/docs/${child.id}`)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.375rem 0.5rem",
                      paddingLeft: "1.5rem",
                      borderRadius: "0.375rem",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      fontSize: "0.8125rem",
                      color: "#555",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F5EED5")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <ChevronRight size={12} style={{ flexShrink: 0, color: "#999" }} />
                    <span>{child.emoji ?? ""}</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {child.title}
                    </span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Right list */}
        <div style={{ background: "#fff", border: "1px solid #E8E0C8", borderRadius: "0.75rem", overflow: "hidden" }}>
          {topLevelPages.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#999" }}>
              <FileText size={48} style={{ margin: "0 auto 1rem", color: "#E8E0C8" }} />
              <p style={{ fontSize: "0.875rem" }}>아직 문서가 없습니다.</p>
              <button
                onClick={() => setShowCreate(true)}
                style={{ marginTop: "0.75rem", color: "#F56B23", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}
              >
                첫 문서 만들기
              </button>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F5EED5" }}>
                  {["제목", "작성자", "최종 수정"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "0.75rem 1rem",
                        textAlign: "left",
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        color: "#555",
                        borderBottom: "1px solid #E8E0C8",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topLevelPages.map((page, idx) => (
                  <tr
                    key={page.id}
                    onClick={() => router.push(`/docs/${page.id}`)}
                    style={{
                      background: idx % 2 === 0 ? "#fff" : "#FAF7EE",
                      cursor: "pointer",
                      borderBottom: "1px solid #E8E0C8",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#FEF0E8")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#FAF7EE")}
                  >
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1rem" }}>{page.emoji ?? "📄"}</span>
                        <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#0D0D0D" }}>{page.title}</span>
                        {page._count.children > 0 && (
                          <span style={{ fontSize: "0.6875rem", color: "#999", background: "#F0F0F0", borderRadius: "9999px", padding: "0.125rem 0.375rem" }}>
                            +{page._count.children}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "0.875rem 1rem", fontSize: "0.8125rem", color: "#555" }}>
                      {page.author.name}
                    </td>
                    <td style={{ padding: "0.875rem 1rem", fontSize: "0.8125rem", color: "#999" }}>
                      {format(new Date(page.updatedAt), "MM/dd HH:mm", { locale: ko })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowCreate(false)}
        >
          <div
            style={{ background: "#fff", borderRadius: "0.75rem", padding: "1.5rem", maxWidth: "24rem", width: "calc(100% - 2rem)", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0D0D0D", marginBottom: "1rem" }}>
              새 문서 만들기
            </h2>

            <div style={{ marginBottom: "0.875rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#555", marginBottom: "0.375rem" }}>
                이모지 (선택)
              </label>
              <input
                value={newEmoji}
                onChange={(e) => setNewEmoji(e.target.value)}
                placeholder="예: 📝"
                maxLength={2}
                style={{
                  width: "4rem",
                  border: "1px solid #E8E0C8",
                  borderRadius: "0.5rem",
                  padding: "0.5rem",
                  fontSize: "1.25rem",
                  textAlign: "center",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#555", marginBottom: "0.375rem" }}>
                제목 <span style={{ color: "#F56B23" }}>*</span>
              </label>
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && newTitle.trim() && handleCreate()}
                placeholder="예: 팀 운영 가이드"
                style={{
                  width: "100%",
                  border: "1px solid #E8E0C8",
                  borderRadius: "0.5rem",
                  padding: "0.625rem 0.75rem",
                  fontSize: "0.875rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => setShowCreate(false)}
                style={{
                  flex: 1,
                  padding: "0.625rem",
                  border: "1px solid #E8E0C8",
                  borderRadius: "0.5rem",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  color: "#555",
                }}
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newTitle.trim()}
                style={{
                  flex: 1,
                  padding: "0.625rem",
                  border: "none",
                  borderRadius: "0.5rem",
                  background: "#F56B23",
                  color: "#fff",
                  cursor: creating || !newTitle.trim() ? "default" : "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  opacity: creating || !newTitle.trim() ? 0.5 : 1,
                }}
              >
                {creating ? "생성 중..." : "만들기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
