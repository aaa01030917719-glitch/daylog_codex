"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarGroupSection } from "@/components/calendar/CalendarGroupSection";
import type {
  CalendarGroup,
  CalendarProjectSummary,
} from "@/components/calendar/types";
import { CALENDAR_COLOR_SWATCHES } from "@/lib/calendar/shared";

interface CalendarSidebarProps {
  groups: CalendarGroup[];
  projects: CalendarProjectSummary[];
  onToggleGroup: (groupId: string) => void;
  onCreateClick: () => void;
  onCreateCustomGroup: (name: string, color: string) => Promise<void> | void;
  onUpdateCustomGroup: (
    groupId: string,
    updates: { name?: string; color?: string }
  ) => Promise<void> | void;
  onDeleteCustomGroup: (groupId: string) => Promise<void> | void;
}

type MenuState = {
  group: CalendarGroup;
  top: number;
  left: number;
} | null;

export function CalendarSidebar({
  groups,
  projects,
  onToggleGroup,
  onCreateClick,
  onCreateCustomGroup,
  onUpdateCustomGroup,
  onDeleteCustomGroup,
}: CalendarSidebarProps) {
  const [search, setSearch] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [menuState, setMenuState] = useState<MenuState>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const filteredGroups = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return groups;
    }

    return groups.filter((group) => group.name.toLowerCase().includes(keyword));
  }, [groups, search]);

  const myCalendarGroups = filteredGroups.filter((group) => group.type === "personal");
  const companyGroups = filteredGroups.filter(
    (group) => group.type === "company" && group.isFilterable !== false
  );
  const projectGroups = filteredGroups.filter((group) => group.type === "project");
  const customGroups = filteredGroups.filter((group) => group.type === "custom");

  useEffect(() => {
    if (!menuState) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) {
        return;
      }

      setMenuState(null);
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [menuState]);

  function toggleSection(sectionId: string) {
    setCollapsedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }

  function openCreateGroupPrompt() {
    const name = window.prompt("추가할 일정 그룹 이름을 입력해 주세요.");
    if (!name?.trim()) {
      return;
    }

    void onCreateCustomGroup(name.trim(), CALENDAR_COLOR_SWATCHES[0]);
  }

  return (
    <aside className="cal-left">
      <div className="cal-left-inner">
        <button type="button" className="btn-create" onClick={onCreateClick}>
          <span className="btn-create__plus">+</span> 일정 만들기
        </button>

        <div className="cal-search">
          <span className="cal-search-icon">🔍</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="캘린더 검색"
            aria-label="캘린더 그룹 검색"
          />
        </div>

        <CalendarGroupSection
          title="내 캘린더"
          items={myCalendarGroups}
          collapsed={Boolean(collapsedSections.personal)}
          onToggleCollapse={() => toggleSection("personal")}
          onToggleGroup={onToggleGroup}
        />

        <CalendarGroupSection
          title="회사 공유 캘린더"
          items={companyGroups}
          collapsed={Boolean(collapsedSections.company)}
          onToggleCollapse={() => toggleSection("company")}
          onToggleGroup={onToggleGroup}
        />

        <CalendarGroupSection
          title={`프로젝트 일정${projects.length > 0 ? ` (${projects.length})` : ""}`}
          items={projectGroups}
          collapsed={Boolean(collapsedSections.project)}
          onToggleCollapse={() => toggleSection("project")}
          onToggleGroup={onToggleGroup}
        />

        <CalendarGroupSection
          title="추가한 일정"
          items={customGroups}
          collapsed={Boolean(collapsedSections.custom)}
          showAddButton
          onToggleCollapse={() => toggleSection("custom")}
          onToggleGroup={onToggleGroup}
          onAddClick={openCreateGroupPrompt}
          onMoreClick={(group, anchorRect) => {
            setMenuState({
              group,
              top: anchorRect.bottom + 6,
              left: anchorRect.left - 168,
            });
          }}
        />
      </div>

      <div className="cal-left-footer">
        <button type="button" className="footer-item">
          ⚙️ <span>설정 및 내보내기</span>
        </button>
        <button type="button" className="footer-item">
          ❓ <span>캘린더 도움말</span>
        </button>
      </div>

      {menuState ? (
        <div
          ref={menuRef}
          className="calendar-group-menu"
          style={{
            top: menuState.top,
            left: menuState.left,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="calendar-group-menu__title">{menuState.group.name}</div>
          <button
            type="button"
            className="calendar-group-menu__action"
            onClick={() => {
              const nextName = window.prompt(
                "그룹 이름을 수정해 주세요.",
                menuState.group.name
              );

              if (!nextName?.trim()) {
                return;
              }

              void onUpdateCustomGroup(menuState.group.id, {
                name: nextName.trim(),
              });
              setMenuState(null);
            }}
          >
            이름 변경
          </button>
          <div className="calendar-group-menu__palette">
            {CALENDAR_COLOR_SWATCHES.map((color) => (
              <button
                key={color}
                type="button"
                className="calendar-group-menu__color"
                style={{ background: color }}
                aria-label={`${color} 색상으로 변경`}
                onClick={() => {
                  void onUpdateCustomGroup(menuState.group.id, { color });
                  setMenuState(null);
                }}
              />
            ))}
          </div>
          <button
            type="button"
            className="calendar-group-menu__action calendar-group-menu__action--danger"
            onClick={() => {
              const confirmed = window.confirm(
                `"${menuState.group.name}" 그룹을 삭제하시겠습니까?`
              );

              if (!confirmed) {
                return;
              }

              void onDeleteCustomGroup(menuState.group.id);
              setMenuState(null);
            }}
          >
            그룹 삭제
          </button>
        </div>
      ) : null}
    </aside>
  );
}
