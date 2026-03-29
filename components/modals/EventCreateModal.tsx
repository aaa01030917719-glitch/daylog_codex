"use client";

import { useState } from "react";
import { format } from "date-fns";
import { X, Check } from "lucide-react";

const COLOR_PALETTE = [
  "#F87171", "#FB923C", "#FBBF24",
  "#A3E635", "#34D399", "#2DD4BF",
  "#38BDF8", "#60A5FA", "#A78BFA",
  "#F472B6", "#FB7185", "#94A3B8",
];

interface EventData {
  id: string;
  title: string;
  description: string | null;
  startAt: string | Date;
  endAt: string | Date;
  allDay: boolean;
  color: string;
  isImportant: boolean;
  requiresApproval: boolean;
  workspaceId: string;
  creatorId: string;
  creator: { name: string | null };
}

interface Member {
  id: string;
  name: string | null;
  image: string | null;
}

interface Props {
  members: Member[];
  onCreated: (event: EventData) => void;
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

export function EventCreateModal({ members, onCreated, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [isImportant, setIsImportant] = useState(false);
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#60A5FA");
  const [loading, setLoading] = useState(false);

  const allSelected = members.length > 0 && attendeeIds.length === members.length;

  function toggleAll() {
    setAttendeeIds(allSelected ? [] : members.map((m) => m.id));
  }

  function toggleAttendee(id: string) {
    setAttendeeIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          startAt: `${date}T${startTime}:00`,
          endAt: `${date}T${endTime}:00`,
          allDay: false,
          color,
          isImportant,
          attendeeIds,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onCreated(data.event);
      }
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
            새 일정 등록
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#999", padding: "0.25rem", borderRadius: "0.25rem", display: "flex" }}>
            <X size={20} />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* 1. 일정 제목 */}
          <div>
            <label style={labelStyle}>
              일정 제목 <span style={{ color: "#F56B23" }}>*</span>
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 주간 팀 미팅, 클라이언트 미팅"
              required
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#F56B23")}
              onBlur={(e) => (e.target.style.borderColor = "#E8E0C8")}
            />
          </div>

          {/* 2. 날짜 */}
          <div>
            <label style={labelStyle}>
              날짜 <span style={{ color: "#F56B23" }}>*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#F56B23")}
              onBlur={(e) => (e.target.style.borderColor = "#E8E0C8")}
            />
          </div>

          {/* 3. 시작 / 종료 시간 */}
          <div>
            <label style={labelStyle}>시간</label>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#F56B23")}
                  onBlur={(e) => (e.target.style.borderColor = "#E8E0C8")}
                />
              </div>
              <span style={{ color: "#999", fontSize: "0.875rem", flexShrink: 0 }}>~</span>
              <div style={{ flex: 1 }}>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#F56B23")}
                  onBlur={(e) => (e.target.style.borderColor = "#E8E0C8")}
                />
              </div>
            </div>
          </div>

          {/* 4. 참석자 */}
          {members.length > 0 && (
            <div>
              <label style={labelStyle}>참석자</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {/* 전체 버튼 */}
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
                  const selected = attendeeIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleAttendee(m.id)}
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

          {/* 5. 색상 선택 */}
          <div>
            <label style={labelStyle}>색상</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: c,
                    border: color === c ? "2px solid #0D0D0D" : "2px solid transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    outline: "none",
                    flexShrink: 0,
                  }}
                  aria-label={c}
                >
                  {color === c && <Check size={11} style={{ color: "#fff" }} strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          {/* 6. 중요 일정 */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={isImportant}
                onChange={(e) => setIsImportant(e.target.checked)}
                style={{ accentColor: "#F56B23", width: "1rem", height: "1rem" }}
              />
              <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#2D2D2D" }}>⭐ 중요 일정으로 표시</span>
            </label>
            {isImportant && (
              <p style={{ marginTop: "0.375rem", fontSize: "0.8125rem", color: "#F56B23", paddingLeft: "1.5rem" }}>
                대표 컨펌이 요청됩니다
              </p>
            )}
          </div>

          {/* 7. 내용 */}
          <div>
            <label style={labelStyle}>내용 (선택)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예) 3분기 성과 리뷰 및 4분기 목표 설정 논의. 자료는 사전에 공유 예정."
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
              onFocus={(e) => (e.target.style.borderColor = "#F56B23")}
              onBlur={(e) => (e.target.style.borderColor = "#E8E0C8")}
            />
          </div>
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
            disabled={loading || !title.trim()}
            style={{
              flex: 2,
              padding: "0.625rem",
              border: "none",
              borderRadius: "0.5rem",
              background: "#F56B23",
              color: "#fff",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: loading || !title.trim() ? "not-allowed" : "pointer",
              opacity: loading || !title.trim() ? 0.6 : 1,
            }}
          >
            {loading ? "등록 중..." : "등록"}
          </button>
        </div>
      </div>
    </div>
  );
}
