"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FolderOpen } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: string;
  budget: number | null;
  doneTasks: number;
  _count: { tasks: number };
}

interface Props {
  initialProjects: Project[];
  isAdmin: boolean;
}

const PRESET_COLORS = ["#F56B23", "#3B5BDB", "#2A8C50", "#D4A200", "#D93025", "#7950F2"];

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  ACTIVE: { label: "진행중", bg: "#E8F7EE", text: "#2A8C50" },
  ARCHIVED: { label: "보관됨", bg: "#F0F0F0", text: "#777" },
};

export function ProjectsClientPage({ initialProjects, isAdmin }: Props) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", color: "#F56B23", description: "", budget: "" });
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          color: form.color,
          description: form.description.trim() || null,
          budget: form.budget ? parseFloat(form.budget) : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setProjects((prev) => [data.project, ...prev]);
        setShowModal(false);
        setStep(1);
        setForm({ name: "", color: "#F56B23", description: "", budget: "" });
      }
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    setShowModal(false);
    setStep(1);
    setForm({ name: "", color: "#F56B23", description: "", budget: "" });
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "Noto Serif KR, serif", fontSize: "1.5rem", fontWeight: 700, color: "#0D0D0D" }}>
          프로젝트
        </h1>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
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
            새 프로젝트
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #E8E0C8", borderRadius: "0.75rem", padding: "3rem", textAlign: "center" }}>
          <FolderOpen size={48} style={{ color: "#E8E0C8", margin: "0 auto 1rem" }} />
          <p style={{ color: "#999", fontSize: "0.875rem" }}>아직 프로젝트가 없습니다.</p>
          {isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              style={{ marginTop: "1rem", color: "#F56B23", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}
            >
              첫 프로젝트 만들기
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
          {projects.map((p) => {
            const s = STATUS_LABELS[p.status];
            return (
              <div
                key={p.id}
                onClick={() => router.push(`/projects/${p.id}`)}
                style={{
                  background: "#fff",
                  border: "1px solid #E8E0C8",
                  borderRadius: "0.75rem",
                  padding: "1.25rem",
                  cursor: "pointer",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  transition: "box-shadow 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.75rem" }}>
                  <div style={{ width: "0.75rem", height: "0.75rem", borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#0D0D0D", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.name}
                  </h3>
                </div>

                {p.description && (
                  <p style={{ fontSize: "0.8125rem", color: "#555", marginBottom: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.description}
                  </p>
                )}

                {/* 진행률 바 */}
                {p._count.tasks > 0 && (
                  <div style={{ marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "#999" }}>진행률</span>
                      <span style={{ fontSize: "0.75rem", color: "#555", fontWeight: 600 }}>
                        {p.doneTasks}/{p._count.tasks}
                      </span>
                    </div>
                    <div style={{ height: "5px", background: "#E8E0C8", borderRadius: "9999px", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.round((p.doneTasks / p._count.tasks) * 100)}%`,
                          background: p.color,
                          borderRadius: "9999px",
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      padding: "0.125rem 0.5rem",
                      borderRadius: "9999px",
                      background: s?.bg,
                      color: s?.text,
                    }}
                  >
                    {s?.label ?? p.status}
                  </span>
                  <span style={{ fontSize: "0.8125rem", color: "#999" }}>
                    프로젝트 {p._count.tasks}개
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create project modal */}
      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={closeModal}
        >
          <div
            style={{ background: "#fff", borderRadius: "0.75rem", padding: "1.5rem", maxWidth: "28rem", width: "calc(100% - 2rem)", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: "1.25rem" }}>
              <p style={{ fontSize: "0.8125rem", color: "#999", marginBottom: "0.25rem" }}>단계 {step}/3</p>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0D0D0D" }}>
                {step === 1 ? "프로젝트 이름" : step === 2 ? "색상 및 설명" : "예산 및 최종 확인"}
              </h2>
            </div>

            {/* Step indicator */}
            <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.25rem" }}>
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  style={{
                    height: "3px",
                    flex: 1,
                    borderRadius: "9999px",
                    background: s <= step ? "#F56B23" : "#E8E0C8",
                  }}
                />
              ))}
            </div>

            {step === 1 && (
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#555", marginBottom: "0.5rem" }}>
                  프로젝트 이름 <span style={{ color: "#F56B23" }}>*</span>
                </label>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && form.name.trim() && setStep(2)}
                  placeholder="예: 2024 브랜드 리뉴얼"
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
            )}

            {step === 2 && (
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#555", marginBottom: "0.5rem" }}>
                  프로젝트 색상
                </label>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm((f) => ({ ...f, color: c }))}
                      style={{
                        width: "2rem",
                        height: "2rem",
                        borderRadius: "50%",
                        background: c,
                        border: form.color === c ? "3px solid #0D0D0D" : "2px solid transparent",
                        cursor: "pointer",
                        outline: "none",
                      }}
                    />
                  ))}
                </div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#555", marginBottom: "0.5rem" }}>
                  설명 (선택)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="프로젝트 설명을 입력하세요"
                  rows={3}
                  style={{
                    width: "100%",
                    border: "1px solid #E8E0C8",
                    borderRadius: "0.5rem",
                    padding: "0.625rem 0.75rem",
                    fontSize: "0.875rem",
                    outline: "none",
                    resize: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            )}

            {step === 3 && (
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#555", marginBottom: "0.5rem" }}>
                  예산 (선택)
                </label>
                <input
                  type="number"
                  value={form.budget}
                  onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                  placeholder="예: 10000000"
                  style={{
                    width: "100%",
                    border: "1px solid #E8E0C8",
                    borderRadius: "0.5rem",
                    padding: "0.625rem 0.75rem",
                    fontSize: "0.875rem",
                    outline: "none",
                    boxSizing: "border-box",
                    marginBottom: "1rem",
                  }}
                />

                {/* Summary */}
                <div style={{ background: "#FAF7EE", borderRadius: "0.5rem", padding: "0.875rem", fontSize: "0.875rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
                    <div style={{ width: "0.75rem", height: "0.75rem", borderRadius: "50%", background: form.color }} />
                    <strong style={{ color: "#0D0D0D" }}>{form.name}</strong>
                  </div>
                  {form.description && <p style={{ color: "#555", marginBottom: "0.25rem" }}>{form.description}</p>}
                  {form.budget && <p style={{ color: "#555" }}>예산: {Number(form.budget).toLocaleString()}원</p>}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem" }}>
              {step > 1 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
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
                  이전
                </button>
              )}
              {step < 3 ? (
                <button
                  onClick={() => form.name.trim() && setStep((s) => s + 1)}
                  disabled={step === 1 && !form.name.trim()}
                  style={{
                    flex: 1,
                    padding: "0.625rem",
                    border: "none",
                    borderRadius: "0.5rem",
                    background: "#F56B23",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    opacity: step === 1 && !form.name.trim() ? 0.5 : 1,
                  }}
                >
                  다음
                </button>
              ) : (
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: "0.625rem",
                    border: "none",
                    borderRadius: "0.5rem",
                    background: "#F56B23",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? "생성 중..." : "프로젝트 만들기"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
