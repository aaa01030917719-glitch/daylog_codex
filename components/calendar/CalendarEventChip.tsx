"use client";

import type { MouseEvent, MouseEventHandler } from "react";
import type { CalendarItem } from "@/components/calendar/types";
import { CALENDAR_GROUP_IDS, resolveEventPalette } from "@/lib/calendar/shared";

interface CalendarEventChipProps {
  item: CalendarItem;
  onClick: (item: CalendarItem) => void;
  onMouseEnter?: MouseEventHandler<HTMLButtonElement>;
  onMouseMove?: MouseEventHandler<HTMLButtonElement>;
  onMouseLeave?: MouseEventHandler<HTMLButtonElement>;
}

export function CalendarEventChip({
  item,
  onClick,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
}: CalendarEventChipProps) {
  const usesWhiteSurfaceChip =
    item.source === "calendarEvent" &&
    (item.groupKind === "PERSONAL" ||
      item.groupKind === "COMPANY_ALL" ||
      item.groupKind === "TEAM_SHARED" ||
      item.groupId === CALENDAR_GROUP_IDS.personal ||
      item.groupId === CALENDAR_GROUP_IDS.companyAll ||
      item.groupId === CALENDAR_GROUP_IDS.teamShared);
  const palette = resolveEventPalette(item.color, item.textColor);

  return (
    <button
      type="button"
      className={`calendar-event-chip${usesWhiteSurfaceChip ? " calendar-event-chip--surface" : ""}`}
      style={{
        background: usesWhiteSurfaceChip ? "#fff" : item.color,
        color: usesWhiteSurfaceChip ? palette.swatch : item.textColor,
        border: usesWhiteSurfaceChip ? "1px solid #fff" : "1px solid transparent",
      }}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onClick(item);
      }}
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {item.title}
    </button>
  );
}
