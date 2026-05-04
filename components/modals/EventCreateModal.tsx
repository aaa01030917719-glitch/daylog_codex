"use client";

import { useMemo, useState } from "react";
import { useDirtyLeaveGuard } from "@/hooks/useDirtyLeaveGuard";

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

const COLOR_OPTIONS = [
  "#4f7cff",
  "#34d399",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#8b5cf6",
];

function getTodayValue() {
  return new Date().toISOString().slice(0, 10);
}

async function readError(response: Response) {
  try {
    const data = await response.json();
    if (typeof data?.error === "string") {
      return data.error;
    }
  } catch {
    return "일정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }

  return "일정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export function EventCreateModal({ members, onCreated, onClose }: Props) {
  const todayValue = useMemo(() => getTodayValue(), []);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayValue);
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [isImportant, setIsImportant] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDirty =
    title !== "" ||
    date !== todayValue ||
    allDay ||
    startTime !== "09:00" ||
    endTime !== "10:00" ||
    description !== "" ||
    color !== COLOR_OPTIONS[0] ||
    isImportant;
  const { requestClose } = useDirtyLeaveGuard({
    isDirty,
    onDiscard: onClose,
    disabled: loading,
  });

  const schedulePreview = useMemo(() => {
    if (allDay) {
      return `${date} · 종일 일정`;
    }

    return `${date} ${startTime} - ${endTime}`;
  }, [allDay, date, endTime, startTime]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError("일정 제목을 입력해 주세요.");
      return;
    }

    if (!allDay && endTime <= startTime) {
      setError("종료 시간은 시작 시간보다 늦어야 합니다.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const startAt = allDay ? `${date}T00:00:00` : `${date}T${startTime}:00`;
      const endAt = allDay ? `${date}T23:59:59` : `${date}T${endTime}:00`;

      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          startAt,
          endAt,
          allDay,
          color,
          isImportant,
        }),
      });

      if (!response.ok) {
        setError(await readError(response));
        return;
      }

      const data = (await response.json()) as { event?: EventData };
      if (!data.event) {
        setError("일정 저장 결과를 확인하지 못했습니다. 다시 시도해 주세요.");
        return;
      }

      onCreated(data.event);
    } catch (createError) {
      console.error("[EVENT_CREATE_MODAL]", createError);
      setError("일정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-shell" onClick={requestClose}>
      <div className="modal-overlay" />
      <div className="modal-card modal-card--form" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">새 일정 등록</h2>
            <p className="modal-subtitle">
              일정 제목, 날짜, 시간을 입력해 캘린더에 바로 등록하세요.
            </p>
          </div>
          <button type="button" onClick={requestClose} className="icon-button" aria-label="새 일정 모달 닫기">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-5">
            <div className="field">
              <label className="field-label" htmlFor="event-title">
                일정 제목
              </label>
              <input
                id="event-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="form-input"
                placeholder="예: 주간 운영 회의"
                autoFocus
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div className="field">
                <label className="field-label" htmlFor="event-date">
                  날짜
                </label>
                <input
                  id="event-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <label className="inline-flex h-[46px] items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-medium text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(event) => setAllDay(event.target.checked)}
                />
                종일 일정
              </label>
            </div>

            {!allDay ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="field">
                  <label className="field-label" htmlFor="event-start-time">
                    시작 시간
                  </label>
                  <input
                    id="event-start-time"
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="event-end-time">
                    종료 시간
                  </label>
                  <input
                    id="event-end-time"
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    className="form-input"
                    required
                  />
                </div>
              </div>
            ) : null}

            <div className="field">
              <span className="field-label">대표 색상</span>
              <div className="flex flex-wrap gap-3">
                {COLOR_OPTIONS.map((option) => {
                  const selected = color === option;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setColor(option)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border-2 transition-transform hover:-translate-y-0.5"
                      style={{
                        background: option,
                        borderColor: selected ? "#0f172a" : "rgba(255,255,255,0.92)",
                        boxShadow: selected ? "0 0 0 4px rgba(79,124,255,0.14)" : "var(--shadow-sm)",
                      }}
                      aria-label={`색상 ${option}`}
                    >
                      {selected ? <span className="text-sm font-bold text-white">✓</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="event-description">
                일정 설명
              </label>
              <textarea
                id="event-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="form-textarea min-h-[140px]"
                placeholder="회의 안건이나 공유 메모를 입력해 주세요"
              />
            </div>

            <label className="choice-card cursor-pointer">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isImportant}
                  onChange={(event) => setIsImportant(event.target.checked)}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">중요 일정으로 등록</div>
                  <div className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                    중요 일정은 등록과 함께 결재 요청이 생성됩니다.
                  </div>
                </div>
              </div>
            </label>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4 text-sm text-[var(--text-secondary)]">
              저장 예정 일정: <span className="font-semibold text-[var(--text-primary)]">{schedulePreview}</span>
              {members.length > 0 ? (
                <span className="block pt-2 text-xs text-[var(--text-muted)]">
                  워크스페이스 멤버 {members.length}명과 함께 일정 공유가 가능합니다.
                </span>
              ) : null}
            </div>

            {error ? (
              <div className="rounded-2xl border border-[#fecaca] bg-[var(--danger-light)] px-4 py-3 text-sm font-medium text-[#b42318]">
                {error}
              </div>
            ) : null}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={requestClose} className="secondary-button" disabled={loading}>
              취소
            </button>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? "저장 중..." : "일정 등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
