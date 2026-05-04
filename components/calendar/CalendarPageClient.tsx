"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDetailDrawer } from "@/components/calendar/CalendarDetailDrawer";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { CalendarSidebar } from "@/components/calendar/CalendarSidebar";
import { MonthCalendarGrid } from "@/components/calendar/MonthCalendarGrid";
import { CreateEventModal } from "@/components/modals/CreateEventModal";
import type {
  CalendarFeedResponse,
  CalendarGroup,
  CalendarItem,
  CalendarProjectSummary,
  CalendarView,
} from "@/components/calendar/types";
import {
  getCustomGroupUiId,
  getMonthVisibleRange,
  resolveEventPalette,
} from "@/lib/calendar/shared";

interface CalendarPageClientProps {
  initialGroups: CalendarGroup[];
  initialItems: CalendarItem[];
  projects: CalendarProjectSummary[];
  currentUserId: string;
  userRole: string;
  initialYear: number;
  initialMonth: number;
}

type DrawerSelection =
  | { type: "item"; item: CalendarItem }
  | { type: "date"; date: string; items: CalendarItem[] }
  | null;

const VISIBLE_GROUPS_STORAGE_KEY = "daylog.calendar.visibleGroups";

type StoredGroupVisibility = Record<string, boolean>;

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}

function readStoredGroupVisibility(): StoredGroupVisibility | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(VISIBLE_GROUPS_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, boolean] => {
        return typeof entry[1] === "boolean";
      })
    );
  } catch {
    return null;
  }
}

function applyStoredGroupVisibility(
  nextGroups: CalendarGroup[],
  storedVisibility: StoredGroupVisibility | null
) {
  return nextGroups.map((group) => {
    if (group.systemKey === "holiday") {
      return { ...group, isVisible: true };
    }

    const savedVisibility = storedVisibility?.[group.id];
    if (typeof savedVisibility === "boolean") {
      return { ...group, isVisible: savedVisibility };
    }

    return group;
  });
}

