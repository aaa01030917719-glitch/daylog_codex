"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CalendarEventGroupKindValue,
  CalendarGroup,
  CalendarItem,
} from "@/components/calendar/types";
import {
  CALENDAR_COLOR_SWATCHES,
  getPresetPalette,
  resolveEventPalette,
} from "@/lib/calendar/shared";

interface CreateEventModalProps {
  open: boolean;
  initialDate: string | null;
  editingItem: CalendarItem | null;
  groups: CalendarGroup[];
  onClose: () => void;
  onCreated: () => Promise<void> | void;
  onUpdated: () => Promise<void> | void;
}

function resolveGroupKind(group: CalendarGroup): CalendarEventGroupKindValue {
  if (group.type === "custom") {
    return "CUSTOM";
  }

  if (group.type === "project") {
    return "PROJECT";
  }

  if (group.systemKey === "companyAll") {
    return "COMPANY_ALL";
  }

  if (group.systemKey === "teamShared") {
    return "TEAM_SHARED";
  }

  return "PERSONAL";
}

export function CreateEventModal({
  open,
  initialDate,
  editingItem,
  groups,
  onClose,
  onCreated,
  onUpdated,
}: CreateEventModalProps) {
  const editableGroups = useMemo(
    () => groups.filter((group) => group.canCreateEvent && group.type !== "project"),
    [groups]
  );
  const [title, setTitle] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupId, setGroupId] = useState("");
  const [color, setColor] = useState<string>(CALENDAR_COLOR_SWATCHES[0]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const defaultDate = initialDate ?? new Date().toISOString().slice(0, 10);
    const defaultGroup = editableGroups[0]?.id ?? "";

    setTitle(editingItem?.title ?? "");
    setAllDay(editingItem?.allDay ?? true);
    setStartDate(editingItem?.startDate ?? defaultDate);
    setEndDate(editingItem?.endDate ?? defaultDate);
    setGroupId(editingItem?.groupId ?? defaultGroup);
    setColor(
      editingItem
        ? resolveEventPalette(editingItem.color, editingItem.textColor).swatch
        : CALENDAR_COLOR_SWATCHES[0]
    );
    setDescription(editingItem?.description ?? "");
    setError(null);
    setSubmitting(false);
  }, [editableGroups, editingItem, initialDate, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const selectedGroup = editableGroups.find((group) => group.id === groupId) ?? editableGroups[0];
  const usesCustomGroupColor = selectedGroup?.type === "custom";
  const customGroupPalette =
    usesCustomGroupColor && selectedGroup
      ? resolveEventPalette(selectedGroup.color)
      : null;

  async function handleSubmit() {
    if (!title.trim()) {
      setError("일정 제목을 입력해 주세요.");
      return;
    }

    if (!startDate || !endDate) {
      setError("시작일과 종료일을 모두 입력해 주세요.");
      return;
    }

    if (!selectedGroup) {
      setError("선택 가능한 일정 그룹이 없습니다.");
      return;
    }

    if (endDate < startDate) {
      setError("종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: title.trim(),
        startDate,
        endDate,
        allDay,
        groupId: selectedGroup.id,
        groupKind: resolveGroupKind(selectedGroup),
        customGroupId:
          selectedGroup.type === "custom"
            ? selectedGroup.id.replace(/^custom-/, "")
            : null,
        projectId: null,
        color: usesCustomGroupColor
          ? customGroupPalette?.swatch ?? selectedGroup.color
          : getPresetPalette(color).swatch,
        description: description.trim(),
      };

      const response = await fetch(
        editingItem ? `/api/calendar/events/${editingItem.id}` : "/api/calendar/events",
        {
          method: editingItem ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "일정을 저장하지 못했습니다.");
        return;
      }

      if (editingItem) {
        await onUpdated();
      } else {
        await onCreated();
      }

      onClose();
    } catch (submitError) {
      console.error("[CALENDAR_MODAL_SUBMIT]", submitError);
      setError("일정을 저장하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="calendar-modal-overlay open" onClick={onClose}>
      <div className="calendar-modal" onClick={(event) => event.stopPropagation()}>
        <div className="calendar-modal-header">
          <span className="calendar-modal-title">
            {editingItem ? "일정 수정" : "새 일정 만들기"}
          </span>
          <button type="button" className="calendar-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="calendar-modal-body">
          <div className="calendar-form-group">
            <label className="calendar-form-label">
              일정 제목 <span className="req">*</span>
            </label>
            <input
              className="calendar-form-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="일정 제목을 입력해 주세요"
              autoFocus
            />
          </div>

          <div className="calendar-toggle-row">
            <span className="calendar-toggle-label">하루 종일</span>
            <button
              type="button"
              className={`calendar-toggle${allDay ? " on" : ""}`}
              onClick={() => setAllDay((current) => !current)}
              aria-pressed={allDay}
            />
          </div>

          <div className="calendar-date-row">
            <div className="calendar-form-group">
              <label className="calendar-form-label">시작일</label>
              <input
                className="calendar-form-input"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div className="calendar-form-group">
              <label className="calendar-form-label">종료일</label>
              <input
                className="calendar-form-input"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
          </div>

          <div className="calendar-form-group">
            <label className="calendar-form-label">
              카테고리 <span className="req">*</span>
            </label>
            <select
              className="calendar-form-select"
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
            >
              {editableGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div className="calendar-form-group">
            <label className="calendar-form-label">색상</label>
            {usesCustomGroupColor ? (
              <div className="calendar-form-help">
                <span
                  className="calendar-form-help__swatch"
                  style={{ background: customGroupPalette?.swatch ?? selectedGroup?.color }}
                  aria-hidden="true"
                />
                <span>
                  이 일정은 그룹 색상을 따릅니다. 색상은 좌측 &apos;추가한 일정&apos;
                  그룹 설정에서 변경할 수 있습니다.
                </span>
              </div>
            ) : (
              <div className="calendar-color-row">
                {CALENDAR_COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    className={`calendar-color-dot${color === swatch ? " sel" : ""}`}
                    style={{ background: swatch }}
                    onClick={() => setColor(swatch)}
                    aria-label={`${swatch} 색상 선택`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="calendar-form-group">
            <label className="calendar-form-label">
              메모 <span className="calendar-form-label__optional">(선택)</span>
            </label>
            <textarea
              className="calendar-form-textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="일정에 대한 메모를 입력해 주세요"
            />
          </div>

          {error ? <div className="calendar-form-error">{error}</div> : null}
        </div>

        <div className="calendar-modal-footer">
          <button
            type="button"
            className="calendar-btn calendar-btn--ghost"
            onClick={onClose}
            disabled={submitting}
          >
            취소
          </button>
          <button
            type="button"
            className="calendar-btn calendar-btn--submit"
            onClick={() => void handleSubmit()}
            disabled={submitting}
          >
            {submitting ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
