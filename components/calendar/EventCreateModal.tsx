"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Check } from "lucide-react";

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

const PRESET_COLORS = ["#F56B23", "#3B5BDB", "#2A8C50", "#D4A200", "#D93025", "#7950F2"];

const today = format(new Date(), "yyyy-MM-dd");
const defaultStart = `${today}T09:00`;
const defaultEnd = `${today}T10:00`;

export function EventCreateModal({ members, onCreated, onClose }: Props) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState(defaultStart);
  const [endAt, setEndAt] = useState(defaultEnd);
  const [allDay, setAllDay] = useState(false);
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [color, setColor] = useState("#F56B23");
  const [description, setDescription] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [loading, setLoading] = useState(false);

  const steps = [
    { label: "일정 제목" },
    { label: "날짜 및 시간" },
    { label: "참석자 선택" },
    { label: "최종 확인" },
  ];

  function toggleAttendee(id: string) {
    setAttendeeIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  async function handleCreate() {
    if (!title.trim()) return;
    setLoading(true);

    const startDate = allDay ? `${startAt.split("T")[0]}T00:00:00` : startAt;
    const endDate = allDay ? `${startAt.split("T")[0]}T23:59:59` : endAt;

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          startAt: startDate,
          endAt: endDate,
          allDay,
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
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: "0.75rem", padding: "1.5rem", maxWidth: "28rem", width: "calc(100% - 2rem)", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: "1rem" }}>
          <p style={{ fontSize: "0.8125rem", color: "#999", marginBottom: "0.25rem" }}>단계 {step}/{steps.length}</p>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0D0D0D" }}>{steps[step - 1].label}</h2>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.25rem" }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                height: "3px",
                flex: 1,
                borderRadius: "9999px",
                background: i + 1 <= step ? "#F56B23" : "#E8E0C8",
              }}
            />
          ))}
        </div>

        {/* STEP 1: 일정 제목 */}
        {step === 1 && (
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#555", marginBottom: "0.5rem" }}>
              일정 제목 <span style={{ color: "#F56B23" }}>*</span>
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && title.trim() && setStep(2)}
              placeholder="예: 팀 회의"
              style={{
                width: "100%",
                border: "1px solid #E8E0C8",
                borderRadius: "0.5rem",
                padding: "0.625rem 0.75rem",
                fontSize: "0.875rem",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#F56B23")}
              onBlur={(e) => (e.target.style.borderColor = "#E8E0C8")}
            />
          </div>
        )}

        {/* STEP 2: 날짜 및 시간 */}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", cursor: "pointer", marginBottom: "0.75rem" }}>
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  style={{ accentColor: "#F56B23" }}
                />
                <span style={{ color: "#555", fontWeight: 500 }}>하루 종일</span>
              </label>

              {!allDay && (
                <>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#555", marginBottom: "0.375rem" }}>시작</label>
                  <input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    style={{
                      width: "100%",
                      border: "1px solid #E8E0C8",
                      borderRadius: "0.5rem",
                      padding: "0.5rem 0.75rem",
                      fontSize: "0.875rem",
                      outline: "none",
                      marginBottom: "0.75rem",
                      boxSizing: "border-box",
                    }}
                  />
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#555", marginBottom: "0.375rem" }}>종료</label>
                  <input
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    style={{
                      width: "100%",
                      border: "1px solid #E8E0C8",
                      borderRadius: "0.5rem",
                      padding: "0.5rem 0.75rem",
                      fontSize: "0.875rem",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </>
              )}

              {allDay && (
                <>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#555", marginBottom: "0.375rem" }}>날짜</label>
                  <input
                    type="date"
                    value={startAt.split("T")[0]}
                    onChange={(e) => setStartAt(`${e.target.value}T00:00`)}
                    style={{
                      width: "100%",
                      border: "1px solid #E8E0C8",
                      borderRadius: "0.5rem",
                      padding: "0.5rem 0.75rem",
                      fontSize: "0.875rem",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: 참석자 선택 */}
        {step === 3 && (
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#555", marginBottom: "0.5rem" }}>
              참석자 선택 (선택)
            </label>
            {members.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", maxHeight: "14rem", overflowY: "auto" }}>
                {members.map((m) => {
                  const selected = attendeeIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleAttendee(m.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.625rem",
                        padding: "0.5rem 0.75rem",
                        border: selected ? "2px solid #F56B23" : "1px solid #E8E0C8",
                        borderRadius: "0.5rem",
                        background: selected ? "#FEF0E8" : "#fff",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div style={{
                        width: "1.75rem",
                        height: "1.75rem",
                        borderRadius: "50%",
                        background: "#E8E0C8",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#555",
                        flexShrink: 0,
                        overflow: "hidden",
                      }}>
                        {m.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.image} alt={m.name ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          (m.name ?? "?").charAt(0)
                        )}
                      </div>
                      <span style={{ fontSize: "0.875rem", color: "#0D0D0D", flex: 1 }}>{m.name ?? "알 수 없음"}</span>
                      {selected && <Check size={14} style={{ color: "#F56B23", flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: "0.875rem", color: "#999", padding: "1rem", textAlign: "center" }}>팀원이 없습니다.</p>
            )}
            {attendeeIds.length > 0 && (
              <p style={{ fontSize: "0.75rem", color: "#F56B23", marginTop: "0.5rem" }}>
                {attendeeIds.length}명 선택됨
              </p>
            )}
          </div>
        )}

        {/* STEP 4: 최종 확인 */}
        {step === 4 && (
          <div>
            {/* Color */}
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#555", marginBottom: "0.5rem" }}>
              색상
            </label>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: "1.75rem",
                    height: "1.75rem",
                    borderRadius: "50%",
                    background: c,
                    border: color === c ? "3px solid #0D0D0D" : "2px solid transparent",
                    cursor: "pointer",
                    outline: "none",
                  }}
                />
              ))}
            </div>

            {/* Description */}
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#555", marginBottom: "0.5rem" }}>
              설명 (선택)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="일정 설명을 입력하세요"
              rows={2}
              style={{
                width: "100%",
                border: "1px solid #E8E0C8",
                borderRadius: "0.5rem",
                padding: "0.625rem 0.75rem",
                fontSize: "0.875rem",
                outline: "none",
                resize: "none",
                boxSizing: "border-box",
                marginBottom: "0.75rem",
              }}
            />

            {/* Important */}
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", cursor: "pointer", marginBottom: "0.75rem" }}>
              <input
                type="checkbox"
                checked={isImportant}
                onChange={(e) => setIsImportant(e.target.checked)}
                style={{ accentColor: "#F56B23" }}
              />
              <span style={{ color: "#555", fontWeight: 500 }}>⭐ 중요 일정으로 표시</span>
            </label>

            {isImportant && (
              <div style={{ background: "#FEF0E8", border: "1px solid #FDCBA8", borderRadius: "0.5rem", padding: "0.625rem 0.75rem", marginBottom: "0.75rem", fontSize: "0.8125rem", color: "#F56B23" }}>
                중요 일정은 대표님 컨펌 후 등록됩니다.
              </div>
            )}

            {/* Summary */}
            <div style={{ background: "#FAF7EE", borderRadius: "0.5rem", padding: "0.875rem", fontSize: "0.875rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
                <div style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", background: color }} />
                <strong style={{ color: "#0D0D0D" }}>{title}</strong>
              </div>
              <p style={{ color: "#555", marginBottom: "0.125rem" }}>
                {allDay ? startAt.split("T")[0] : `${startAt} ~ ${endAt}`}
              </p>
              {attendeeIds.length > 0 && (
                <p style={{ color: "#555", marginBottom: "0.125rem" }}>
                  참석자: {attendeeIds.map((id) => members.find((m) => m.id === id)?.name).filter(Boolean).join(", ")}
                </p>
              )}
              {description && <p style={{ color: "#555" }}>{description}</p>}
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
          {step < steps.length ? (
            <button
              onClick={() => title.trim() && setStep((s) => s + 1)}
              disabled={step === 1 && !title.trim()}
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
                opacity: step === 1 && !title.trim() ? 0.5 : 1,
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
              {loading ? "등록 중..." : "일정 등록"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
