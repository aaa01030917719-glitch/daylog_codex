"use client";

import type { CalendarGroup } from "@/components/calendar/types";

interface CalendarGroupSectionProps {
  title: string;
  items: CalendarGroup[];
  collapsed: boolean;
  showAddButton?: boolean;
  onToggleCollapse: () => void;
  onToggleGroup: (groupId: string) => void;
  onAddClick?: () => void;
  onMoreClick?: (group: CalendarGroup, anchorRect: DOMRect) => void;
}

export function CalendarGroupSection({
  title,
  items,
  collapsed,
  showAddButton = false,
  onToggleCollapse,
  onToggleGroup,
  onAddClick,
  onMoreClick,
}: CalendarGroupSectionProps) {
  return (
    <div className="calendar-group-section">
      <div className="calendar-group-section__header" onClick={onToggleCollapse}>
        <span className="calendar-group-section__title">{title}</span>
        <div className="calendar-group-section__actions">
          {showAddButton ? (
            <button
              type="button"
              className="calendar-group-add"
              onClick={(event) => {
                event.stopPropagation();
                onAddClick?.();
              }}
              aria-label={`${title} 그룹 추가`}
            >
              +
            </button>
          ) : null}
          <span className="calendar-group-toggle">{collapsed ? "▸" : "▾"}</span>
        </div>
      </div>

      {!collapsed ? (
        <div>
          {items.map((group) => (
            <div key={group.id} className="cal-item">
              <button
                type="button"
                className={`cal-checkbox${group.isVisible ? " checked" : ""}`}
                style={{
                  background: group.isVisible ? group.color : "transparent",
                  borderColor: group.color,
                }}
                onClick={() => onToggleGroup(group.id)}
                aria-pressed={group.isVisible}
                aria-label={`${group.name} 표시 여부`}
              >
                {group.isVisible ? (
                  <svg viewBox="0 0 10 8" fill="none" aria-hidden="true">
                    <path
                      d="M1 4l2.5 2.5L9 1"
                      stroke="#fff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
              </button>
              <span className="cal-item-name">{group.name}</span>
              {group.canManageGroup ? (
                <button
                  type="button"
                  className="cal-item-more"
                  aria-label={`${group.name} 관리`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onMoreClick?.(group, event.currentTarget.getBoundingClientRect());
                  }}
                >
                  ···
                </button>
              ) : (
                <span className="cal-item-more cal-item-more--ghost">···</span>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
