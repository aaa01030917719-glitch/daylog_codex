"use client";

import { useState } from "react";
import { format } from "date-fns";
import { X } from "lucide-react";

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

interface Member {
  id: string;
  name: string | null;
  image: string | null;
}

interface Props {
  members: Member[];
  onCreated: (project: Project) => void;
  onClose: () => void;
}

const today = format(new Date(), "yyyy-MM-dd");

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #E8E0C8",
  borderRadius: "0.5rem",
  padding: "0.625rem 0.75rem",
  fontSize: "0.875rem",
  outline: "none",
  boxSizing: "border-box",
  color: "#0D0D0D",
  background: "#fff",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#2D2D2D",
  marginBottom: "0.375rem",
};

export function ProjectCreateModal({ members, onCreated, onClose }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSelected = members.length > 0 && assigneeIds.length === members.length;

  function toggleAll() {
    setAssigneeIds(allSelected ? [] : members.map((m) => m.id));
  }

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          color: "#F56B23",
          budget: null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onCreated(data.project);
      } else {
        setError(data.error ?? "프로젝트 생성에 실패했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: "0.875rem", width: "100%", maxWidth: "42rem", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: "1px solid #E8E0C8" }}>
          <h2 style={{ fontFamily: "Noto Serif KR, serif", fontSize: "1.125rem", fontWeight: 700, color: "#0D0D0D", margin: 0 }}>
            새 프로젝트 생성
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#999", padding: "0.25rem", borderRadius: "0.25rem", display: "flex" }}>
            <X size={20} />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {error && (
            <div style={{ background: "#FDECEA", border: "1px solid #fca5a5", borderRadius: "0.5rem", padding: "0.75rem 1rem", fontSize: "0.875rem", color: "#D93025" }}>
              {error}
            </div>
          )}
          {/* 1. 프로젝트 이름 */}
          <div>
            <label style={labelStyle}>
              프로젝트 이름 <span style={{ color: "#F56B23" }}>*</span>
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예) 2분기 마케팅 캠페인, 앱 리뉴얼"
              required
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#F56B23")}
              onBlur={(e) => (e.target.style.borderColor = "#E8E0C8")}
            />
          </div>

          {/* 2. 프로젝트 설명 */}
          <div>
            <label style={labelStyle}>프로젝트 설명 (선택)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예) 신규 고객 유입을 위한 SNS 및 검색 광고 통합 캠페인"
              rows={4}
              style={{ ...inputStyle, resize: "vertical", minHeight: "5rem" }}
              onFocus={(e) => (e.target.style.borderColor = "#F56B23")}
              onBlur={(e) => (e.target.style.borderColor = "#E8E0C8")}
            />
          </div>

          {/* 3. 시작일 / 마감일 */}
          <div>
            <label style={labelStyle}>기간</label>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#F56B23")}
                  onBlur={(e) => (e.target.style.borderColor = "#E8E0C8")}
                />
              </div>
              <span style={{ color: "#999", fontSize: "0.875rem", flexShrink: 0 }}>~</span>
              <div style={{ flex: 1 }}>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#F56B23")}
                  onBlur={(e) => (e.target.style.borderColor = "#E8E0C8")}
                />
              </div>
            </div>
          </div>

          {/* 4. 담당자 */}
          {members.length > 0 && (
            <div>
              <label style={labelStyle}>담당자</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={toggleAll}
                  style={{
                    padding: "0.375rem 0.875rem",
                    borderRadius: "9999px",
                    border: `1px solid ${allSelected ? "#fcd9c2" : "#E8E0C8"}`,
                    background: allSelected ? "#FEF0E8" : "#FAF7EE",
                    color: allSelected ? "#D4581A" : "#555555",
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  전체
                </button>
                {members.map((m) => {
                  const selected = assigneeIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleAssignee(m.id)}
                      style={{
                        padding: "0.375rem 0.875rem",
                        borderRadius: "9999px",
                        border: `1px solid ${selected ? "#fcd9c2" : "#E8E0C8"}`,
                        background: selected ? "#FEF0E8" : "#FAF7EE",
                        color: selected ? "#D4581A" : "#555555",
                        fontSize: "0.8125rem",
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {m.name ?? "알 수 없음"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </form>

        {/* 하단 버튼 */}
        <div style={{ display: "flex", gap: "0.5rem", padding: "1rem 1.5rem", borderTop: "1px solid #E8E0C8" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: "0.625rem",
              border: "1px solid #E8E0C8",
              borderRadius: "0.5rem",
              background: "#fff",
              color: "#555555",
              fontSize: "0.875rem",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            style={{
              flex: 2,
              padding: "0.625rem",
              border: "none",
              borderRadius: "0.5rem",
              background: "#F56B23",
              color: "#fff",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: loading || !name.trim() ? "not-allowed" : "pointer",
              opacity: loading || !name.trim() ? 0.6 : 1,
            }}
          >
            {loading ? "생성 중..." : "생성"}
          </button>
        </div>
      </div>
    </div>
  );
}