export function CalendarPageClient({
  initialGroups,
  initialItems,
  projects,
  currentUserId,
  userRole,
  initialYear,
  initialMonth,
}: CalendarPageClientProps) {
  const [currentYear, setCurrentYear] = useState(initialYear);
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [viewMode, setViewMode] = useState<CalendarView>("month");
  const [groups, setGroups] = useState<CalendarGroup[]>(initialGroups);
  const [items, setItems] = useState<CalendarItem[]>(initialItems);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<CalendarItem | null>(null);
  const [drawerSelection, setDrawerSelection] = useState<DrawerSelection>(null);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didMountRef = useRef(false);
  const didRestoreVisibilityRef = useRef(false);

  void currentUserId;
  void userRole;

  const visibleGroupIds = useMemo(
    () => groups.filter((group) => group.isVisible).map((group) => group.id),
    [groups]
  );

  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        if (item.source === "holiday") {
          return true;
        }

        return visibleGroupIds.includes(item.groupId);
      }),
    [items, visibleGroupIds]
  );

  useEffect(() => {
    const storedVisibility = readStoredGroupVisibility();
    setGroups((current) => applyStoredGroupVisibility(current, storedVisibility));
    didRestoreVisibilityRef.current = true;
  }, []);

  useEffect(() => {
    if (!didRestoreVisibilityRef.current || typeof window === "undefined") {
      return;
    }

    const nextStoredVisibility = Object.fromEntries(
      groups
        .filter((group) => group.systemKey !== "holiday" && group.isFilterable !== false)
        .map((group) => [group.id, group.isVisible])
    );

    window.localStorage.setItem(
      VISIBLE_GROUPS_STORAGE_KEY,
      JSON.stringify(nextStoredVisibility)
    );
  }, [groups]);

  const loadFeed = useCallback(async (year = currentYear, month = currentMonth) => {
    const range = getMonthVisibleRange(year, month);
    const params = new URLSearchParams({
      startDate: range.start.toISOString().slice(0, 10),
      endDate: range.end.toISOString().slice(0, 10),
    });

    setLoadingFeed(true);
    setError(null);

    try {
      const response = await fetch(`/api/calendar/feed?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        setError(await readErrorMessage(response, "일정 데이터를 불러오지 못했습니다."));
        return;
      }

      const data = (await response.json()) as CalendarFeedResponse;
      setItems(data.items ?? []);
    } catch (feedError) {
      console.error("[CALENDAR_FEED_LOAD]", feedError);
      setError("일정 데이터를 불러오지 못했습니다.");
    } finally {
      setLoadingFeed(false);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    void loadFeed(currentYear, currentMonth);
  }, [currentMonth, currentYear, loadFeed]);

  function changeMonth(delta: number) {
    setCurrentMonth((prevMonth) => {
      const nextMonth = prevMonth + delta;

      if (nextMonth > 11) {
        setCurrentYear((prevYear) => prevYear + 1);
        return 0;
      }

      if (nextMonth < 0) {
        setCurrentYear((prevYear) => prevYear - 1);
        return 11;
      }

      return nextMonth;
    });
  }

  function goToday() {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  }

  function openCreateModal(date: string | null) {
    setSelectedDate(date);
    setEditingItem(null);
    setModalOpen(true);
  }

  async function handleCreateCustomGroup(name: string, color: string) {
    const response = await fetch("/api/calendar/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });

    if (!response.ok) {
      window.alert(await readErrorMessage(response, "일정 그룹을 추가하지 못했습니다."));
      return;
    }

    const data = (await response.json()) as {
      group: { id: string; name: string; color: string; ownerId: string };
    };

    setGroups((current) =>
      applyStoredGroupVisibility(
        [
          ...current,
          {
            id: getCustomGroupUiId(data.group.id),
            name: data.group.name,
            color: data.group.color,
            type: "custom",
            isVisible: true,
            ownerId: data.group.ownerId,
            canCreateEvent: true,
            canManageGroup: true,
          },
        ],
        readStoredGroupVisibility()
      )
    );
  }

  async function handleUpdateCustomGroup(
    groupId: string,
    updates: { name?: string; color?: string }
  ) {
    const rawGroupId = groupId.replace(/^custom-/, "");
    const response = await fetch(`/api/calendar/groups/${rawGroupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      window.alert(await readErrorMessage(response, "일정 그룹을 수정하지 못했습니다."));
      return;
    }

    const data = (await response.json()) as {
      group: { id: string; name: string; color: string; ownerId: string };
    };
    const nextPalette = resolveEventPalette(data.group.color);

    setGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              name: data.group.name,
              color: data.group.color,
            }
          : group
      )
    );
    setItems((current) =>
      current.map((item) =>
        item.source === "calendarEvent" &&
        item.groupKind === "CUSTOM" &&
        item.customGroupId === data.group.id
          ? {
              ...item,
              color: nextPalette.color,
              textColor: nextPalette.textColor,
            }
          : item
      )
    );
  }

  async function handleDeleteCustomGroup(groupId: string) {
    const rawGroupId = groupId.replace(/^custom-/, "");
    const response = await fetch(`/api/calendar/groups/${rawGroupId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      window.alert(await readErrorMessage(response, "일정 그룹을 삭제하지 못했습니다."));
      return;
    }

    setGroups((current) => current.filter((group) => group.id !== groupId));
    await loadFeed();
  }

  async function handleDeleteItem(item: CalendarItem) {
    const confirmed = window.confirm(`"${item.title}" 일정을 삭제하시겠습니까?`);
    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/calendar/events/${item.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      window.alert(await readErrorMessage(response, "일정을 삭제하지 못했습니다."));
      return;
    }

    setDrawerSelection(null);
    await loadFeed();
  }

  return (
    <div
      className="calendar-page-shell"
      style={
        {
          "--bg": "#f4f5f7",
          "--surface": "#ffffff",
          "--surface-2": "#f8f9fa",
          "--surface-3": "#f1f5f9",
          "--accent": "#4f7cff",
          "--accent-hover": "#3d6aee",
          "--accent-light": "#eef2ff",
          "--success": "#2A8C50",
          "--success-light": "#dcfce7",
          "--warning": "#f97316",
          "--warning-light": "#fff0e6",
          "--danger": "#ef4444",
          "--danger-light": "#fee2e2",
          "--purple": "#8b5cf6",
          "--purple-light": "#f3f0ff",
          "--yellow": "#eab308",
          "--yellow-light": "#fef9c3",
          "--text-primary": "#111827",
          "--text-secondary": "#4b5563",
          "--text-muted": "#9ca3af",
          "--border": "#e5e7eb",
          "--border-light": "#f3f4f6",
          "--radius-sm": "8px",
          "--radius": "12px",
          "--radius-lg": "16px",
        } as CSSProperties
      }
    >
      <div className="calendar-main">
        <CalendarHeader
          year={currentYear}
          month={currentMonth}
          viewMode={viewMode}
          onPrev={() => changeMonth(-1)}
          onNext={() => changeMonth(1)}
          onToday={goToday}
          onViewChange={setViewMode}
          onCreateClick={() => openCreateModal(null)}
        />

        <div className="cal-body">
          <CalendarSidebar
            groups={groups}
            projects={projects}
            onToggleGroup={(groupId) => {
              setGroups((current) =>
                current.map((group) =>
                  group.id === groupId
                    ? { ...group, isVisible: !group.isVisible }
                    : group
                )
              );
            }}
            onCreateClick={() => openCreateModal(null)}
            onCreateCustomGroup={handleCreateCustomGroup}
            onUpdateCustomGroup={handleUpdateCustomGroup}
            onDeleteCustomGroup={handleDeleteCustomGroup}
          />

          <div className="calendar-grid-panel">
            {error ? <div className="calendar-error-bar">{error}</div> : null}
            <MonthCalendarGrid
              year={currentYear}
              month={currentMonth}
              items={visibleItems}
              isLoading={loadingFeed}
              onDateClick={(dateStr) => openCreateModal(dateStr)}
              onEventClick={(item) => {
                setDrawerSelection({ type: "item", item });
              }}
              onMoreClick={(dateStr, dayItems) => {
                setDrawerSelection({
                  type: "date",
                  date: dateStr,
                  items: dayItems,
                });
              }}
            />
          </div>
        </div>
      </div>

      <CalendarDetailDrawer
        open={drawerSelection !== null}
        selection={drawerSelection}
        onClose={() => setDrawerSelection(null)}
        onSelectItem={(item) => setDrawerSelection({ type: "item", item })}
        onEditItem={(item) => {
          setEditingItem(item);
          setSelectedDate(item.startDate);
          setModalOpen(true);
        }}
        onDeleteItem={(item) => {
          void handleDeleteItem(item);
        }}
        onCreateFromDate={(date) => {
          setDrawerSelection(null);
          openCreateModal(date);
        }}
      />

      <CreateEventModal
        open={modalOpen}
        initialDate={selectedDate}
        editingItem={editingItem}
        groups={groups}
        onClose={() => {
          setModalOpen(false);
          setSelectedDate(null);
          setEditingItem(null);
        }}
        onCreated={async () => {
          setModalOpen(false);
          setSelectedDate(null);
          await loadFeed();
        }}
        onUpdated={async () => {
          setModalOpen(false);
          setEditingItem(null);
          setDrawerSelection(null);
          await loadFeed();
        }}
      />
    </div>
  );
}
